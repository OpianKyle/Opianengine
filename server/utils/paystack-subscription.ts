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
 * Store subscription details including email token
 * This is important for later reactivation if needed
 */
export interface PaystackSubscriptionDetails {
  subscription_code: string;
  email_token: string;
  customer_code?: string;
  status?: string;
  next_payment_date?: string;
}

/**
 * Cancel a subscription
 */
export const cancelSubscription = async (subscriptionCode: string): Promise<boolean> => {
  try {
    // Make direct request to Paystack for cancellation
    const response = await createPaystackRequest('subscription/disable', 'POST', {
      code: subscriptionCode,
      token: 'cancel'  // This is the required token for cancellation
    });
    
    const responseData = await response.json();
    
    if (!response.ok || !responseData.status) {
      throw new Error(`Failed to cancel subscription: ${responseData.message}`);
    }
    
    console.log('Successfully cancelled Paystack subscription:', subscriptionCode);
    return true;
  } catch (error) {
    console.error('Error cancelling Paystack subscription:', error);
    throw error;
  }
};

/**
 * Reactivate a subscription
 * @param subscriptionCode The subscription code from Paystack
 * @param emailToken The email token associated with the subscription (required for enabling)
 */
export const reactivateSubscription = async (subscriptionCode: string, emailToken: string): Promise<boolean> => {
  try {
    // Make direct request to Paystack for subscription reactivation
    const response = await createPaystackRequest('subscription/enable', 'POST', {
      code: subscriptionCode,
      token: emailToken  // Email token is required for enabling subscriptions
    });
    
    const responseData = await response.json();
    
    if (!response.ok || !responseData.status) {
      throw new Error(`Failed to reactivate subscription: ${responseData.message}`);
    }
    
    console.log('Successfully reactivated Paystack subscription:', subscriptionCode);
    return true;
  } catch (error) {
    console.error('Error reactivating Paystack subscription:', error);
    throw error;
  }
};

/**
 * Get subscription details with email token
 * Returns subscription details including the important email_token field
 */
export const getSubscription = async (subscriptionCode: string): Promise<PaystackSubscriptionDetails> => {
  try {
    const response = await createPaystackRequest(`subscription/${subscriptionCode}`);
    const responseData = await response.json();
    
    if (!response.ok || !responseData.status) {
      throw new Error(`Failed to get subscription details: ${responseData.message}`);
    }
    
    const data = responseData.data;
    
    // Extract the key fields we need, especially the email_token
    const subscriptionDetails: PaystackSubscriptionDetails = {
      subscription_code: data.subscription_code,
      email_token: data.email_token || null,
      customer_code: data.customer?.customer_code,
      status: data.status,
      next_payment_date: data.next_payment_date
    };
    
    console.log(`Retrieved subscription details for ${subscriptionCode}:`, {
      status: subscriptionDetails.status,
      has_email_token: !!subscriptionDetails.email_token
    });
    
    // Return subscription details with key fields
    return subscriptionDetails;
    
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