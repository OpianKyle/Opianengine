/**
 * Utility function to cancel a subscription
 * 
 * This module handles the cancellation of subscriptions both in the local database
 * and in Paystack (if applicable). It provides a robust implementation with
 * proper error handling.
 */

import { createConnection } from '../db';
// We'll use a direct API call instead of importing paystack util
import axios from 'axios';

interface CancellationResult {
  success: boolean;
  message: string;
  paystackCancellationSuccessful?: boolean;
  cancellationDate?: string;
  error?: string;
}

/**
 * Cancel a subscription for a user
 * 
 * @param subscriptionId The ID of the subscription to cancel
 * @param userId The ID of the user who owns the subscription
 * @returns CancellationResult with status and messages
 */
export async function cancelSubscription(subscriptionId: number | string, userId: number): Promise<CancellationResult> {
  const connection = await createConnection();
  
  try {
    console.log(`Starting cancellation process for subscription ${subscriptionId} by user ${userId}`);
    
    // Fetch the subscription details
    const [subscriptions] = await connection.execute(
      `SELECT * FROM subscriptions WHERE id = ? AND user_id = ?`,
      [subscriptionId, userId]
    );
    
    // Check if subscription exists and belongs to the user
    if (!Array.isArray(subscriptions) || subscriptions.length === 0) {
      console.log(`Subscription ${subscriptionId} not found or doesn't belong to user ${userId}`);
      return {
        success: false,
        message: "Subscription not found or doesn't belong to you.",
        error: 'NOT_FOUND'
      };
    }
    
    const subscription = subscriptions[0];
    
    // Check if subscription is already cancelled
    if (subscription.cancelled_at) {
      console.log(`Subscription ${subscriptionId} is already cancelled at ${subscription.cancelled_at}`);
      return {
        success: false,
        message: "This subscription is already cancelled.",
        error: 'ALREADY_CANCELLED',
        cancellationDate: subscription.cancelled_at 
      };
    }
    
    // Start a transaction for database operations
    await connection.beginTransaction();
    
    // Set the cancellation date in our database
    const now = new Date();
    const formattedDate = now.toISOString().slice(0, 19).replace('T', ' ');
    
    console.log(`Setting cancelled_at to ${formattedDate} for subscription ${subscriptionId}`);
    
    await connection.execute(
      `UPDATE subscriptions SET 
       cancelled_at = ?, 
       updated_at = ?,
       status = 'CANCELLED'
       WHERE id = ?`,
      [formattedDate, formattedDate, subscriptionId]
    );
    
    // Try to cancel the subscription in Paystack if we have the codes
    let paystackCancellationSuccessful = false;
    if (subscription.paystack_subscription_code) {
      try {
        console.log(`Attempting to cancel subscription in Paystack: ${subscription.paystack_subscription_code}`);
        
        // Direct Paystack API call for cancellation
        const paystackAPIKey = process.env.PAYSTACK_SECRET_KEY;
        
        if (!paystackAPIKey) {
          console.error('PAYSTACK_SECRET_KEY not set in environment variables');
          throw new Error('Paystack API key not available');
        }
        
        // Make direct API call to Paystack
        const paystackResponse = await axios({
          method: 'post',
          url: `https://api.paystack.co/subscription/disable`,
          headers: {
            'Authorization': `Bearer ${paystackAPIKey}`,
            'Content-Type': 'application/json'
          },
          data: {
            code: subscription.paystack_subscription_code,
            token: subscription.paystack_email_token || '' // May be optional
          }
        });
        
        if (paystackResponse && paystackResponse.status === 200 && paystackResponse.data && paystackResponse.data.status) {
          console.log('Paystack cancellation successful');
          paystackCancellationSuccessful = true;
        } else {
          console.warn('Paystack cancellation returned non-success status', {
            status: paystackResponse?.status,
            data: paystackResponse?.data
          });
        }
      } catch (paystackError) {
        console.error('Error cancelling subscription in Paystack:', paystackError);
        // We continue even if Paystack cancellation fails - the DB cancellation is what matters most
      }
    } else {
      console.log('No Paystack subscription code found, skipping Paystack cancellation');
    }
    
    // Create a notification about the cancellation
    try {
      console.log('Creating cancellation notification');
      
      await connection.execute(
        `INSERT INTO notifications 
         (user_id, type, title, message, created_at, is_read)
         VALUES (?, ?, ?, ?, NOW(), 0)`,
        [
          userId,
          'SUBSCRIPTION_CANCELLED',
          'Subscription Cancelled',
          `Your ${subscription.package_type} subscription has been cancelled. You will not be billed again.`
        ]
      );
    } catch (notificationError) {
      console.error('Error creating notification:', notificationError);
      // Continue even if notification creation fails
    }
    
    // Commit the transaction
    await connection.commit();
    
    return {
      success: true,
      message: "Your subscription has been successfully cancelled.",
      paystackCancellationSuccessful,
      cancellationDate: formattedDate
    };
    
  } catch (error) {
    // Rollback the transaction on error
    try {
      await connection.rollback();
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    
    console.error('Error in subscription cancellation:', error);
    
    return {
      success: false,
      message: "An error occurred while cancelling your subscription. Please try again or contact support.",
      error: 'INTERNAL_ERROR'
    };
  } finally {
    // Always close the connection
    try {
      await connection.end();
    } catch (connectionError) {
      console.error('Error closing database connection:', connectionError);
    }
  }
}