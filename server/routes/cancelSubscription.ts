import { Router } from 'express';
import { pool } from '@db';
import { verifySession } from '../auth';
import axios from 'axios';

const router = Router();

// Cancel subscription endpoint with more robust error handling
router.delete("/api/subscription/:id", async (req, res) => {
  try {
    // Verify user is authenticated
    const user = await verifySession(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const subscriptionId = req.params.id;
    const connection = await pool.getConnection();
    
    try {
      console.log(`User ${user.id} attempting to cancel subscription ${subscriptionId}`);
      
      // Check if subscription exists and belongs to the user
      const [subscriptionResult] = await connection.query(
        `SELECT * FROM subscriptions WHERE id = ? AND user_id = ?`,
        [subscriptionId, user.id]
      );
      
      // Convert to array if not already
      const subscriptionArray = Array.isArray(subscriptionResult) ? subscriptionResult : [];

      if (subscriptionArray.length === 0) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      
      const subscription = subscriptionArray[0];
      console.log(`Found subscription: ID=${subscriptionId}, Status=${subscription.status}`);
      
      // Determine if we have Paystack info
      const hasPaystackSubscriptionCode = subscription.paystack_subscription_code ? true : false;
      const hasPaystackCustomerCode = subscription.paystack_customer_code ? true : false;
      
      let paystackCancellationSuccessful = false;
      
      // Try to cancel in Paystack if we have a subscription code
      if (hasPaystackSubscriptionCode) {
        const subscriptionCode = subscription.paystack_subscription_code;
        console.log(`Attempting to cancel Paystack subscription: ${subscriptionCode}`);
        
        try {
          // Using direct Paystack API call for simplicity
          const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
          
          if (!PAYSTACK_SECRET_KEY) {
            console.error('Missing Paystack secret key for subscription cancellation');
          } else {            
            // Send cancellation request to Paystack
            const cancelResponse = await axios.post(
              `https://api.paystack.co/subscription/disable`,
              {
                code: subscriptionCode,
                token: 'cancel' // Required by Paystack API
              },
              {
                headers: {
                  'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
                  'Content-Type': 'application/json'
                }
              }
            );
            
            if (cancelResponse.data && cancelResponse.data.status) {
              console.log(`Successfully cancelled Paystack subscription: ${subscriptionCode}`);
              paystackCancellationSuccessful = true;
            } else {
              console.log('Paystack API responded without success status');
            }
          }
        } catch (error) {
          console.error('Error cancelling subscription in Paystack:', error.message || 'Unknown error');
          // Continue with local cancellation even if Paystack fails
        }
      }
      
      console.log('Proceeding with local database cancellation');
      
      // Always update our local database regardless of Paystack result
      const now = new Date();
      const formattedDate = now.toISOString().slice(0, 19).replace('T', ' ');
      
      // Try to update with cancelled_at column first
      try {
        console.log(`Updating subscription ${subscriptionId} status to CANCELLED`);
        const updateResult = await connection.query(
          `UPDATE subscriptions SET status = 'CANCELLED', updated_at = ?, cancelled_at = ? WHERE id = ?`,
          [formattedDate, formattedDate, subscriptionId]
        );
        console.log('Database update successful');
      } catch (dbError) {
        console.error('Error during database update:', dbError.message);
        
        // Fallback without cancelled_at if needed
        try {
          console.log('Attempting fallback update without cancelled_at');
          await connection.query(
            `UPDATE subscriptions SET status = 'CANCELLED', updated_at = ? WHERE id = ?`,
            [formattedDate, subscriptionId]
          );
          console.log('Fallback update successful');
        } catch (fallbackError) {
          console.error('Fallback update failed:', fallbackError.message);
          return res.status(500).json({ error: "Database error during cancellation" });
        }
      }

      // Create response message with clear instructions
      let message = "Your subscription has been successfully cancelled in OPIAN.";
      
      // Add details about Paystack if applicable
      if (hasPaystackSubscriptionCode || hasPaystackCustomerCode) {
        if (paystackCancellationSuccessful) {
          message += " We've also cancelled your subscription in Paystack.";
        } else {
          message += " To complete the cancellation process, please also check your Paystack account to ensure recurring payments are stopped.";
        }
      }

      // Send successful response
      return res.json({
        success: true,
        message: message,
        cancellationDate: formattedDate,
        paystackStatus: paystackCancellationSuccessful ? "cancelled" : "unknown"
      });
      
    } finally {
      // Always release the connection
      connection.release();
    }
  } catch (error) {
    // Handle any unhandled errors
    console.error("Unhandled error in subscription cancellation:", error);
    res.status(500).json({ 
      error: "An unexpected error occurred",
      message: "We couldn't process your cancellation request. Please try again or contact support."
    });
  }
});

export default router;