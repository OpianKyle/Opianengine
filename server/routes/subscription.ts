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

// Validate cancellation reason
const cancellationSchema = z.object({
  reason: z.string().optional(),
  feedback: z.string().optional()
});

/**
 * Utility function to sync subscription data from Paystack into our database
 * This is useful when a subscription exists in Paystack but not in our database
 */
async function syncSubscriptionData(userId: number, email: string, connection: any) {
  try {
    console.log(`Syncing subscription data for user ${userId} (${email})`);
    
    // Get all subscriptions for this user from Paystack
    const subscriptions = await paystackService.listCustomerSubscriptions(email);
    
    if (!subscriptions || subscriptions.length === 0) {
      console.log('No subscriptions found in Paystack');
      return null;
    }
    
    // Find the active subscription (or the most recent one)
    let activeSubscription = subscriptions.find((sub: any) => sub.status === 'active');
    
    if (!activeSubscription && subscriptions.length > 0) {
      // If no active subscription, use the most recent one
      activeSubscription = subscriptions[0];
    }
    
    if (!activeSubscription) {
      console.log('No active or recent subscription found');
      return null;
    }
    
    console.log(`Found subscription: ${activeSubscription.subscription_code} (${activeSubscription.status})`);
    
    // Get the package type from the plan code
    let packageType = null;
    for (const [key, value] of Object.entries(paystackService.PLAN_CODES)) {
      if (value === activeSubscription.plan.plan_code) {
        packageType = key;
        break;
      }
    }
    
    if (!packageType) {
      console.log('Could not determine package type from plan code');
      return null;
    }
    
    // Update user with subscription information
    await connection.query(
      `UPDATE users SET 
        subscription_status = ?,
        selectedPackage = ?,
        paystack_customer_code = ?,
        paystack_subscription_code = ?,
        paystack_email_token = ?
      WHERE id = ?`,
      [
        activeSubscription.status,
        packageType,
        activeSubscription.customer.customer_code,
        activeSubscription.subscription_code,
        activeSubscription.email_token,
        userId
      ]
    );
    
    // Check if subscription exists in our database
    const [existingSubscriptions] = await connection.query(
      `SELECT id FROM subscriptions WHERE subscription_code = ?`,
      [activeSubscription.subscription_code]
    );
    
    if (Array.isArray(existingSubscriptions) && existingSubscriptions.length > 0) {
      console.log('Subscription already exists in database');
      return activeSubscription;
    }
    
    // Create a new entry in the subscriptions table
    const amount = activeSubscription.plan.amount / 100; // Convert from kobo to rand
    
    await connection.query(
      `INSERT INTO subscriptions (
        user_id,
        package_type,
        subscription_code,
        customer_code,
        email_token,
        status,
        amount,
        currency,
        payment_reference,
        start_date,
        end_date,
        next_payment_date,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), ?, NOW())`,
      [
        userId,
        packageType,
        activeSubscription.subscription_code,
        activeSubscription.customer.customer_code,
        activeSubscription.email_token,
        activeSubscription.status,
        amount,
        'ZAR',
        activeSubscription.subscription_code, // Use subscription code as reference since the original is unknown
        activeSubscription.next_payment_date || null
      ]
    );
    
    console.log('Successfully synced subscription data to database');
    return activeSubscription;
  } catch (error: any) {
    console.error('Error syncing subscription data:', error);
    return null;
  }
}

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
      
      // Transaction amount in Rand (from kobo/cents)
      const amountPaid = response.amount / 100;
      
      // Begin transaction
      await connection.beginTransaction();
      
      try {
        // 1. Update user with subscription information
        await connection.query(
          `UPDATE users SET 
            subscription_status = ?,
            selectedPackage = ?,
            paystack_customer_code = ?,
            paystack_subscription_code = ?,
            paystack_email_token = ?
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
        
        // 2. Create a new entry in the subscriptions table
        const [subscriptionResult] = await connection.query(
          `INSERT INTO subscriptions (
            user_id,
            package_type,
            subscription_code,
            customer_code,
            email_token,
            status,
            amount,
            currency,
            payment_reference,
            start_date,
            end_date,
            next_payment_date,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), DATE_ADD(NOW(), INTERVAL 1 MONTH), DATE_ADD(NOW(), INTERVAL 1 MONTH), NOW())`,
          [
            userId,
            packageType,
            subscriptionResponse.subscription_code,
            subscriptionResponse.customer.customer_code,
            subscriptionResponse.email_token,
            'active',
            amountPaid,
            'ZAR',
            reference
          ]
        );
        
        // Commit transaction
        await connection.commit();
        
        // Redirect to the subscription page
        return res.redirect('/dashboard/subscription');
      } catch (error) {
        // Rollback transaction in case of error
        await connection.rollback();
        throw error;
      }
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
    
    const connection = await pool.getConnection();
    
    try {
      // Check if we have Paystack subscription code in user record
      if (!user.paystack_subscription_code) {
        // Try to sync from Paystack
        console.log(`User ${user.id} has no subscription code, attempting to sync from Paystack`);
        const syncedSubscription = await syncSubscriptionData(user.id, user.email, connection);
        
        if (!syncedSubscription) {
          return res.status(404).json({ error: 'No active subscription found' });
        }
        
        // Update user object with subscription code for future use
        user.paystack_subscription_code = syncedSubscription.subscription_code;
        user.selectedPackage = syncedSubscription.plan?.name;
      }
      
      // Get subscription details from database
      const [subscriptions] = await connection.query(
        `SELECT * FROM subscriptions 
         WHERE user_id = ? AND subscription_code = ? 
         ORDER BY created_at DESC LIMIT 1`,
        [user.id, user.paystack_subscription_code]
      );
      
      let formattedSubscription: any;
      
      if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
        // If not found in database, try to get from Paystack
        const response = await paystackService.getSubscription(user.paystack_subscription_code);
        
        // Try to sync the subscription data to our database
        await syncSubscriptionData(user.id, user.email, connection);
        
        // Format the response
        formattedSubscription = {
          code: response.subscription_code,
          status: response.status,
          amount: response.amount / 100, // Convert from kobo to rand
          startDate: new Date(),
          endDate: null,
          nextPaymentDate: response.next_payment_date,
          packageType: user.selectedPackage,
          plan: {
            name: response.plan.name,
            interval: response.plan.interval
          }
        };
      } else {
        const subscription = subscriptions[0] as any;
        
        // Get subscription details from Paystack as well for latest status
        const response = await paystackService.getSubscription(user.paystack_subscription_code);
        
        // Format the response
        formattedSubscription = {
          id: subscription.id,
          code: subscription.subscription_code,
          status: response.status || subscription.status,
          amount: subscription.amount,
          startDate: subscription.start_date,
          endDate: subscription.end_date,
          nextPaymentDate: response.next_payment_date || subscription.next_payment_date,
          packageType: subscription.package_type,
          plan: {
            name: response.plan?.name || subscription.package_type,
            interval: response.plan?.interval || 'monthly'
          }
        };
      }
      
      return res.status(200).json({
        success: true,
        subscription: formattedSubscription
      });
    } finally {
      connection.release();
    }
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
    const { reason, feedback } = cancellationSchema.parse(req.body);
    
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
      // Begin transaction
      await connection.beginTransaction();
      
      try {
        // 1. Update the user record
        await connection.query(
          'UPDATE users SET subscription_status = ? WHERE id = ?',
          ['cancelled', user.id]
        );
        
        // 2. Get the subscription id
        const [subscriptions] = await connection.query(
          `SELECT id FROM subscriptions 
           WHERE user_id = ? AND subscription_code = ? 
           ORDER BY created_at DESC LIMIT 1`,
          [user.id, user.paystack_subscription_code]
        );
        
        if (Array.isArray(subscriptions) && subscriptions.length > 0) {
          const subscription = subscriptions[0] as any;
          
          // 3. Update the subscription record
          await connection.query(
            'UPDATE subscriptions SET status = ?, updated_at = NOW() WHERE id = ?',
            ['cancelled', subscription.id]
          );
          
          // 4. Create cancellation record
          await connection.query(
            `INSERT INTO subscription_cancellations (
              subscription_id, 
              user_id, 
              reason, 
              additional_feedback, 
              is_admin_cancelled,
              created_at
            ) VALUES (?, ?, ?, ?, ?, NOW())`,
            [
              subscription.id,
              user.id,
              reason || 'No reason provided',
              feedback || null,
              false
            ]
          );
        }
        
        // Commit transaction
        await connection.commit();
        
        return res.status(200).json({
          success: true,
          message: 'Subscription cancelled successfully'
        });
      } catch (error) {
        // Rollback transaction in case of error
        await connection.rollback();
        throw error;
      }
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
      // Begin transaction
      await connection.beginTransaction();
      
      try {
        // 1. Update the user record
        await connection.query(
          'UPDATE users SET subscription_status = ? WHERE id = ?',
          ['active', user.id]
        );
        
        // 2. Get the subscription id
        const [subscriptions] = await connection.query(
          `SELECT id FROM subscriptions 
           WHERE user_id = ? AND subscription_code = ? 
           ORDER BY created_at DESC LIMIT 1`,
          [user.id, user.paystack_subscription_code]
        );
        
        if (Array.isArray(subscriptions) && subscriptions.length > 0) {
          const subscription = subscriptions[0] as any;
          
          // 3. Update the subscription record
          await connection.query(
            'UPDATE subscriptions SET status = ?, updated_at = NOW() WHERE id = ?',
            ['active', subscription.id]
          );
        }
        
        // Commit transaction
        await connection.commit();
        
        return res.status(200).json({
          success: true,
          message: 'Subscription reactivated successfully'
        });
      } catch (error) {
        // Rollback transaction in case of error
        await connection.rollback();
        throw error;
      }
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

/**
 * Get subscription history
 * GET /api/subscription/history
 */
router.get('/history', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const connection = await pool.getConnection();
    
    try {
      // Get subscription history from database
      const [subscriptions] = await connection.query(
        `SELECT * FROM subscriptions WHERE user_id = ? ORDER BY created_at DESC`,
        [user.id]
      );
      
      // Format the subscription history
      const formattedHistory = Array.isArray(subscriptions) 
        ? (subscriptions as any[]).map(sub => ({
            id: sub.id,
            packageType: sub.package_type,
            status: sub.status,
            amount: sub.amount,
            startDate: sub.start_date,
            endDate: sub.end_date,
            createdAt: sub.created_at
          }))
        : [];
      
      return res.status(200).json({
        success: true,
        history: formattedHistory
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Subscription history error:', error);
    return res.status(500).json({ error: error.message || 'Failed to retrieve subscription history' });
  }
});

/**
 * Sync subscription data from Paystack to local database
 * POST /api/subscription/sync
 */
router.post('/sync', isAuthenticated, async (req: any, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const connection = await pool.getConnection();
    
    try {
      // Use the syncSubscriptionData utility to synchronize data
      const subscription = await syncSubscriptionData(user.id, user.email, connection);
      
      if (!subscription) {
        return res.status(404).json({
          success: false,
          message: 'No active subscription found in Paystack'
        });
      }
      
      return res.status(200).json({
        success: true,
        message: 'Subscription data synchronized successfully',
        subscription: {
          code: subscription.subscription_code,
          status: subscription.status,
          packageType: user.selectedPackage
        }
      });
    } finally {
      connection.release();
    }
  } catch (error: any) {
    console.error('Subscription sync error:', error);
    return res.status(500).json({ 
      error: error.message || 'Failed to sync subscription data',
      success: false
    });
  }
});

export default router;