import { Request, Response, Router } from 'express';
import { pool } from '@db';
import jwt from 'jsonwebtoken';
import { getOrCreateCustomer } from '../utils/paystack';
import { createSubscription, cancelSubscription } from '../utils/paystack-subscription';
import { getUserFromTokenOrSession, checkAdmin } from '../auth';

// Extend the Express Request type to include our user properties
declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      is_admin?: boolean;
      is_super_admin?: boolean;
    }
  }
}

const router = Router();

// Middleware to ensure only admins can access these test routes
router.use(async (req: Request, res: Response, next) => {
  try {
    // First authenticate the user - get user from token or session
    const user = await getUserFromTokenOrSession(req);
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    
    // Attach user to request
    req.user = user;
    
    // Then verify if the user is an admin
    await checkAdmin(req, res, next);
  } catch (error) {
    console.error('Authentication error for test subscription routes:', error);
    return res.status(401).json({ message: 'Unauthorized' });
  }
});

// Create a test subscription
router.post('/create', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    // Check admin status again
    if (!req.user || !(req.user.is_admin || req.user.is_super_admin)) {
      console.log('User not admin:', req.user);
      return res.status(403).json({ message: 'Only admin users can create test subscriptions' });
    }

    // Create a test customer in Paystack using getOrCreateCustomer
    const customer = await getOrCreateCustomer(email, {
      first_name: 'Test',
      last_name: 'User'
    });
    if (!customer) {
      return res.status(500).json({ message: 'Failed to create customer in Paystack' });
    }

    console.log('Test customer created:', customer);
    
    // Check if customer has authorization (required for subscription)
    if (!customer.authorizations || customer.authorizations.length === 0) {
      return res.status(400).json({ 
        message: 'The customer has no payment authorizations',
        error: 'For test subscriptions, use kylem@opianfsgroup.com which already has a test authorization. In a real environment, the customer needs to complete a payment first before subscribing.',
        customer: customer
      });
    }

    // Create a test subscription
    const subscription = await createSubscription(
      customer.customer_code,
      'PLN_edod11i4kaynjit', // Use TEST plan code
      { email, package_type: 'TEST' }
    );

    if (!subscription) {
      return res.status(500).json({ message: 'Failed to create test subscription' });
    }

    console.log('Test subscription created:', subscription);

    // Store the subscription in the database for tracking
    try {
      // Add to our database
      await pool.query(
        `INSERT INTO subscriptions 
         (user_id, email, package_type, status, amount, 
          paystack_subscription_code, paystack_customer_code, 
          payment_method, email_token) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user.id,
          email,
          'TEST',
          subscription.status,
          200, // Test amount (R200)
          subscription.subscription_code,
          customer.customer_code,
          'card',
          subscription.email_token
        ]
      );
    } catch (dbError: any) {
      console.error('Warning: Failed to save subscription to database:', dbError);
      // Continue anyway - this is just a test
    }

    // Return the subscription details
    return res.status(200).json({
      message: 'Test subscription created successfully',
      customer,
      subscription,
    });
  } catch (error: any) {
    console.error('Error creating test subscription:', error);
    return res.status(500).json({ 
      message: 'Error creating test subscription',
      error: error.message || 'Unknown error' 
    });
  }
});

// Cancel a test subscription
router.post('/cancel', async (req: Request, res: Response) => {
  try {
    const { subscription_id } = req.body;

    if (!subscription_id) {
      return res.status(400).json({ message: 'Subscription ID is required' });
    }

    // Check admin status again
    if (!req.user || !(req.user.is_admin || req.user.is_super_admin)) {
      return res.status(403).json({ message: 'Only admin users can cancel test subscriptions' });
    }

    // Get the subscription record from the database to retrieve email_token and subscription_code
    const [subscriptionRecord] = await pool.query(
      'SELECT * FROM subscriptions WHERE id = ?',
      [subscription_id]
    );

    if (!subscriptionRecord || !Array.isArray(subscriptionRecord) || subscriptionRecord.length === 0) {
      // If not found by ID, try looking up by Paystack subscription code
      const [subscriptionByCode] = await pool.query(
        'SELECT * FROM subscriptions WHERE paystack_subscription_code = ?',
        [subscription_id]
      );

      if (!subscriptionByCode || !Array.isArray(subscriptionByCode) || subscriptionByCode.length === 0) {
        return res.status(404).json({ message: 'Subscription not found' });
      }

      // Use the subscription found by code
      const subscription = subscriptionByCode[0] as any;
      console.log('Found subscription to cancel by code:', subscription);

      // Cancel the subscription in Paystack
      const result = await cancelSubscription(
        subscription.paystack_subscription_code
      );

      if (!result) {
        return res.status(500).json({ message: 'Failed to cancel subscription' });
      }

      // Update the subscription in the database
      await pool.query(
        'UPDATE subscriptions SET status = ?, cancelled_at = NOW() WHERE id = ?',
        ['cancelled', subscription.id]
      );

      // Return success
      return res.status(200).json({
        message: 'Test subscription cancelled successfully',
        subscription_id: subscription.id,
        subscription_code: subscription.paystack_subscription_code,
        status: 'cancelled',
      });
    }

    const subscription = subscriptionRecord[0] as any;
    console.log('Found subscription to cancel:', subscription);

    // Cancel the subscription in Paystack
    const result = await cancelSubscription(
      subscription.paystack_subscription_code
    );

    if (!result) {
      return res.status(500).json({ message: 'Failed to cancel subscription' });
    }

    // Update the subscription in the database
    await pool.query(
      'UPDATE subscriptions SET status = ?, cancelled_at = NOW() WHERE id = ?',
      ['cancelled', subscription_id]
    );

    // Return success
    return res.status(200).json({
      message: 'Test subscription cancelled successfully',
      subscription_id,
      subscription_code: subscription.paystack_subscription_code,
      status: 'cancelled',
    });
  } catch (error: any) {
    console.error('Error cancelling test subscription:', error);
    return res.status(500).json({ 
      message: 'Error cancelling test subscription',
      error: error.message || 'Unknown error' 
    });
  }
});

export default router;