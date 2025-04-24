/**
 * Subscription Reactivation Routes
 * 
 * This file contains endpoints for reactivating cancelled subscriptions
 */

import express from 'express';
import { pool } from '../../db';
import { getUserFromTokenOrSession } from '../auth';
import { reactivateSubscription } from '../utils/paystack-subscription';

const router = express.Router();

// Reactivate a cancelled subscription
router.post("/reactivate/:id", async (req, res) => {
  try {
    // Get user from both token and session
    const user = await getUserFromTokenOrSession(req);
    if (!user) {
      console.log('User authentication failed in subscription reactivation endpoint');
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const subscriptionId = req.params.id;
    const connection = await pool.getConnection();
    
    try {
      // Get the subscription details
      const [subscriptionResult] = await connection.query(
        `SELECT * FROM subscriptions 
         WHERE id = ? AND user_id = ? AND status = 'CANCELLED'`,
        [subscriptionId, user.id]
      );
      
      const subscriptionArray = Array.isArray(subscriptionResult) ? subscriptionResult : [];
      
      if (subscriptionArray.length === 0) {
        return res.status(404).json({
          success: false,
          message: "No cancelled subscription found with this ID"
        });
      }
      
      const subscription = subscriptionArray[0];
      
      // Check if we have the required subscription code and email token
      if (!subscription.paystack_subscription_code) {
        return res.status(400).json({
          success: false,
          message: "Cannot reactivate subscription without Paystack subscription code",
          suggestion: "Please contact support for assistance"
        });
      }
      
      if (!subscription.paystack_email_token) {
        return res.status(400).json({
          success: false,
          message: "Cannot reactivate subscription without Paystack email token",
          suggestion: "Please contact support for assistance with reactivation"
        });
      }
      
      // Attempt to reactivate the subscription with Paystack
      try {
        const reactivationSuccessful = await reactivateSubscription(
          subscription.paystack_subscription_code,
          subscription.paystack_email_token
        );
        
        if (reactivationSuccessful) {
          // Update subscription status locally
          await connection.query(
            `UPDATE subscriptions SET 
             status = 'ACTIVE', 
             updated_at = ?,
             cancelled_at = NULL
             WHERE id = ?`,
            [new Date(), subscriptionId]
          );
          
          return res.json({
            success: true,
            message: "Subscription successfully reactivated",
            subscription: {
              id: subscription.id,
              status: 'ACTIVE',
              package_type: subscription.package_type
            }
          });
        } else {
          return res.status(500).json({
            success: false,
            message: "Failed to reactivate subscription with Paystack"
          });
        }
      } catch (reactivationError) {
        console.error('Error reactivating subscription:', reactivationError);
        
        return res.status(500).json({
          success: false,
          message: "Error reactivating subscription",
          error: reactivationError.message,
          suggestion: "Please contact support for assistance"
        });
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error processing subscription reactivation:", error);
    res.status(500).json({ error: "Failed to process reactivation request" });
  }
});

export default router;