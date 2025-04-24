/**
 * Payment Routes
 * 
 * API endpoints for handling payments via Paystack
 */

import express from 'express';
import { db, pool } from '../../db';
import { users, transactions } from '../../db/schema';
import { eq } from 'drizzle-orm';
import type { User } from '../../db/schema';
import { paystackConfig } from '../config/paystack';
import mysql from 'mysql2/promise';
import { 
  createOrGetCustomer, 
  initializeTransaction, 
  verifyTransaction,  
  generateReference 
} from '../utils/paystack';
import { checkAdmin, getUserFromTokenOrSession } from '../auth';

const router = express.Router();

// Initialize a payment transaction
router.post('/initialize', async (req, res) => {
  try {
    const { amount, purpose, metadata, planCode } = req.body;
    const user = req.user as User | undefined;

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    // Ensure the user exists in Paystack
    const customer = await createOrGetCustomer({
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phoneNumber: user.phoneNumber || ''
    });
    
    // Convert amount to lowest unit (cents)
    const amountInCents = Math.floor(amount * 100);
    
    // Create a reference code for this transaction
    const reference = generateReference();
    
    console.log('Initializing Paystack transaction for:', {
      user: user.email,
      amount: amountInCents,
      reference,
      planCode,
      metadata
    });
    
    // Initialize the transaction
    const transaction = await initializeTransaction(
      amountInCents,
      user.email,
      reference,
      {
        user_id: user.id,
        purpose: purpose || 'Account funding',
        plan_code: planCode || undefined,
        subscription: planCode ? true : false,
        ...metadata
      }
    );
    
    console.log('Transaction initialized successfully:', transaction);
    
    return res.json({
      success: true,
      data: {
        authorization_url: transaction.authorization_url,
        access_code: transaction.access_code,
        reference: transaction.reference
      }
    });
    
  } catch (error) {
    console.error('Payment initialization error:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to initialize payment'
    });
  }
});

// Simplified transaction verification logic is now in the new /verify/:reference endpoint below

// Get user's transaction history
router.get('/transactions', async (req, res) => {
  try {
    const user = req.user as User | undefined;
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const userTransactions = await db.select()
      .from(transactions)
      .where(eq(transactions.userId, user.id))
      .orderBy(transactions.createdAt)
      .limit(10)
      .execute();
    
    return res.json({
      success: true,
      data: userTransactions
    });
    
  } catch (error) {
    console.error('Error fetching transaction history:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction history'
    });
  }
});

// Callback URL for Paystack - handle both POST and GET requests
router.post('/callback', async (req, res) => {
  try {
    // This is a redirect URL after payment
    const reference = req.body.reference || req.query.reference || req.body.trxref || req.query.trxref;
    console.log('Payment callback received (POST):', { reference, body: req.body, query: req.query });
    
    let verificationResult = { success: false, message: 'No reference provided' };
    
    if (reference) {
      // Auto-verify the transaction server-side
      try {
        const transaction = await verifyTransaction(reference.toString());
        console.log('Auto-verification in callback successful:', {
          status: transaction.status,
          reference: transaction.reference,
          amount: transaction.amount,
          metadata: transaction.metadata
        });
        
        // Immediately update subscription in database
        if (transaction.status === 'success' && transaction.metadata && 
            transaction.metadata.type === 'SUBSCRIPTION' && transaction.metadata.subscription_id) {
          
          // Update subscription status directly in callback
          const connection = await pool.getConnection();
          try {
            // Update the subscription to ACTIVE status
            await connection.query(
              `UPDATE subscriptions SET 
               status = 'ACTIVE', 
               last_payment_date = ?,
               next_payment_date = ?,
               updated_at = ?,
               payment_reference = ?
               WHERE id = ?`,
              [
                new Date(),
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next payment in 30 days
                new Date(),
                reference,
                transaction.metadata.subscription_id
              ]
            );
            
            console.log(`Subscription ${transaction.metadata.subscription_id} activated directly in callback!`);
            verificationResult = { 
              success: true, 
              message: 'Payment verified and subscription activated'
            };
            
            // Also try to create Paystack subscription if we have customerCode and planCode
            const customerCode = transaction.metadata.customer_code;
            const planCode = transaction.metadata.plan_code;
            
            if (customerCode && planCode) {
              try {
                const { createSubscription } = await import('../utils/paystack');
                const subscriptionData = await createSubscription(
                  customerCode, 
                  planCode, 
                  {
                    reference,
                    local_subscription_id: transaction.metadata.subscription_id
                  }
                );
                
                // Update our database with the Paystack subscription code
                await connection.query(
                  `UPDATE subscriptions SET 
                   paystack_subscription_code = ?, 
                   paystack_customer_code = ?,
                   updated_at = ?
                   WHERE id = ?`,
                  [
                    subscriptionData.subscription_code,
                    customerCode,
                    new Date(),
                    transaction.metadata.subscription_id
                  ]
                );
                
                console.log(`Updated subscription with Paystack code ${subscriptionData.subscription_code}`);
              } catch (subscriptionError) {
                console.error('Failed to create Paystack subscription in callback:', subscriptionError);
              }
            }
          } catch (dbError) {
            console.error('Error updating subscription in database:', dbError);
          } finally {
            connection.release();
          }
        }
      } catch (error) {
        console.error('Auto-verification failed but continuing with redirect:', error);
        verificationResult = { success: false, message: 'Verification failed: ' + error };
      }
    }
    
    // Check if the user is authenticated and redirect them to subscription page directly
    if (req.isAuthenticated()) {
      const redirectUrl = `/subscription?paymentComplete=true&reference=${reference}&verified=${verificationResult.success}`;
      console.log('User authenticated, redirecting to subscription page:', redirectUrl);
      return res.redirect(redirectUrl);
    } else {
      // Redirect to login page with payment information for unauthenticated users
      const redirectUrl = `/login?paymentComplete=true&reference=${reference}&verified=${verificationResult.success}`;
      console.log('User not authenticated, redirecting to login page:', redirectUrl);
      return res.redirect(redirectUrl);
    }
  } catch (error) {
    console.error('Error in payment callback (POST):', error);
    return res.redirect('/login?error=payment_failed');
  }
});

// GET version for the callback URL (Paystack might redirect with GET)
router.get('/callback', async (req, res) => {
  try {
    // Extract reference from query params
    const reference = req.query.reference || req.query.trxref;
    console.log('Payment callback received (GET):', { reference, query: req.query });
    
    let verificationResult = { success: false, message: 'No reference provided' };
    
    if (reference) {
      // Auto-verify the transaction server-side
      try {
        const transaction = await verifyTransaction(reference.toString());
        console.log('Auto-verification in callback successful:', {
          status: transaction.status,
          reference: transaction.reference,
          amount: transaction.amount,
          metadata: transaction.metadata
        });
        
        // Immediately update subscription in database
        if (transaction.status === 'success' && transaction.metadata && 
            transaction.metadata.type === 'SUBSCRIPTION' && transaction.metadata.subscription_id) {
          
          // Update subscription status directly in callback
          const connection = await pool.getConnection();
          try {
            // Update the subscription to ACTIVE status
            await connection.query(
              `UPDATE subscriptions SET 
               status = 'ACTIVE', 
               last_payment_date = ?,
               next_payment_date = ?,
               updated_at = ?,
               payment_reference = ?
               WHERE id = ?`,
              [
                new Date(),
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next payment in 30 days
                new Date(),
                reference,
                transaction.metadata.subscription_id
              ]
            );
            
            console.log(`Subscription ${transaction.metadata.subscription_id} activated directly in callback!`);
            verificationResult = { 
              success: true, 
              message: 'Payment verified and subscription activated'
            };
            
            // Also try to create Paystack subscription if we have customerCode and planCode
            const customerCode = transaction.metadata.customer_code;
            const planCode = transaction.metadata.plan_code;
            
            if (customerCode && planCode) {
              try {
                const { createSubscription } = await import('../utils/paystack');
                const subscriptionData = await createSubscription(
                  customerCode, 
                  planCode, 
                  {
                    reference,
                    local_subscription_id: transaction.metadata.subscription_id
                  }
                );
                
                // Update our database with the Paystack subscription code
                await connection.query(
                  `UPDATE subscriptions SET 
                   paystack_subscription_code = ?, 
                   paystack_customer_code = ?,
                   updated_at = ?
                   WHERE id = ?`,
                  [
                    subscriptionData.subscription_code,
                    customerCode,
                    new Date(),
                    transaction.metadata.subscription_id
                  ]
                );
                
                console.log(`Updated subscription with Paystack code ${subscriptionData.subscription_code}`);
              } catch (subscriptionError) {
                console.error('Failed to create Paystack subscription in callback:', subscriptionError);
              }
            }
          } catch (dbError) {
            console.error('Error updating subscription in database:', dbError);
          } finally {
            connection.release();
          }
        }
      } catch (error) {
        console.error('Auto-verification failed but continuing with redirect:', error);
        verificationResult = { success: false, message: 'Verification failed: ' + error };
      }
    }
    
    // Check if the user is authenticated and redirect them to subscription page directly
    if (req.isAuthenticated()) {
      const redirectUrl = `/subscription?paymentComplete=true&reference=${reference}&verified=${verificationResult.success}`;
      console.log('User authenticated, redirecting to subscription page:', redirectUrl);
      return res.redirect(redirectUrl);
    } else {
      // Redirect to login page with payment information for unauthenticated users
      const redirectUrl = `/login?paymentComplete=true&reference=${reference}&verified=${verificationResult.success}`;
      console.log('User not authenticated, redirecting to login page:', redirectUrl);
      return res.redirect(redirectUrl);
    }
  } catch (error) {
    console.error('Error in payment callback (GET):', error);
    return res.redirect('/login?error=payment_failed');
  }
});

// Verify a payment transaction
router.get('/verify/:reference', async (req, res) => {
  try {
    const { reference } = req.params;
    const user = req.user as User | undefined;

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (!reference) {
      return res.status(400).json({ success: false, message: 'Payment reference is required' });
    }

    // Verify the transaction with Paystack
    const transaction = await verifyTransaction(reference);
    
    if (transaction.status !== 'success') {
      return res.status(400).json({ 
        success: false, 
        message: 'Payment verification failed',
        status: transaction.status
      });
    }
    
    // Check for existing transaction record using raw SQL for consistency
    const connection = await pool.getConnection();
    let transactionRecord = null;
    
    try {
      // Check for existing transaction
      const [existingTransactions] = await connection.query(
        `SELECT * FROM transactions WHERE payment_reference = ? LIMIT 1`,
        [reference]
      );
      
      if (Array.isArray(existingTransactions) && existingTransactions.length > 0) {
        transactionRecord = existingTransactions[0];
        return res.json({ 
          success: true, 
          message: 'Payment already verified', 
          transaction: transactionRecord 
        });
      }
      
      // Insert transaction record
      const [insertResult] = await connection.query(
        `INSERT INTO transactions 
         (user_id, amount, type, description, status, payment_reference, metadata, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          user.id,
          transaction.amount / 100, // Convert from kobo to naira
          'SUBSCRIPTION_PAYMENT',
          `Subscription payment for ${transaction.metadata?.packageType || 'unknown package'}`,
          'COMPLETED',
          reference,
          JSON.stringify(transaction),
          new Date(),
          new Date()
        ]
      );
      
      const transactionId = insertResult.insertId;
      
      // Update subscription status if this was a subscription payment
      if (transaction.metadata && transaction.metadata.type === 'SUBSCRIPTION' && transaction.metadata.subscription_id) {
        const subscriptionId = transaction.metadata.subscription_id;
        const packageType = transaction.metadata.package_type;
        const planCode = transaction.metadata.plan_code;
        const customerCode = transaction.metadata.customer_code;
        
        console.log(`Processing successful subscription payment:`, {
          subscriptionId,
          packageType,
          planCode,
          customerCode,
          reference
        });
        
        // 1. Update the subscription to ACTIVE status in our database
        await connection.query(
          `UPDATE subscriptions SET 
           status = 'ACTIVE', 
           last_payment_date = ?,
           next_payment_date = ?,
           updated_at = ?,
           paystack_customer_code = ?,
           payment_reference = ?
           WHERE id = ?`,
          [
            new Date(),
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next payment in 30 days
            new Date(),
            customerCode,
            reference,
            subscriptionId
          ]
        );
        
        console.log(`Updated subscription ${subscriptionId} to ACTIVE status`);
        
        // 2. Create Paystack subscription
        if (customerCode && planCode) {
          try {
            const { createSubscription } = await import('../utils/paystack');
            const subscriptionData = await createSubscription(
              customerCode, 
              planCode, 
              {
                reference,
                transactionId,
                local_subscription_id: subscriptionId
              }
            );
            
            console.log('Created Paystack subscription:', {
              subscription_code: subscriptionData.subscription_code,
              email_token: subscriptionData.email_token,
              customer: subscriptionData.customer
            });
            
            // 3. Update our subscription with Paystack subscription details
            await connection.query(
              `UPDATE subscriptions SET 
               paystack_subscription_code = ?,
               updated_at = ?
               WHERE id = ?`,
              [
                subscriptionData.subscription_code,
                new Date(),
                subscriptionId
              ]
            );
            
            console.log(`Updated subscription ${subscriptionId} with Paystack code ${subscriptionData.subscription_code}`);
          } catch (error) {
            console.error('Error creating Paystack subscription:', error);
          }
        }
      }
      
      // Return verification result
      return res.json({
        success: true,
        message: 'Payment successfully verified',
        transaction: {
          id: transactionId,
          user_id: user.id,
          amount: transaction.amount / 100,
          payment_reference: reference,
          created_at: new Date()
        }
      });
    } catch (error) {
      console.error('Error processing verified transaction:', error);
      return res.status(500).json({
        success: false,
        message: 'Error processing transaction after verification'
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to verify payment'
    });
  }
});

// Webhook endpoint for Paystack (used for server-to-server notifications)
router.post('/webhook', async (req, res) => {
  try {
    // Paystack recommends this response even if processing fails
    res.status(200).send('Webhook received');
    
    // Verify the webhook payload
    const hash = req.headers['x-paystack-signature'];
    if (!hash) {
      console.error('Webhook signature missing');
      return;
    }
    
    const event = req.body;
    console.log('Webhook event received:', {
      event: event.event,
      reference: event.data?.reference
    });
    
    // Handle different event types
    switch (event.event) {
      case 'charge.success':
        await handleSuccessfulCharge(event.data);
        break;
      
      case 'subscription.create':
        await handleSubscriptionCreated(event.data);
        break;
      
      case 'subscription.disable':
        await handleSubscriptionDisabled(event.data);
        break;
      
      case 'subscription.enable':
        await handleSubscriptionEnabled(event.data);
        break;
      
      case 'invoice.payment_failed':
        await handleFailedPayment(event.data);
        break;
      
      // Handle other event types as needed
      default:
        console.log(`Unhandled webhook event type: ${event.event}`);
    }
  } catch (error) {
    console.error('Error processing webhook:', error);
  }
});

async function handleSuccessfulCharge(data) {
  try {
    const { reference, metadata, customer, authorization } = data;
    console.log('Processing successful charge webhook:', { 
      reference, 
      metadata,
      customerCode: customer?.customer_code,
      customerEmail: customer?.email,
      authorization: authorization?.authorization_code
    });
    
    // If this is a subscription-related payment
    if (metadata && metadata.type === 'SUBSCRIPTION' && metadata.subscription_id) {
      const connection = await pool.getConnection();
      try {
        // Get the paystack subscription details for this customer
        const paystackSubscriptionCode = metadata.paystack_subscription_code || null;
        const paystackCustomerCode = customer?.customer_code || null;
        
        console.log(`Updating subscription with Paystack details:`, {
          subscriptionId: metadata.subscription_id,
          paystackSubscriptionCode,
          paystackCustomerCode
        });
        
        // Update the subscription status and Paystack details
        await connection.query(
          `UPDATE subscriptions SET 
           status = 'ACTIVE', 
           last_payment_date = ?,
           next_payment_date = ?,
           updated_at = ?,
           payment_reference = ?,
           paystack_subscription_code = ?,
           paystack_customer_code = ?
           WHERE id = ?`,
          [
            new Date(),
            new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next payment in 30 days
            new Date(),
            reference,
            paystackSubscriptionCode,
            paystackCustomerCode,
            metadata.subscription_id
          ]
        );
        
        console.log(`Subscription ${metadata.subscription_id} activated from webhook with Paystack details`);
      } catch (error) {
        console.error('Error updating subscription from webhook:', error);
      } finally {
        connection.release();
      }
    }
  } catch (verifyError) {
    console.error('Error handling successful charge webhook:', verifyError);
  }
}

async function handleSubscriptionCreated(data) {
  try {
    const { subscription_code, customer, plan, status, email_token } = data;
    console.log('Subscription created webhook:', { 
      subscription_code, 
      customerCode: customer?.customer_code,
      customerEmail: customer?.email,
      planCode: plan?.plan_code,
      planName: plan?.name,
      status, 
      email_token 
    });
    
    // Find any pending subscriptions that might match this user's email
    if (customer?.email) {
      const connection = await pool.getConnection();
      try {
        // First, find the user ID by email
        const [userResults] = await connection.query(
          'SELECT id FROM users WHERE email = ?',
          [customer.email]
        );
        
        const users = Array.isArray(userResults) ? userResults : [];
        
        if (users.length > 0) {
          const userId = users[0].id;
          
          // Find the most recent pending subscription for this user
          const [subscriptionResults] = await connection.query(
            `SELECT id FROM subscriptions 
             WHERE user_id = ? AND status = 'PENDING'
             ORDER BY created_at DESC LIMIT 1`,
            [userId]
          );
          
          const subscriptions = Array.isArray(subscriptionResults) ? subscriptionResults : [];
          
          if (subscriptions.length > 0) {
            const subscriptionId = subscriptions[0].id;
            
            // Update the subscription with Paystack details
            await connection.query(
              `UPDATE subscriptions SET 
               paystack_subscription_code = ?,
               paystack_customer_code = ?,
               updated_at = ?
               WHERE id = ?`,
              [
                subscription_code,
                customer.customer_code,
                new Date(),
                subscriptionId
              ]
            );
            
            console.log(`Updated subscription ${subscriptionId} with Paystack details: ${subscription_code}`);
          } else {
            console.log(`No pending subscription found for user ${userId}`);
          }
        } else {
          console.log(`No user found with email: ${customer.email}`);
        }
      } catch (error) {
        console.error('Error updating subscription with Paystack details:', error);
      } finally {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Error handling subscription created webhook:', error);
  }
}

async function handleSubscriptionDisabled(data) {
  try {
    const { subscription_code } = data;
    console.log('Subscription disabled webhook:', { subscription_code });
    
    // Update our record to cancel the subscription
    const connection = await pool.getConnection();
    try {
      await connection.query(
        `UPDATE subscriptions SET 
         status = 'CANCELLED', 
         cancelled_at = ?,
         updated_at = ?
         WHERE paystack_subscription_code = ?`,
        [
          new Date(),
          new Date(),
          subscription_code
        ]
      );
      
      console.log(`Subscription ${subscription_code} cancelled from webhook`);
    } catch (error) {
      console.error('Error updating cancelled subscription from webhook:', error);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error handling subscription disabled webhook:', error);
  }
}

async function handleSubscriptionEnabled(data) {
  try {
    const { subscription_code } = data;
    console.log('Subscription enabled webhook:', { subscription_code });
    
    // Update our record to reactivate the subscription
    const connection = await pool.getConnection();
    try {
      await connection.query(
        `UPDATE subscriptions SET 
         status = 'ACTIVE', 
         cancelled_at = NULL,
         updated_at = ?
         WHERE paystack_subscription_code = ?`,
        [
          new Date(),
          subscription_code
        ]
      );
      
      console.log(`Subscription ${subscription_code} reactivated from webhook`);
    } catch (error) {
      console.error('Error updating reactivated subscription from webhook:', error);
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error handling subscription enabled webhook:', error);
  }
}

async function handleFailedPayment(data) {
  try {
    const { subscription } = data;
    console.log('Failed payment webhook:', { subscription });
    
    if (subscription && subscription.subscription_code) {
      // Update our record to mark the subscription as past due
      const connection = await pool.getConnection();
      try {
        await connection.query(
          `UPDATE subscriptions SET 
           status = 'PAST_DUE', 
           updated_at = ?
           WHERE paystack_subscription_code = ?`,
          [
            new Date(),
            subscription.subscription_code
          ]
        );
        
        console.log(`Subscription ${subscription.subscription_code} marked as PAST_DUE from webhook`);
      } catch (error) {
        console.error('Error updating past due subscription from webhook:', error);
      } finally {
        connection.release();
      }
    }
  } catch (error) {
    console.error('Error handling failed payment webhook:', error);
  }
}

export default router;
