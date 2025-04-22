import express from 'express';
import { Request, Response } from 'express';
import { db } from '../../db';
import { transactions, subscriptions, users } from '../../db/schema';
import { and, eq, desc } from 'drizzle-orm';
import * as paystackSubscription from '../utils/paystack-subscription';
import { z } from 'zod';
import { getOrCreateCustomer } from '../utils/paystack';
import { verifySession, checkAdmin } from '../auth';

const router = express.Router();

// Package prices in ZAR
const PACKAGE_PRICES = {
  OPPORTUNITY: 350,
  MOMENTUM: 450,
  PROSPER: 550, 
  PRESTIGE: 695,
  PINNACLE: 825
};

// Schema for creating a new subscription
const createSubscriptionSchema = z.object({
  packageType: z.enum(['OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE'])
});

/**
 * Get package price by type
 */
function getPackagePrice(packageType: string): number {
  const type = packageType.toUpperCase();
  return PACKAGE_PRICES[type] || 0;
}

/**
 * Initialize a subscription for a package
 * POST /api/subscription/create
 */
router.post('/create', async (req: Request, res: Response) => {
  const user = await verifySession(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const { packageType } = createSubscriptionSchema.parse(req.body);

    // Get package price
    const amount = getPackagePrice(packageType);
    if (amount === 0) {
      return res.status(400).json({ message: 'Invalid package type' });
    }

    // Create or get Paystack customer
    const customer = await getOrCreateCustomer(user.email, {
      first_name: user.firstName,
      last_name: user.lastName
    });

    // Create or get Paystack plan for this package
    const plan = await paystackSubscription.getOrCreatePlan(
      `${packageType} Package`,
      amount,
      'monthly'
    );

    // Initialize subscription
    const subscription = await paystackSubscription.createSubscription(
      customer.customer_code,
      plan.plan_code,
      { 
        userId: user.id,
        packageType
      }
    );

    // Save subscription to database
    const result = await db.insert(subscriptions).values({
      userId: user.id,
      packageType,
      amount,
      paystackCustomerCode: customer.customer_code,
      paystackSubscriptionCode: subscription.subscription_code,
      paystackAuthorizationCode: subscription.authorization?.authorization_code || null,
      authEmail: user.email,
      nextPaymentDate: new Date(subscription.next_payment_date),
      status: 'ACTIVE'
    });
    
    // Get the newly created subscription
    const [newSubscription] = await db.select().from(subscriptions)
      .where(eq(subscriptions.paystackSubscriptionCode, subscription.subscription_code))
      .limit(1);

    // Update user's selected package
    await db.update(users)
      .set({
        selectedPackage: packageType
      })
      .where(eq(users.id, user.id));

    // Add initial subscription payment transaction
    await db.insert(transactions).values({
      userId: user.id,
      points: 0,
      type: 'SUBSCRIPTION_PAYMENT',
      description: `Monthly subscription payment for ${packageType} package`,
      status: 'PROCESSED',
      processedAt: new Date(),
      paymentMethod: 'PAYSTACK',
      paymentReference: subscription.subscription_code,
      metadata: JSON.stringify({
        subscriptionId: newSubscription.id,
        packageType,
        amount
      })
    });

    return res.status(200).json({
      message: 'Subscription created successfully',
      subscription: newSubscription,
      paystackReference: subscription.subscription_code
    });
  } catch (error) {
    console.error('Error creating subscription:', error);
    
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: 'Invalid request data', errors: error.errors });
    }
    
    return res.status(500).json({ message: 'Failed to create subscription' });
  }
});

/**
 * Get all active subscriptions for current user
 * GET /api/subscription
 */
router.get('/', async (req: Request, res: Response) => {
  const user = await verifySession(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {

    const userSubscriptions = await db.query.subscriptions.findMany({
      where: eq(subscriptions.userId, user.id),
      orderBy: [desc(subscriptions.createdAt)]
    });

    return res.status(200).json({
      subscriptions: userSubscriptions
    });
  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return res.status(500).json({ message: 'Failed to fetch subscriptions' });
  }
});

/**
 * Cancel subscription
 * POST /api/subscription/:id/cancel
 */
router.post('/:id/cancel', async (req: Request, res: Response) => {
  const user = await verifySession(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const subscriptionId = parseInt(req.params.id);

    // Find subscription in our database
    const [subscription] = await db.select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.id, subscriptionId),
          eq(subscriptions.userId, user.id)
        )
      );

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Cancel subscription in Paystack
    if (subscription.paystackSubscriptionCode) {
      await paystackSubscription.cancelSubscription(subscription.paystackSubscriptionCode);
    }

    // Update subscription status in database
    await db.update(subscriptions)
      .set({
        status: 'CANCELLED',
        cancelledAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, subscriptionId));

    return res.status(200).json({
      message: 'Subscription cancelled successfully'
    });
  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return res.status(500).json({ message: 'Failed to cancel subscription' });
  }
});

/**
 * Reactivate subscription
 * POST /api/subscription/:id/reactivate
 */
router.post('/:id/reactivate', async (req: Request, res: Response) => {
  const user = await verifySession(req);
  if (!user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  try {
    const subscriptionId = parseInt(req.params.id);

    // Find subscription in our database
    const [subscription] = await db.select()
      .from(subscriptions)
      .where(
        and(
          eq(subscriptions.id, subscriptionId),
          eq(subscriptions.userId, user.id)
        )
      );

    if (!subscription) {
      return res.status(404).json({ message: 'Subscription not found' });
    }

    // Reactivate subscription in Paystack
    if (subscription.paystackSubscriptionCode) {
      await paystackSubscription.reactivateSubscription(subscription.paystackSubscriptionCode);
    }

    // Update subscription status in database
    await db.update(subscriptions)
      .set({
        status: 'ACTIVE',
        cancelledAt: null,
        updatedAt: new Date()
      })
      .where(eq(subscriptions.id, subscriptionId));

    return res.status(200).json({
      message: 'Subscription reactivated successfully'
    });
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return res.status(500).json({ message: 'Failed to reactivate subscription' });
  }
});

/**
 * Handle Paystack subscription webhook
 * POST /api/subscription/webhook
 */
router.post('/webhook', async (req, res) => {
  try {
    const event = req.body;
    
    // Verify that this is a valid Paystack webhook
    const hash = req.headers['x-paystack-signature'];
    // TODO: implement signature verification when needed
    
    if (event.event === 'subscription.create') {
      // Subscription created, already handled in create endpoint
    } 
    else if (event.event === 'charge.success') {
      // Successful payment
      const data = event.data;
      const customerEmail = data.customer.email;
      const subscriptionCode = data.subscription.subscription_code;
      const amount = data.amount / 100; // Convert from kobo to naira/rand
      
      // Find the user and subscription
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.paystackSubscriptionCode, subscriptionCode)
      });
      
      if (subscription) {
        // Update subscription last payment date and next payment date
        await db.update(subscriptions)
          .set({
            lastPaymentDate: new Date(),
            nextPaymentDate: new Date(data.subscription.next_payment_date),
            updatedAt: new Date()
          })
          .where(eq(subscriptions.id, subscription.id));
        
        // Record transaction
        await db.insert(transactions).values({
          userId: subscription.userId,
          points: 0,
          type: 'SUBSCRIPTION_PAYMENT',
          description: `Monthly subscription payment for ${subscription.packageType} package`,
          status: 'PROCESSED',
          processedAt: new Date(),
          paymentMethod: 'PAYSTACK',
          paymentReference: data.reference,
          metadata: JSON.stringify({
            subscriptionId: subscription.id,
            packageType: subscription.packageType,
            amount: amount
          })
        });
      }
    } 
    else if (event.event === 'charge.failed') {
      // Failed payment
      const data = event.data;
      const customerEmail = data.customer.email;
      const subscriptionCode = data.subscription.subscription_code;
      
      // Find the subscription
      const subscription = await db.query.subscriptions.findFirst({
        where: eq(subscriptions.paystackSubscriptionCode, subscriptionCode)
      });
      
      if (subscription) {
        // Update subscription status
        await db.update(subscriptions)
          .set({
            status: 'PAST_DUE',
            updatedAt: new Date()
          })
          .where(eq(subscriptions.id, subscription.id));
        
        // Record failed transaction
        await db.insert(transactions).values({
          userId: subscription.userId,
          points: 0,
          type: 'SUBSCRIPTION_PAYMENT_FAILED',
          description: `Failed subscription payment for ${subscription.packageType} package`,
          status: 'PROCESSED',
          processedAt: new Date(),
          paymentMethod: 'PAYSTACK',
          paymentReference: data.reference,
          metadata: JSON.stringify({
            subscriptionId: subscription.id,
            packageType: subscription.packageType,
            failureReason: data.gateway_response || 'Payment failed'
          })
        });
      }
    }
    
    return res.status(200).send('Webhook received');
  } catch (error) {
    console.error('Error processing subscription webhook:', error);
    return res.status(500).send('Error processing webhook');
  }
});

export default router;