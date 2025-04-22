/**
 * Paystack Subscription Utilities
 * 
 * This file contains utility functions for managing subscriptions using Paystack.
 */

import { PAYSTACK_SECRET_KEY } from '../env';
import { createPaystackRequest } from './paystack';
import type { User } from '../../db/schema';

interface PaystackSubscriptionRequestBody {
  customer: string;
  plan: string;
  authorization?: string;
  start_date?: string;
  metadata?: any;
}

interface PaystackSubscriptionResponse {
  status: boolean;
  message: string;
  data: {
    customer: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      customer_code: string;
    };
    plan: {
      id: number;
      name: string;
      amount: number;
      interval: string;
    };
    integration: number;
    authorization: {
      authorization_code: string;
      bin: string;
      last4: string;
      exp_month: string;
      exp_year: string;
      channel: string;
      card_type: string;
      bank: string;
      country_code: string;
      brand: string;
      reusable: boolean;
      signature: string;
      account_name: string;
    },
    domain: string;
    start_date: string;
    next_payment_date: string;
    status: string;
    subscription_code: string;
    email_token: string;
    id: number;
    createdAt: string;
    updatedAt: string;
  };
}

interface PaystackPlanResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    name: string;
    plan_code: string;
    description: string;
    amount: number;
    interval: string;
    send_invoices: boolean;
    send_sms: boolean;
    currency: string;
  };
}

/**
 * Create a plan on Paystack
 * Each plan corresponds to a package type
 */
export const createPlan = async (
  name: string,
  amount: number,
  interval: string = 'monthly',
  description?: string
): Promise<PaystackPlanResponse['data']> => {
  try {
    const response = await createPaystackRequest('plan', 'POST', {
      name,
      amount: Math.round(amount * 100), // Convert to lowest unit (cents/kobo)
      interval,
      description: description || `${name} Package Subscription`,
      currency: 'ZAR'
    });
    
    const responseData = await response.json() as PaystackPlanResponse;
    
    if (!response.ok || !responseData.status) {
      throw new Error(`Failed to create plan: ${responseData.message}`);
    }
    
    return responseData.data;
    
  } catch (error) {
    console.error('Error creating Paystack plan:', error);
    throw error;
  }
};

/**
 * Get or create a plan on Paystack
 */
export const getOrCreatePlan = async (
  name: string,
  amount: number,
  interval: string = 'monthly'
): Promise<PaystackPlanResponse['data']> => {
  try {
    // First check if plan exists with the given name
    const plansResponse = await createPaystackRequest(`plan?name=${encodeURIComponent(name)}`);
    const plansData = await plansResponse.json();
    
    if (plansResponse.ok && plansData.status && plansData.data && plansData.data.length > 0) {
      return plansData.data[0];
    }
    
    // Create new plan if not found
    return await createPlan(name, amount, interval);
    
  } catch (error) {
    console.error('Error getting or creating Paystack plan:', error);
    throw error;
  }
};

/**
 * Initialize a subscription
 */
export const createSubscription = async (
  customerCode: string,
  planCode: string,
  metadata: any = {}
): Promise<PaystackSubscriptionResponse['data']> => {
  try {
    const requestBody: PaystackSubscriptionRequestBody = {
      customer: customerCode,
      plan: planCode,
      metadata
    };
    
    const response = await createPaystackRequest('subscription', 'POST', requestBody);
    const responseData = await response.json() as PaystackSubscriptionResponse;
    
    if (!response.ok || !responseData.status) {
      throw new Error(`Failed to create subscription: ${responseData.message}`);
    }
    
    return responseData.data;
    
  } catch (error) {
    console.error('Error creating Paystack subscription:', error);
    throw error;
  }
};

/**
 * Enable or disable a subscription
 */
export const updateSubscriptionStatus = async (
  subscriptionCode: string,
  action: 'enable' | 'disable'
): Promise<boolean> => {
  try {
    const response = await createPaystackRequest(`subscription/${action}`, 'POST', {
      code: subscriptionCode,
      token: subscriptionCode
    });
    
    const responseData = await response.json();
    
    if (!response.ok || !responseData.status) {
      throw new Error(`Failed to ${action} subscription: ${responseData.message}`);
    }
    
    return true;
    
  } catch (error) {
    console.error(`Error ${action}ing Paystack subscription:`, error);
    throw error;
  }
};

/**
 * Cancel a subscription
 */
export const cancelSubscription = async (subscriptionCode: string): Promise<boolean> => {
  return await updateSubscriptionStatus(subscriptionCode, 'disable');
};

/**
 * Reactivate a subscription
 */
export const reactivateSubscription = async (subscriptionCode: string): Promise<boolean> => {
  return await updateSubscriptionStatus(subscriptionCode, 'enable');
};

/**
 * Get subscription details
 */
export const getSubscription = async (subscriptionCode: string): Promise<any> => {
  try {
    const response = await createPaystackRequest(`subscription/${subscriptionCode}`);
    const responseData = await response.json();
    
    if (!response.ok || !responseData.status) {
      throw new Error(`Failed to get subscription details: ${responseData.message}`);
    }
    
    return responseData.data;
    
  } catch (error) {
    console.error('Error fetching Paystack subscription details:', error);
    throw error;
  }
};

/**
 * List all subscriptions for a customer
 */
export const listCustomerSubscriptions = async (customerEmail: string): Promise<any[]> => {
  try {
    const response = await createPaystackRequest(`subscription?customer=${encodeURIComponent(customerEmail)}`);
    const responseData = await response.json();
    
    if (!response.ok || !responseData.status) {
      throw new Error(`Failed to list customer subscriptions: ${responseData.message}`);
    }
    
    return responseData.data || [];
    
  } catch (error) {
    console.error('Error listing Paystack customer subscriptions:', error);
    throw error;
  }
};