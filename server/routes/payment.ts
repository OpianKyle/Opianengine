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
              message: 'Payment verified and subscription activated', 
              subscription_id: transaction.metadata.subscription_id 
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
        verificationResult = { success: false, message: 'Verification failed: ' + error.message };
      }
    }
    
    // Always redirect to subscription page with reference (but now the subscription should already be ACTIVE)
    const redirectUrl = `/subscription?reference=${reference}&verified=${verificationResult.success}`;
    console.log('Redirecting to:', redirectUrl);
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in payment callback (POST):', error);
    return res.redirect('/subscription?error=callback_failed');
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
              message: 'Payment verified and subscription activated', 
              subscription_id: transaction.metadata.subscription_id 
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
        verificationResult = { success: false, message: 'Verification failed: ' + error.message };
      }
    }
    
    // Always redirect to subscription page with reference (but now the subscription should already be ACTIVE)
    const redirectUrl = `/subscription?reference=${reference}&verified=${verificationResult.success}`;
    console.log('Redirecting to:', redirectUrl);
    return res.redirect(redirectUrl);
  } catch (error) {
    console.error('Error in payment callback (GET):', error);
    return res.redirect('/subscription?error=callback_failed');
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
            customerCode || null,
            reference,
            subscriptionId
          ]
        );
        
        console.log(`Subscription ${subscriptionId} activated in database after payment verification`);
        
        // 2. Now also make sure the subscription is created in Paystack if it wasn't already
        try {
          if (customerCode && planCode) {
            const { createSubscription } = await import('../utils/paystack');
            
            try {
              // Create the subscription in Paystack
              const subscriptionData = await createSubscription(
                customerCode, 
                planCode, 
                {
                  reference,
                  local_subscription_id: subscriptionId,
                  user_id: user.id,
                  email: user.email
                }
              );
              
              console.log('Successfully created Paystack subscription after payment:', subscriptionData.subscription_code);
              
              // Update our database with the Paystack subscription code
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
              
              console.log(`Updated local subscription ${subscriptionId} with Paystack code ${subscriptionData.subscription_code}`);
            } catch (subscriptionError) {
              console.error('Failed to create Paystack subscription after payment:', subscriptionError);
              // We continue anyway as the payment was successful
            }
          } else {
            console.warn('Missing required data for creating Paystack subscription:', { customerCode, planCode });
          }
        } catch (error) {
          console.error('Error handling Paystack subscription creation:', error);
        }
      }
      
      // Get the newly created transaction
      const [newTransactions] = await connection.query(
        `SELECT * FROM transactions WHERE id = ? LIMIT 1`,
        [transactionId]
      );
      
      if (Array.isArray(newTransactions) && newTransactions.length > 0) {
        transactionRecord = newTransactions[0];
      }
      
    } catch (error) {
      console.error('Error processing payment verification:', error);
      throw error;
    } finally {
      connection.release();
    }
    
    return res.json({
      success: true,
      message: 'Payment verified successfully',
      transaction: transactionRecord
    });
    
  } catch (error) {
    console.error('Error verifying payment:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to verify payment',
      error: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Special route to manually fix any pending subscriptions
router.post('/fix-pending', async (req, res) => {
  try {
    // Both admins and super admins can use this route
    const user = req.user as User | undefined;
    if (!user || !(user.is_admin || user.is_super_admin)) {
      return res.status(403).json({ success: false, message: 'Unauthorized - Admin permissions required' });
    }

    const connection = await pool.getConnection();
    try {
      // Find all PENDING subscriptions
      const [pendingSubscriptions] = await connection.query(
        `SELECT * FROM subscriptions WHERE status = 'PENDING' ORDER BY created_at DESC`
      );
      
      if (!Array.isArray(pendingSubscriptions) || pendingSubscriptions.length === 0) {
        return res.json({ success: true, message: 'No pending subscriptions found' });
      }
      
      console.log(`Found ${pendingSubscriptions.length} pending subscriptions to fix`);
      
      // Process each pending subscription
      const results = [];
      for (const subscription of pendingSubscriptions) {
        // Get reference
        const reference = subscription.payment_reference;
        if (!reference) {
          results.push({
            id: subscription.id,
            status: 'SKIPPED',
            reason: 'No payment reference'
          });
          continue;
        }
        
        try {
          // Try to verify the payment
          const transaction = await verifyTransaction(reference);
          
          if (transaction.status === 'success') {
            // Update the subscription to ACTIVE
            await connection.query(
              `UPDATE subscriptions SET 
               status = 'ACTIVE', 
               last_payment_date = ?,
               next_payment_date = ?,
               updated_at = ?
               WHERE id = ?`,
              [
                new Date(),
                new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // Next payment in 30 days
                new Date(),
                subscription.id
              ]
            );
            
            results.push({
              id: subscription.id,
              status: 'FIXED',
              message: 'Payment verified and subscription activated'
            });
          } else {
            results.push({
              id: subscription.id,
              status: 'SKIPPED',
              reason: `Payment not successful: ${transaction.status}`
            });
          }
        } catch (verifyError) {
          results.push({
            id: subscription.id,
            status: 'ERROR',
            error: verifyError.message
          });
        }
      }
      
      return res.json({
        success: true,
        message: `Processed ${pendingSubscriptions.length} pending subscriptions`,
        results
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Error fixing pending subscriptions:', error);
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to fix pending subscriptions',
      error: error.message 
    });
  }
});

export default router;