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
  PINNACLE: 825,
  TEST: 10  // Test package with minimal price for testing
};

// Paystack plan codes for each package type
const PAYSTACK_PLAN_CODES = {
  OPPORTUNITY: 'PLN_ksp8kcv39wx6gsq',
  MOMENTUM: 'PLN_ronq4bf0oiodxuq',
  PROSPER: 'PLN_o7wt6oekkdhx6nz',
  PRESTIGE: 'PLN_1nt0ne30xcgw4h6',
  PINNACLE: 'PLN_46rhhthybf7wlzv',
  TEST: 'PLN_edod11i4kaynjit'  // Test plan code
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
        
      // If this is an active subscription with missing payment dates, update them
      if (userSubscription && userSubscription.status === 'ACTIVE') {
        // Check if dates are missing
        if (!userSubscription.last_payment_date && !userSubscription.next_payment_date) {
          console.log('Fixing missing payment dates for active subscription:', userSubscription.id);
          
          const now = new Date();
          const nextMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
          
          // Update the subscription with dates
          await connection.query(
            `UPDATE subscriptions SET 
             last_payment_date = ?, 
             next_payment_date = ?,
             updated_at = ?
             WHERE id = ?`,
            [now, nextMonth, now, userSubscription.id]
          );
          
          // Update the local subscription object as well
          userSubscription.last_payment_date = now;
          userSubscription.next_payment_date = nextMonth;
          userSubscription.updated_at = now;
          
          console.log('Payment dates updated for subscription:', userSubscription.id);
        }
      }

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
        },
        TEST: {
          name: 'TEST',
          price: PACKAGE_PRICES.TEST,
          features: [
            'Test package with minimal features',
            'For development testing only',
            'All premium features available'
          ],
          color: 'bg-indigo-400'
        }
      };

      // Determine current package from active subscription
      let currentPackage = null;
      if (userSubscription && userSubscription.status === 'ACTIVE') {
        currentPackage = userSubscription.package_type;
      }

      // Transform database column names to camelCase for frontend
      const transformedSubscription = userSubscription ? {
        id: userSubscription.id,
        userId: userSubscription.user_id,
        packageType: userSubscription.package_type,
        status: userSubscription.status,
        amount: userSubscription.amount,
        createdAt: userSubscription.created_at,
        updatedAt: userSubscription.updated_at,
        // Convert snake_case to camelCase for payment dates
        lastPaymentDate: userSubscription.last_payment_date,
        nextPaymentDate: userSubscription.next_payment_date,
        paystackSubscriptionCode: userSubscription.paystack_subscription_code,
        paystackCustomerCode: userSubscription.paystack_customer_code,
        paymentMethod: userSubscription.payment_method,
        startDate: userSubscription.start_date,
        endDate: userSubscription.end_date,
        paymentReference: userSubscription.payment_reference,
        cancelledAt: userSubscription.cancelled_at
      } : null;
      
      // Log the transformed subscription for debugging
      console.log('Transformed subscription for frontend:', {
        original: userSubscription,
        transformed: transformedSubscription
      });
      
      return res.json({
        subscription: transformedSubscription,
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
      const currentDate = new Date();
      const nextMonthDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      
      const subscriptionData = {
        user_id: user.id,
        package_type: packageType,
        status: 'PENDING', // Start with PENDING status until payment is confirmed
        amount: PACKAGE_PRICES[packageType],
        start_date: currentDate,
        end_date: nextMonthDate, // 30 days from now
        payment_method: 'PAYSTACK',
        // Include the new payment date fields
        last_payment_date: null, // Will be set after payment verification
        next_payment_date: nextMonthDate,
        created_at: currentDate,
        updated_at: currentDate
      };

      const [result] = await connection.query(
        `INSERT INTO subscriptions 
        (user_id, package_type, status, amount, start_date, end_date, payment_method, 
         last_payment_date, next_payment_date, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          subscriptionData.user_id,
          subscriptionData.package_type,
          subscriptionData.status,
          subscriptionData.amount,
          subscriptionData.start_date,
          subscriptionData.end_date,
          subscriptionData.payment_method,
          subscriptionData.last_payment_date,
          subscriptionData.next_payment_date,
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
          plan_code: PAYSTACK_PLAN_CODES[packageType],
          // Add customer details for Paystack
          first_name: user.first_name || '',
          last_name: user.last_name || '',
          phone: user.phone_number || ''
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

// Synchronize subscription with Paystack
router.get("/api/subscription/sync", async (req, res) => {
  try {
    const user = await verifySession(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Only allow admins to access this endpoint
    if (!user.is_admin) {
      return res.status(403).json({ error: "Forbidden - Admin access required" });
    }
    
    const connection = await pool.getConnection();
    try {
      // Get all active subscriptions that don't have Paystack details
      const [subscriptionsResult] = await connection.query(
        `SELECT s.id, s.user_id, s.status, s.amount, s.package_type, s.payment_reference, 
                u.email, u.first_name, u.last_name 
         FROM subscriptions s
         JOIN users u ON s.user_id = u.id
         WHERE s.status = 'ACTIVE' 
         AND (s.paystack_subscription_code IS NULL OR s.paystack_customer_code IS NULL)`
      );
      
      const subscriptions = Array.isArray(subscriptionsResult) ? subscriptionsResult : [];
      const results = {
        total: subscriptions.length,
        syncedCount: 0,
        notFoundCount: 0,
        errors: 0,
        details: []
      };
      
      // No subscriptions to synchronize
      if (subscriptions.length === 0) {
        return res.json({
          success: true,
          message: "No subscriptions need synchronization",
          results
        });
      }
      
      // Import Paystack API
      const { default: axios } = await import('axios');
      const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
      
      // Attempt to find and sync each subscription
      for (const subscription of subscriptions) {
        try {
          // Try to find the customer on Paystack by email
          const customerResponse = await axios.get(
            `https://api.paystack.co/customer?email=${encodeURIComponent(subscription.email)}`,
            {
              headers: {
                'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
              }
            }
          );
          
          // Check if customer exists
          if (customerResponse.data?.status && customerResponse.data?.data?.customer_code) {
            const customerCode = customerResponse.data.data.customer_code;
            
            // Now try to find subscriptions for this customer
            const subscriptionsResponse = await axios.get(
              `https://api.paystack.co/subscription?customer=${customerCode}&perPage=5`,
              {
                headers: {
                  'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`
                }
              }
            );
            
            if (subscriptionsResponse.data?.status && 
                subscriptionsResponse.data?.data?.length > 0) {
              
              // Get the most recent subscription (should be at index 0)
              const paystackSubscription = subscriptionsResponse.data.data[0];
              const subscriptionCode = paystackSubscription.subscription_code;
              
              // Update our database with the Paystack details
              await connection.query(
                `UPDATE subscriptions SET
                 paystack_subscription_code = ?,
                 paystack_customer_code = ?,
                 updated_at = ?
                 WHERE id = ?`,
                [
                  subscriptionCode,
                  customerCode,
                  new Date(),
                  subscription.id
                ]
              );
              
              results.syncedCount++;
              results.details.push({
                subscription_id: subscription.id,
                user_id: subscription.user_id,
                email: subscription.email,
                result: 'SYNCED',
                paystack_subscription_code: subscriptionCode,
                paystack_customer_code: customerCode
              });
              
              console.log(`Synced subscription ${subscription.id} with Paystack details`);
            } else {
              results.notFoundCount++;
              results.details.push({
                subscription_id: subscription.id,
                user_id: subscription.user_id,
                email: subscription.email,
                result: 'NO_PAYSTACK_SUBSCRIPTION',
                paystack_customer_code: customerCode
              });
            }
          } else {
            results.notFoundCount++;
            results.details.push({
              subscription_id: subscription.id,
              user_id: subscription.user_id,
              email: subscription.email,
              result: 'NO_PAYSTACK_CUSTOMER'
            });
          }
        } catch (syncError) {
          console.error(`Error syncing subscription ${subscription.id}:`, syncError);
          results.errors++;
          results.details.push({
            subscription_id: subscription.id,
            user_id: subscription.user_id,
            email: subscription.email,
            result: 'ERROR',
            error: syncError.message || 'Unknown error'
          });
        }
      }
      
      return res.json({
        success: true,
        message: `Synchronized ${results.syncedCount} of ${results.total} subscriptions`,
        results
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error syncing subscriptions with Paystack:", error);
    res.status(500).json({ error: "Failed to synchronize subscriptions" });
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