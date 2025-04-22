import express from "express";
import { verifySession } from "../auth";
import { pool } from "@db";
import { subscriptions } from "@db/schema";
import { eq } from "drizzle-orm";
import { mysqlTable, timestamp, varchar, int, mysqlEnum } from 'drizzle-orm/mysql-core';

const router = express.Router();

// Package prices in South African Rand (ZAR)
const PACKAGE_PRICES = {
  OPPORTUNITY: 350,
  MOMENTUM: 450,
  PROSPER: 550,
  PRESTIGE: 695,
  PINNACLE: 825
};

// Paystack plan codes for each package type
const PAYSTACK_PLAN_CODES = {
  OPPORTUNITY: 'PLN_ksp8kcv39wx6gsq',
  MOMENTUM: 'PLN_ronq4bf0oiodxuq',
  PROSPER: 'PLN_o7wt6oekkdhx6nz',
  PRESTIGE: 'PLN_1nt0ne30xcgw4h6',
  PINNACLE: 'PLN_46rhhthybf7wlzv'
};

// Get subscription information for the current user
router.get("/api/subscription", async (req, res) => {
  try {
    const user = await verifySession(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const connection = await pool.getConnection();
    try {
      // Get user's subscription
      const [userSubscriptionResult] = await connection.query(
        `SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC LIMIT 1`,
        [user.id]
      );
      
      // Convert to array and get first item if it exists
      const userSubscription = Array.isArray(userSubscriptionResult) && userSubscriptionResult.length > 0 
        ? userSubscriptionResult[0] 
        : null;

      // Get package information
      const packageInfo = {
        OPPORTUNITY: {
          name: 'OPPORTUNITY',
          price: PACKAGE_PRICES.OPPORTUNITY,
          features: [
            'Basic account management',
            'Limited access to products',
            'Standard customer support',
            'Monthly reports'
          ],
          color: 'bg-zinc-400'
        },
        MOMENTUM: {
          name: 'MOMENTUM',
          price: PACKAGE_PRICES.MOMENTUM,
          features: [
            'Enhanced account management',
            'Full access to products',
            'Priority customer support',
            'Weekly reports',
            'Discounted fees'
          ],
          color: 'bg-blue-400'
        },
        PROSPER: {
          name: 'PROSPER',
          price: PACKAGE_PRICES.PROSPER,
          features: [
            'Premium account management',
            'Full access to premium products',
            'Priority customer support',
            'Weekly detailed reports',
            'Reduced fees',
            'Referral program access'
          ],
          color: 'bg-green-400'
        },
        PRESTIGE: {
          name: 'PRESTIGE',
          price: PACKAGE_PRICES.PRESTIGE,
          features: [
            'Executive account management',
            'Full access to all products',
            'VIP customer support',
            'Daily reports',
            'Minimal fees',
            'Enhanced referral program',
            'Exclusive webinars'
          ],
          color: 'bg-purple-400'
        },
        PINNACLE: {
          name: 'PINNACLE',
          price: PACKAGE_PRICES.PINNACLE,
          features: [
            'Elite account management',
            'Full access to all products and early access to new releases',
            'Dedicated account manager',
            'Real-time reporting',
            'Lowest fees available',
            'Premium referral program with enhanced commissions',
            'Exclusive events and network access',
            'Custom solutions'
          ],
          color: 'bg-amber-400'
        }
      };

      // Determine current package from active subscription
      let currentPackage = null;
      if (userSubscription && userSubscription.status === 'ACTIVE') {
        currentPackage = userSubscription.package_type;
      }

      return res.json({
        subscription: userSubscription || null,
        packages: packageInfo,
        currentPackage: currentPackage
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error retrieving subscription information:", error);
    res.status(500).json({ error: "Failed to retrieve subscription information" });
  }
});

// Create or update subscription
router.post("/api/subscription", async (req, res) => {
  try {
    const user = await verifySession(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { packageType } = req.body;
    if (!packageType || !PACKAGE_PRICES[packageType]) {
      return res.status(400).json({ error: "Invalid package type" });
    }

    const connection = await pool.getConnection();
    try {
      // Create new subscription with PENDING status
      const subscriptionData = {
        user_id: user.id,
        package_type: packageType,
        status: 'PENDING', // Start with PENDING status until payment is confirmed
        amount: PACKAGE_PRICES[packageType],
        start_date: new Date(),
        end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        payment_method: 'PAYSTACK',
        created_at: new Date(),
        updated_at: new Date()
      };

      const [result] = await connection.query(
        `INSERT INTO subscriptions 
        (user_id, package_type, status, amount, start_date, end_date, payment_method, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          subscriptionData.user_id,
          subscriptionData.package_type,
          subscriptionData.status,
          subscriptionData.amount,
          subscriptionData.start_date,
          subscriptionData.end_date,
          subscriptionData.payment_method,
          subscriptionData.created_at,
          subscriptionData.updated_at
        ]
      );

      // Get the inserted subscription ID
      const subscriptionId = result.insertId;

      // Import payment initialization function directly
      const { initializeTransaction, generateReference } = await import('../utils/paystack');
      
      // Generate a unique reference for this transaction
      const reference = generateReference();
      
      console.log('Creating subscription payment for:', {
        user: user.email,
        packageType,
        subscriptionId,
        planCode: PAYSTACK_PLAN_CODES[packageType]
      });
      
      // Initialize transaction directly with Paystack
      const transaction = await initializeTransaction(
        Math.floor(subscriptionData.amount * 100), // Convert to cents/kobo
        user.email,
        reference,
        {
          subscription_id: subscriptionId,
          package_type: packageType,
          type: 'SUBSCRIPTION',
          user_id: user.id,
          plan_code: PAYSTACK_PLAN_CODES[packageType]
        }
      );
      
      console.log('Subscription payment initialized:', transaction);
      
      // Store payment reference
      await connection.query(
        `UPDATE subscriptions SET payment_reference = ? WHERE id = ?`,
        [reference, subscriptionId]
      );
      
      // Success! Use transaction data for response
      return res.json({
        success: true,
        message: "Subscription initialized, redirecting to payment",
        subscription: {
          ...subscriptionData,
          id: subscriptionId
        },
        redirectUrl: transaction.authorization_url
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error creating subscription:", error);
    res.status(500).json({ error: "Failed to create subscription" });
  }
});

// Cancel subscription
router.delete("/api/subscription/:id", async (req, res) => {
  try {
    const user = await verifySession(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const subscriptionId = req.params.id;
    const connection = await pool.getConnection();
    
    try {
      // Check if subscription exists and belongs to the user
      const [subscriptionResult] = await connection.query(
        `SELECT * FROM subscriptions WHERE id = ? AND user_id = ?`,
        [subscriptionId, user.id]
      );
      
      const subscriptionArray = Array.isArray(subscriptionResult) ? subscriptionResult : [];

      if (subscriptionArray.length === 0) {
        return res.status(404).json({ error: "Subscription not found" });
      }

      // Cancel subscription
      await connection.query(
        `UPDATE subscriptions SET status = 'CANCELLED', updated_at = ? WHERE id = ?`,
        [new Date(), subscriptionId]
      );

      return res.json({
        success: true,
        message: "Subscription cancelled successfully"
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error cancelling subscription:", error);
    res.status(500).json({ error: "Failed to cancel subscription" });
  }
});

export default router;