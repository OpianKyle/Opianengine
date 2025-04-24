/**
 * Paystack API Integration
 * 
 * This module provides functions to interact with the Paystack API for subscription management.
 * It includes functionality for:
 * - Initializing transactions (creating payment links)
 * - Verifying transactions
 * - Creating and managing subscriptions
 * - Fetching subscription details
 */
import fetch from 'node-fetch';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Ensure Paystack API key is available
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
if (!PAYSTACK_SECRET_KEY) {
  console.error('PAYSTACK_SECRET_KEY environment variable is not set');
}

// Paystack API base URL
const PAYSTACK_API_BASE_URL = 'https://api.paystack.co';

// Subscription plan codes for different packages
export const PLAN_CODES = {
  OPPORTUNITY: 'PLN_7rg5r8lccr2ktz9',
  MOMENTUM: 'PLN_2mjxxdt7fj7f5o9',
  PROSPER: 'PLN_o4bi1wvqelq23gl',
  PRESTIGE: 'PLN_3n9yxx3dhh8vk35',
  PINNACLE: 'PLN_jgyvlidtjx592oq'
};

/**
 * Make a request to the Paystack API
 * @param endpoint - API endpoint path (without base URL)
 * @param method - HTTP method (GET, POST, PUT)
 * @param data - Request payload for POST/PUT methods
 * @returns Promise with the response data
 */
async function makePaystackRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' = 'GET', data?: any) {
  try {
    const url = `${PAYSTACK_API_BASE_URL}${endpoint}`;
    
    const options: any = {
      method,
      headers: {
        'Authorization': `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    };
    
    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }
    
    const response = await fetch(url, options);
    const responseData = await response.json() as any;
    
    if (!response.ok) {
      throw new Error(responseData.message || 'Paystack API request failed');
    }
    
    return responseData.data;
  } catch (error) {
    console.error('Paystack API error:', error);
    throw error;
  }
}

/**
 * Initialize a transaction to get a payment URL
 * @param email - Customer email
 * @param amount - Amount in Kobo/Cents (multiply Rand by 100)
 * @param metadata - Additional transaction metadata
 * @param callbackUrl - URL to redirect after payment
 * @returns Transaction initialization data including authorization URL
 */
export async function initializeTransaction(email: string, amount: number, metadata: any = {}, callbackUrl?: string) {
  const data = {
    email,
    amount: Math.floor(amount), // Ensure amount is an integer (in kobo/cents)
    metadata,
    callback_url: callbackUrl
  };
  
  return makePaystackRequest('/transaction/initialize', 'POST', data);
}

/**
 * Verify a transaction using the reference
 * @param reference - Transaction reference
 * @returns Transaction verification data
 */
export async function verifyTransaction(reference: string) {
  return makePaystackRequest(`/transaction/verify/${reference}`);
}

/**
 * Create a subscription for a customer
 * @param customerEmail - Customer email address
 * @param planCode - Subscription plan code
 * @param metadata - Additional subscription metadata
 * @returns Subscription creation data
 */
export async function createSubscription(customerEmail: string, planCode: string, metadata: any = {}) {
  // Create or fetch customer first
  const customers = await makePaystackRequest(`/customer?email=${encodeURIComponent(customerEmail)}`);
  
  let customerId: string;
  
  if (customers && customers.length > 0) {
    customerId = customers[0].id;
  } else {
    // Create the customer
    const newCustomer = await createCustomer(customerEmail);
    customerId = newCustomer.id;
  }
  
  // Create the subscription
  const data = {
    customer: customerId,
    plan: planCode,
    metadata
  };
  
  return makePaystackRequest('/subscription', 'POST', data);
}

/**
 * Create a customer in Paystack
 * @param email - Customer email address
 * @param firstName - Customer first name (optional)
 * @param lastName - Customer last name (optional)
 * @returns Customer data
 */
export async function createCustomer(email: string, firstName?: string, lastName?: string) {
  const data: any = { email };
  
  if (firstName) data.first_name = firstName;
  if (lastName) data.last_name = lastName;
  
  return makePaystackRequest('/customer', 'POST', data);
}

/**
 * Fetch subscription details
 * @param subscriptionCode - Subscription code
 * @returns Subscription details
 */
export async function getSubscription(subscriptionCode: string) {
  const response = await makePaystackRequest(`/subscription/${subscriptionCode}`);
  return response;
}

/**
 * List all subscriptions for a customer
 * @param customerEmail - Customer email address
 * @returns List of customer subscriptions
 */
export async function listCustomerSubscriptions(customerEmail: string) {
  return makePaystackRequest(`/subscription?customer=${encodeURIComponent(customerEmail)}`);
}

/**
 * Enable or disable a subscription (activate/deactivate)
 * @param subscriptionCode - Subscription code
 * @param activate - Whether to enable or disable the subscription
 * @returns Operation result
 */
export async function updateSubscriptionStatus(subscriptionCode: string, activate: boolean = true) {
  const data = {
    code: subscriptionCode,
    token: '' // Required by the API but not used for this operation
  };
  
  return makePaystackRequest(
    activate ? '/subscription/enable' : '/subscription/disable',
    'POST',
    data
  );
}

/**
 * Generate a subscription update link for the customer
 * @param subscriptionCode - Subscription code
 * @returns Update link data
 */
export async function generateUpdateLink(subscriptionCode: string) {
  const data = {
    code: subscriptionCode
  };
  
  return makePaystackRequest('/subscription/manage/link', 'POST', data);
}

/**
 * Get the plan details from Paystack
 * @param planCode - Plan code
 * @returns Plan details
 */
export async function getPlan(planCode: string) {
  return makePaystackRequest(`/plan/${planCode}`);
}

/**
 * List all plans
 * @returns List of plans
 */
export async function listPlans() {
  return makePaystackRequest('/plan');
}