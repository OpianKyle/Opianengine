/**
 * Subscription Routes
 * 
 * This module provides API endpoints for managing Paystack subscriptions.
 * It handles subscription initialization, verification, cancelation, and retrieval.
 * 
 * NOTE: All subscription functionality is currently commented out.
 */
import express from 'express';
import { pool } from '@db';
import { isAuthenticated } from '../auth';
// import * as paystackService from '../paystack';
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
 * 
 * NOTE: Function is commented out as part of disabling subscription functionality
 */
// Commented out syncSubscriptionData function
async function syncSubscriptionData(userId: number, email: string, connection: any) {
  console.log(`[DISABLED] Syncing subscription data for user ${userId} (${email})`);
  return null;
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
 * 
 * NOTE: API is disabled as part of commenting out subscription functionality
 */
router.post('/initialize', isAuthenticated, async (req: any, res) => {
  return res.status(200).json({
    success: false,
    message: "Subscription functionality is currently disabled.",
  });
});

/**
 * Verify a subscription payment
 * GET /api/subscription/verify
 * 
 * NOTE: API is disabled as part of commenting out subscription functionality
 */
router.get('/verify', async (req, res) => {
  return res.redirect('/dashboard/subscription?status=disabled');
});

/**
 * Get subscription details
 * GET /api/subscription/details
 * 
 * NOTE: API is disabled as part of commenting out subscription functionality
 */
router.get('/details', isAuthenticated, async (req: any, res) => {
  // Return demo subscription data
  return res.status(200).json({
    success: true,
    subscription: {
      id: 1,
      code: 'SUB_DEMO',
      status: 'active',
      amount: 825.00,
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      nextPaymentDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      packageType: req.user?.selectedPackage || 'PINNACLE',
      plan: {
        name: req.user?.selectedPackage || 'PINNACLE',
        interval: 'monthly'
      }
    }
  });
});

/**
 * Cancel a subscription
 * POST /api/subscription/cancel
 * 
 * NOTE: API is disabled as part of commenting out subscription functionality
 */
router.post('/cancel', isAuthenticated, async (req: any, res) => {
  return res.status(200).json({
    success: true,
    message: 'Subscription cancellation is disabled.'
  });
});

/**
 * Reactivate a subscription
 * POST /api/subscription/reactivate
 * 
 * NOTE: API is disabled as part of commenting out subscription functionality
 */
router.post('/reactivate', isAuthenticated, async (req: any, res) => {
  return res.status(200).json({
    success: true,
    message: 'Subscription reactivation is disabled.'
  });
});

/**
 * Get a payment update link
 * GET /api/subscription/update-link
 * 
 * NOTE: API is disabled as part of commenting out subscription functionality
 */
router.get('/update-link', isAuthenticated, async (req: any, res) => {
  return res.status(200).json({
    success: true,
    message: 'Subscription payment update is disabled.',
    link: '#'
  });
});

/**
 * Get subscription history
 * GET /api/subscription/history
 * 
 * NOTE: API is disabled as part of commenting out subscription functionality
 */
router.get('/history', isAuthenticated, async (req: any, res) => {
  return res.status(200).json({
    success: true,
    history: [{
      id: 1,
      packageType: req.user?.selectedPackage || 'PINNACLE',
      status: 'active',
      amount: 825.00, 
      startDate: new Date(),
      endDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      createdAt: new Date()
    }]
  });
});

/**
 * Sync subscription data from Paystack to local database
 * POST /api/subscription/sync
 * 
 * NOTE: API is disabled as part of commenting out subscription functionality
 */
router.post('/sync', isAuthenticated, async (req: any, res) => {
  return res.status(200).json({
    success: true,
    message: 'Subscription sync is disabled.',
    subscription: {
      code: 'SUB_DEMO',
      status: 'active',
      packageType: req.user?.selectedPackage || 'PINNACLE'
    }
  });
});

export default router;