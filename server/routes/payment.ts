/**
 * Payment Routes
 * 
 * API endpoints for handling payments via Paystack
 */

import express from 'express';
import { db } from '../../db';
import { users, transactions } from '../../db/schema';
import { eq } from 'drizzle-orm';
import { 
  createOrGetCustomer, 
  initializeTransaction, 
  verifyTransaction, 
  listCustomerTransactions, 
  generateReference 
} from '../utils/paystack';
import { paystackConfig } from '../config/paystack';
import { checkAuth } from '../middleware/auth';

const router = express.Router();

// Initialize a payment transaction
router.post('/initialize', checkAuth, async (req, res) => {
  try {
    const { amount, purpose, metadata } = req.body;
    const user = req.user;

    if (!user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    // Ensure the user exists in Paystack
    const customer = await createOrGetCustomer(user);
    
    // Convert amount to lowest unit (cents)
    const amountInCents = paystackConfig.convertAmountToLowestUnit(amount);
    
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

// Verify a transaction
router.get('/verify/:reference', checkAuth, async (req, res) => {
  try {
    const { reference } = req.params;
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    // Verify the transaction with Paystack
    const verificationData = await verifyTransaction(reference);
    
    if (verificationData.status === 'success') {
      // Convert amount from kobo/cents to rand
      const amountInRand = paystackConfig.convertFromLowestUnit(verificationData.amount);
      
      // Record the transaction
      const transactionRecord = await db.insert(transactions).values({
        userId: user.id,
        reference: reference,
        amount: amountInRand,
        status: 'COMPLETED',
        type: 'FUNDING',
        description: verificationData.metadata?.purpose || 'Account funding',
        paymentMethod: 'PAYSTACK',
        paymentReference: reference,
        createdAt: new Date()
      }).execute();
      
      // Update user balance
      await db.update(users)
        .set({ 
          walletBalance: user.walletBalance + amountInRand,
          lastFundingDate: new Date()
        })
        .where(eq(users.id, user.id))
        .execute();
      
      return res.json({
        success: true,
        message: 'Payment verified successfully',
        data: {
          amount: amountInRand,
          reference,
          status: 'COMPLETED'
        }
      });
      
    } else {
      // Record failed transaction
      await db.insert(transactions).values({
        userId: user.id,
        reference: reference,
        amount: paystackConfig.convertFromLowestUnit(verificationData.amount),
        status: 'FAILED',
        type: 'FUNDING',
        description: 'Failed payment',
        paymentMethod: 'PAYSTACK',
        paymentReference: reference,
        createdAt: new Date()
      }).execute();
      
      return res.json({
        success: false,
        message: 'Payment verification failed',
        data: {
          reference,
          status: 'FAILED'
        }
      });
    }
    
  } catch (error) {
    console.error('Payment verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify payment'
    });
  }
});

// Get user's transaction history
router.get('/transactions', checkAuth, async (req, res) => {
  try {
    const user = req.user;
    
    if (!user) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }
    
    const userTransactions = await db.select()
      .from(transactions)
      .where(eq(transactions.userId, user.id))
      .orderBy(transactions.createdAt, 'desc')
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

// Callback URL for Paystack (webhook)
router.post('/callback', async (req, res) => {
  // This is a redirect URL after payment, not a webhook
  // In a real-world scenario, we'd verify the payment using the reference
  return res.redirect('/profile/payments?status=success');
});

export default router;