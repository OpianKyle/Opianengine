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
    const { amount, purpose, metadata } = req.body;
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
    
    // Initialize the transaction
    const transaction = await initializeTransaction(
      amountInCents,
      user.email,
      reference,
      {
        user_id: user.id,
        purpose: purpose || 'Account funding',
        ...metadata
      }
    );
    
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
      message: 'Failed to initialize payment'
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
  // This is a redirect URL after payment
  const reference = req.body.reference || req.query.reference;
  return res.redirect(`/profile/subscription?reference=${reference}&status=success`);
});

// GET version for the callback URL (Paystack might redirect with GET)
router.get('/callback', async (req, res) => {
  // Extract reference from query params
  const reference = req.query.reference || req.query.trxref;
  return res.redirect(`/profile/subscription?reference=${reference}&status=success`);
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
        
        // Update the subscription to ACTIVE status
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
            subscriptionId
          ]
        );
        
        console.log(`Subscription ${subscriptionId} activated after payment verification`);
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

export default router;