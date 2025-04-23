import { Router } from 'express';
import { checkAdmin } from '../auth';
import { pool } from '@db';
import fetch from 'node-fetch';

const router = Router();

// Paystack API helper function
async function fetchFromPaystack(endpoint: string) {
  if (!process.env.PAYSTACK_SECRET_KEY) {
    throw new Error('PAYSTACK_SECRET_KEY environment variable is not set');
  }

  const response = await fetch(`https://api.paystack.co/${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error('Paystack API error:', errorData);
    throw new Error(`Paystack API error: ${response.statusText}`);
  }

  return await response.json();
}

// Middleware to check if user is an admin
router.use(checkAdmin);

// Get all subscriptions (admin only)
router.get("/api/admin/subscriptions", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    try {
      // Fetch all subscriptions with user details
      const [result] = await connection.query(
        `SELECT s.*, u.email AS user_email, CONCAT(u.first_name, ' ', u.last_name) AS user_name 
         FROM subscriptions s
         JOIN users u ON s.user_id = u.id
         ORDER BY s.created_at DESC`
      );
      
      const subscriptions = Array.isArray(result) ? result : [];
      
      // Transform snake_case to camelCase for frontend
      const transformedSubscriptions = subscriptions.map(sub => ({
        id: sub.id,
        userId: sub.user_id,
        userEmail: sub.user_email,
        userName: sub.user_name,
        packageType: sub.package_type,
        status: sub.status,
        amount: sub.amount,
        createdAt: sub.created_at,
        updatedAt: sub.updated_at,
        startDate: sub.start_date,
        endDate: sub.end_date,
        lastPaymentDate: sub.last_payment_date,
        nextPaymentDate: sub.next_payment_date,
        paystackSubscriptionCode: sub.paystack_subscription_code,
        paystackCustomerCode: sub.paystack_customer_code,
        paymentMethod: sub.payment_method,
        paymentReference: sub.payment_reference,
        cancelledAt: sub.cancelled_at
      }));
      
      return res.json({
        success: true,
        subscriptions: transformedSubscriptions
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    res.status(500).json({ error: "Failed to retrieve subscriptions" });
  }
});

// Update subscription details (admin only)
router.put("/api/admin/subscriptions/:id", async (req, res) => {
  try {
    const subscriptionId = req.params.id;
    const { paystackSubscriptionCode, paystackCustomerCode } = req.body;
    
    // Validate inputs
    if (subscriptionId === undefined) {
      return res.status(400).json({ error: "Subscription ID is required" });
    }
    
    const connection = await pool.getConnection();
    try {
      // Check if subscription exists
      const [subscriptionResult] = await connection.query(
        "SELECT * FROM subscriptions WHERE id = ?",
        [subscriptionId]
      );
      
      const subscriptionExists = Array.isArray(subscriptionResult) && subscriptionResult.length > 0;
      
      if (!subscriptionExists) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      
      // Update the subscription with Paystack details
      await connection.query(
        `UPDATE subscriptions SET 
         paystack_subscription_code = ?,
         paystack_customer_code = ?,
         updated_at = ?
         WHERE id = ?`,
        [
          paystackSubscriptionCode,
          paystackCustomerCode,
          new Date(),
          subscriptionId
        ]
      );
      
      console.log(`Admin updated subscription ${subscriptionId} with Paystack details`);
      
      return res.json({
        success: true,
        message: "Subscription updated successfully"
      });
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error updating subscription:", error);
    res.status(500).json({ error: "Failed to update subscription" });
  }
});

// Sync subscriptions with Paystack data (admin only)
router.post("/api/admin/subscriptions/sync", async (req, res) => {
  console.log("Starting Paystack subscription sync");
  try {
    const connection = await pool.getConnection();
    
    try {
      // Get all active subscriptions that are missing Paystack codes
      const [subscriptionsResult] = await connection.query(
        `SELECT s.*, u.email 
         FROM subscriptions s
         JOIN users u ON s.user_id = u.id
         WHERE s.status = 'ACTIVE'
         ORDER BY s.created_at DESC`
      );
      
      const subscriptions = Array.isArray(subscriptionsResult) ? subscriptionsResult : [];
      console.log(`Found ${subscriptions.length} active subscriptions to check`);
      
      // Sync results
      const results = {
        updated: 0,
        failed: 0,
        notFound: 0,
        details: [] as Array<any>
      };
      
      // Fetch all Paystack subscriptions
      console.log("Fetching subscriptions from Paystack API");
      const paystackData = await fetchFromPaystack('subscription');
      
      if (!paystackData.status || !paystackData.data) {
        throw new Error('Failed to fetch subscription data from Paystack');
      }
      
      const paystackSubscriptions = paystackData.data;
      console.log(`Fetched ${paystackSubscriptions.length} subscriptions from Paystack`);
      
      // Fetch all Paystack customers
      console.log("Fetching customers from Paystack API");
      const customersData = await fetchFromPaystack('customer');
      
      if (!customersData.status || !customersData.data) {
        throw new Error('Failed to fetch customer data from Paystack');
      }
      
      const paystackCustomers = customersData.data;
      console.log(`Fetched ${paystackCustomers.length} customers from Paystack`);
      
      // For each subscription, try to find matching Paystack subscription and customer
      for (const subscription of subscriptions) {
        try {
          const email = subscription.email?.toLowerCase();
          
          if (!email) {
            console.log(`No email for subscription ID ${subscription.id}, skipping`);
            results.notFound++;
            results.details.push({
              subscription_id: subscription.id,
              message: 'No email associated with subscription',
              success: false
            });
            continue;
          }
          
          // Find customer by email
          const customer = paystackCustomers.find(
            (c: any) => c.email?.toLowerCase() === email
          );
          
          if (!customer) {
            console.log(`No Paystack customer found for email: ${email}`);
            results.notFound++;
            results.details.push({
              subscription_id: subscription.id,
              email: email,
              message: 'No Paystack customer found with this email',
              success: false
            });
            continue;
          }
          
          // Find subscription for this customer
          const paystackSubscription = paystackSubscriptions.find(
            (s: any) => s.customer?.email?.toLowerCase() === email
          );
          
          if (!paystackSubscription) {
            console.log(`No Paystack subscription found for email: ${email}`);
            // We at least have a customer code
            await connection.query(
              `UPDATE subscriptions SET 
               paystack_customer_code = ?,
               updated_at = ?
               WHERE id = ?`,
              [
                customer.customer_code,
                new Date(),
                subscription.id
              ]
            );
            
            results.details.push({
              subscription_id: subscription.id,
              email: email,
              message: 'Found customer code but no subscription code',
              paystack_customer_code: customer.customer_code,
              success: true
            });
            results.updated++;
            continue;
          }
          
          // Update database with Paystack information
          await connection.query(
            `UPDATE subscriptions SET 
             paystack_subscription_code = ?,
             paystack_customer_code = ?,
             updated_at = ?
             WHERE id = ?`,
            [
              paystackSubscription.subscription_code,
              customer.customer_code,
              new Date(),
              subscription.id
            ]
          );
          
          console.log(`Updated subscription ${subscription.id} with Paystack details`);
          results.updated++;
          results.details.push({
            subscription_id: subscription.id,
            email: email,
            message: 'Successfully updated with Paystack details',
            paystack_subscription_code: paystackSubscription.subscription_code,
            paystack_customer_code: customer.customer_code,
            success: true
          });
          
        } catch (syncError) {
          console.error(`Error syncing subscription ${subscription.id}:`, syncError);
          results.failed++;
          results.details.push({
            subscription_id: subscription.id,
            email: subscription.email,
            message: `Error: ${(syncError as Error).message || 'Unknown error'}`,
            error: syncError,
            success: false
          });
        }
      }
      
      console.log("Sync complete", results);
      return res.json({
        success: true,
        results
      });
      
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("Error syncing subscriptions:", error);
    res.status(500).json({ 
      error: "Failed to sync subscriptions",
      message: (error as Error).message
    });
  }
});

export default router;