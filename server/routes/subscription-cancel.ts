/**
 * Simplified and robust subscription cancellation endpoint
 * 
 * This implementation uses the utility function to handle subscription cancellation
 * with better error handling.
 */

import express, { Request, Response } from 'express';
import { verifySession } from '../auth';
import { cancelSubscription } from '../utils/cancel-subscription';

const router = express.Router();

/**
 * Cancel subscription endpoint
 * 
 * Cancels a subscription both in the local database and attempts to cancel it in Paystack
 * if applicable. Provides clear error messages and handles edge cases.
 */
router.post('/api/subscription/cancel/:id', async (req: Request, res: Response) => {
  console.log(`Processing subscription cancellation request for subscription ID ${req.params.id}`);
  
  try {
    // Verify user authentication
    const user = await verifySession(req);
    if (!user) {
      console.log('User not authenticated for subscription cancellation');
      return res.status(401).json({
        success: false,
        message: 'You must be logged in to cancel a subscription',
        error: 'UNAUTHORIZED'
      });
    }
    
    console.log(`Authenticated user ID ${user.id} attempting to cancel subscription ${req.params.id}`);
    
    // Call the utility function to handle the cancellation
    const result = await cancelSubscription(req.params.id, user.id);
    
    // Return the result
    if (result.success) {
      return res.status(200).json(result);
    } else {
      return res.status(400).json(result);
    }
  } catch (error) {
    console.error('Unexpected error in subscription cancellation endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred. Please try again later or contact support.',
      error: 'INTERNAL_SERVER_ERROR'
    });
  }
});

export default router;