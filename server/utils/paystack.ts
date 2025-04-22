/**
 * Paystack API Utility Functions
 * 
 * This file contains utility functions for interacting with the Paystack API.
 * It handles operations like:
 * - Customer creation and management
 * - Payment initialization
 * - Transaction verification
 * - Subscription management
 */

import Paystack from 'paystack-api';
import { User } from '../../db/schema';
import { paystackConfig } from '../config/paystack';

// Initialize Paystack with the secret key
const paystack = Paystack(paystackConfig.secretKey);

/**
 * Create a Paystack customer if one doesn't already exist
 * @param user The user for whom to create a Paystack customer
 * @returns The Paystack customer object
 */
export async function createOrGetCustomer(user: User) {
  try {
    // First check if the customer already exists
    const customerResponse = await paystack.customer.list({
      email: user.email,
    });

    if (customerResponse.data && customerResponse.data.length > 0) {
      // Customer already exists
      return customerResponse.data[0];
    }

    // Create a new customer
    const newCustomer = await paystack.customer.create({
      email: user.email,
      first_name: user.firstName || '',
      last_name: user.lastName || '',
      phone: user.phoneNumber || '',
      metadata: {
        userId: user.id,
      },
    });

    return newCustomer.data;
  } catch (error) {
    console.error('Error creating or fetching Paystack customer:', error);
    throw new Error('Failed to create or get Paystack customer');
  }
}

/**
 * Initialize a payment transaction
 * @param amount Amount in the smallest currency unit (e.g., kobo for NGN)
 * @param email Customer email
 * @param reference Optional reference
 * @param metadata Optional metadata
 * @returns Initialized transaction data
 */
export async function initializeTransaction(
  amount: number,
  email: string,
  reference?: string,
  metadata?: any
) {
  try {
    const transaction = await paystack.transaction.initialize({
      amount,
      email,
      reference,
      metadata,
      callback_url: `/payment/callback`,
    });
    
    return transaction.data;
  } catch (error) {
    console.error('Error initializing Paystack transaction:', error);
    throw new Error('Failed to initialize payment');
  }
}

/**
 * Verify a transaction using its reference
 * @param reference Transaction reference to verify
 * @returns Verified transaction data
 */
export async function verifyTransaction(reference: string) {
  try {
    const verification = await paystack.transaction.verify({ reference });
    return verification.data;
  } catch (error) {
    console.error('Error verifying Paystack transaction:', error);
    throw new Error('Failed to verify transaction');
  }
}

/**
 * List a customer's transactions
 * @param customerEmail Email of the customer
 * @returns List of transactions
 */
export async function listCustomerTransactions(customerEmail: string) {
  try {
    const transactions = await paystack.transaction.list({
      customer: customerEmail,
      perPage: 20,
    });
    return transactions.data;
  } catch (error) {
    console.error('Error listing customer transactions:', error);
    throw new Error('Failed to list customer transactions');
  }
}

/**
 * Create a payment plan for subscription
 * @param name Plan name
 * @param amount Amount in smallest currency unit
 * @param interval Billing interval ('hourly', 'daily', 'weekly', 'monthly', 'annually')
 * @returns Created plan data
 */
export async function createPlan(name: string, amount: number, interval: string) {
  try {
    const plan = await paystack.plan.create({
      name,
      amount,
      interval,
    });
    return plan.data;
  } catch (error) {
    console.error('Error creating Paystack plan:', error);
    throw new Error('Failed to create payment plan');
  }
}

/**
 * Create a subscription for a customer to a plan
 * @param customerEmail Email of the customer
 * @param planCode Code of the plan
 * @returns Created subscription data
 */
export async function createSubscription(customerEmail: string, planCode: string) {
  try {
    const subscription = await paystack.subscription.create({
      customer: customerEmail,
      plan: planCode,
    });
    return subscription.data;
  } catch (error) {
    console.error('Error creating Paystack subscription:', error);
    throw new Error('Failed to create subscription');
  }
}

/**
 * Charge a card token or authorization code
 * @param email Customer's email
 * @param amount Amount in smallest currency unit
 * @param authorizationCode Authorization code from previous transaction
 * @returns Charge data
 */
export async function chargeAuthorization(
  email: string,
  amount: number,
  authorizationCode: string
) {
  try {
    const charge = await paystack.transaction.charge({
      email,
      amount,
      authorization_code: authorizationCode,
    });
    return charge.data;
  } catch (error) {
    console.error('Error charging authorization:', error);
    throw new Error('Failed to charge card');
  }
}

/**
 * Generate a unique payment reference
 * @param prefix Optional prefix for the reference
 * @returns Unique reference string
 */
export function generateReference(prefix = 'OPIAN') {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `${prefix}_${timestamp}_${random}`;
}