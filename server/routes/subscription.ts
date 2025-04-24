/**
 * Subscription Routes
 * 
 * This module provides API endpoints for managing Paystack subscriptions.
 * It handles subscription initialization, verification, cancelation, and retrieval.
 */
import express from 'express';
import { pool } from '@db';
import { isAuthenticated } from '../auth';
import * as paystackService from '../paystack';
import { z } from 'zod';

const router = express.Router();

// Validate package type
const packageSchema = z.object({
  packageType: z.enum(['OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE'])
});

// Subscription prices (in cents - ZAR)
const PACKAGE_PRICES = {
  OPPORTUNITY: 35000, // R350
  MOMENTUM: 45000,    // R450
  PROSPER: 55000,     // R550
  PRESTIGE: 69500,    // R695
  PINNACLE: 82500     // R825
};

/**
 * Initialize a subscription payment
 * POST /api/subscription/initialize
 */
router.post('/initialize', isAuthenticated, async (req: any, res) => {
  try {
    const connection = await pool.getConnection();
    
    try {
      // Get the authenticated user
      const { packageType } = packageSchema.parse(req.body);
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ error: 'Authentication required' });
      }
      
      const userId = user.id;
      const firstName = user.first_name;
      const lastName = user.last_name;
      
      // Get package details based on packageType
      const planCode = paystackService.PLAN_CODES[packageType as keyof typeof paystackService.PLAN_CODES];
      const amount = PACKAGE_PRICES[packageType as keyof typeof PACKAGE_PRICES];
      
      if (!planCode) {
        return res.status(400).json({ error: 'Invalid package type' });
      }
      
      // Prepare metadata
      const metadata = {
        user_id: userId,
        package_type: packageType,
        custom_fields: [
          {
            display_name: "User ID",
            variable_name: "user_id",
            value: userId
          },
          {
            display_name: "Package",
            variable_name: "package",
            value: packageType
          }
        ]
      };
      
      // Initialize transaction
      const response = await paystackService.initializeTransaction(
        user.email,
        amount,
        metadata,
        `${req.protocol}://${req.get('host')}/api/subscription/verify`
      );
      
      // Return the authorization URL for redirect
      return res.status(200).json({
        success: true,
        authorization_url: response.authorization_url,
        reference: response.reference,
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Subscription initialization error:', error);
    return res.status(500).json({ error: error.message || 'Failed to initialize subscription' });
  }
});

/**
 * Verify a subscription payment
 * GET /api/subscription/verify
 */
router.get('/verify', async (req, res) => {
  try {
    const { reference } = req.query;
    
    if (!reference || typeof reference !== 'string') {
      return res.status(400).json({ error: 'Transaction reference is required' });
    }
    
    // Verify the transaction
    const response = await paystackService.verifyTransaction(reference);
    
    if (response.status !== 'success') {
      return res.status(400).json({ error: 'Payment verification failed' });
    }
    
    const connection = await pool.getConnection();
    
    try {
      // Extract metadata
      const metadata = response.metadata || {};
      const userId = metadata.user_id;
      const packageType = metadata.package_type;
      
      if (!userId) {
        return res.status(400).json({ error: 'User information missing from transaction' });
      }
      
      // Find the user
      const [userRows] = await connection.query(
        'SELECT * FROM users WHERE id = ?',
        [userId]
      );
      
      if (!Array.isArray(userRows) || userRows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const user = userRows[0] as any;
      
      // Create subscription in Paystack
      const subscriptionResponse = await paystackService.createSubscription(
        user.email,
        paystackService.PLAN_CODES[packageType as keyof typeof paystackService.PLAN_CODES],
        { user_id: userId }
      );
      
      // Update user with subscription information
      await connection.query(
        `UPDATE users SET 
          subscription_status = ?,
          selectedPackage = ?,
          paystack_customer_code = ?,
          paystack_subscription_code = ?,
          paystack_email_token = ?,
          subscription_start_date = NOW(),
          subscription_end_date = DATE_ADD(NOW(), INTERVAL 1 MONTH)
        WHERE id = ?`,
        [
          'active',
          packageType,
          subscriptionResponse.customer.customer_code,
          subscriptionResponse.subscription_code,
          subscriptionResponse.email_token,
          userId
        ]
      );
      
      // Redirect to the subscription page
      return res.redirect('/dashboard/subscription');
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Subscription verification error:', error);
    return res.status(500).json({ error: error.message || 'Failed to verify subscription' });
  }
});

/**
 * Get subscription details
 * GET /api/subscription/details
 */
router.get('/details', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!user.paystack_subscription_code) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    // Get subscription details from Paystack
    const response = await paystackService.getSubscription(user.paystack_subscription_code);
    
    // Format the response
    const formattedSubscription = {
      code: response.subscription_code,
      status: response.status,
      amount: response.amount / 100, // Convert from kobo to rand
      startDate: user.subscription_start_date,
      endDate: user.subscription_end_date,
      nextPaymentDate: response.next_payment_date,
      plan: {
        name: response.plan.name,
        interval: response.plan.interval
      }
    };
    
    return res.status(200).json({
      success: true,
      subscription: formattedSubscription
    });
  } catch (error: any) {
    console.error('Subscription details error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve subscription details' });
  }
});

/**
 * Cancel a subscription
 * POST /api/subscription/cancel
 */
router.post('/cancel', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!user.paystack_subscription_code) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    // Disable the subscription in Paystack
    await paystackService.updateSubscriptionStatus(user.paystack_subscription_code, false);
    
    const connection = await pool.getConnection();
    
    try {
      // Update the user record
      await connection.query(
        'UPDATE users SET subscription_status = ? WHERE id = ?',
        ['cancelled', user.id]
      );
      
      return res.status(200).json({
        success: true,
        message: 'Subscription cancelled successfully'
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Subscription cancellation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to cancel subscription' });
  }
});

/**
 * Reactivate a subscription
 * POST /api/subscription/reactivate
 */
router.post('/reactivate', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!user.paystack_subscription_code) {
      return res.status(404).json({ error: 'No subscription found to reactivate' });
    }
    
    // Enable the subscription in Paystack
    await paystackService.updateSubscriptionStatus(user.paystack_subscription_code, true);
    
    const connection = await pool.getConnection();
    
    try {
      // Update the user record
      await connection.query(
        'UPDATE users SET subscription_status = ? WHERE id = ?',
        ['active', user.id]
      );
      
      return res.status(200).json({
        success: true,
        message: 'Subscription reactivated successfully'
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Subscription reactivation error:', error);
    return res.status(500).json({ error: error.message || 'Failed to reactivate subscription' });
  }
});

/**
 * Get a payment update link
 * GET /api/subscription/update-link
 */
router.get('/update-link', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    if (!user.paystack_subscription_code) {
      return res.status(404).json({ error: 'No active subscription found' });
    }
    
    // Generate the update link
    const response = await paystackService.generateUpdateLink(user.paystack_subscription_code);
    
    return res.status(200).json({
      success: true,
      link: response.link
    });
  } catch (error: any) {
    console.error('Update link error:', error);
    return res.status(500).json({ error: error.message || 'Failed to generate update link' });
  }
});

export default router;