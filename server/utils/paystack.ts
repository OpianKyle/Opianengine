/**
 * Paystack API Utilities
 * 
 * This file contains utility functions for interacting with the Paystack API.
 */

import { PAYSTACK_SECRET_KEY } from '../env';
import type { User } from '../../db/schema';

interface Customer {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

interface PaystackCreateCustomerResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    customer_code: string;
  };
}

interface PaystackTransactionResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url: string;
    access_code: string;
    reference: string;
  };
}

interface PaystackVerificationResponse {
  status: boolean;
  message: string;
  data: {
    id: number;
    status: string;
    reference: string;
    amount: number;
    channel: string;
    currency: string;
    paid_at: string;
    metadata: any;
    message?: string;
  };
}

/**
 * Create a Paystack API request with proper headers
 */
export const createPaystackRequest = (path: string, method: string = 'GET', body: any = null) => {
  const url = `https://api.paystack.co/${path}`;
  
  const headers = {
    Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
    'Content-Type': 'application/json'
  };
  
  const requestOptions: RequestInit = {
    method,
    headers
  };
  
  if (body && (method === 'POST' || method === 'PUT')) {
    requestOptions.body = JSON.stringify(body);
  }
  
  return fetch(url, requestOptions);
};

/**
 * Create a new customer in Paystack or get existing customer
 */
export const createOrGetCustomer = async (user: Customer): Promise<PaystackCreateCustomerResponse['data']> => {
  try {
    // First check if customer exists
    const checkCustomerResponse = await createPaystackRequest(`customer/${user.email}`);
    const checkCustomerData = await checkCustomerResponse.json();
    
    if (checkCustomerResponse.ok && checkCustomerData.status) {
      console.log('Existing Paystack customer found:', checkCustomerData.data.customer_code);
      return checkCustomerData.data;
    }
    
    // Create new customer if doesn't exist
    const createCustomerResponse = await createPaystackRequest('customer', 'POST', {
      email: user.email,
      first_name: user.firstName,
      last_name: user.lastName,
      phone: user.phoneNumber,
      metadata: {
        user_id: user.id
      }
    });
    
    const createCustomerData = await createCustomerResponse.json() as PaystackCreateCustomerResponse;
    
    if (!createCustomerResponse.ok || !createCustomerData.status) {
      throw new Error(`Failed to create customer: ${createCustomerData.message}`);
    }
    
    console.log('New Paystack customer created:', createCustomerData.data.customer_code);
    return createCustomerData.data;
    
  } catch (error) {
    console.error('Error creating/getting Paystack customer:', error);
    throw error;
  }
};

/**
 * Create a new customer in Paystack or get existing customer by email
 * Simplified version that accepts email and name fields directly
 */
export const getOrCreateCustomer = async (
  email: string, 
  customerData?: { 
    first_name?: string; 
    last_name?: string; 
    phone?: string;
  }
): Promise<PaystackCreateCustomerResponse['data']> => {
  try {
    // First check if customer exists
    const checkCustomerResponse = await createPaystackRequest(`customer/${email}`);
    const checkCustomerData = await checkCustomerResponse.json();
    
    if (checkCustomerResponse.ok && checkCustomerData.status) {
      console.log('Existing Paystack customer found:', checkCustomerData.data.customer_code);
      return checkCustomerData.data;
    }
    
    // Create new customer if doesn't exist
    const createCustomerResponse = await createPaystackRequest('customer', 'POST', {
      email,
      first_name: customerData?.first_name || '',
      last_name: customerData?.last_name || '',
      phone: customerData?.phone || ''
    });
    
    const createCustomerData = await createCustomerResponse.json() as PaystackCreateCustomerResponse;
    
    if (!createCustomerResponse.ok || !createCustomerData.status) {
      throw new Error(`Failed to create customer: ${createCustomerData.message}`);
    }
    
    console.log('New Paystack customer created:', createCustomerData.data.customer_code);
    return createCustomerData.data;
    
  } catch (error) {
    console.error('Error creating/getting Paystack customer:', error);
    throw error;
  }
};

/**
 * Interface for Paystack Subscription API response
 */
interface PaystackSubscriptionResponse {
  status: boolean;
  message: string;
  data: {
    customer: any;
    plan: any;
    integration: number;
    domain: string;
    start_date: string;
    status: string;
    quantity: number;
    amount: number;
    authorization: any;
    subscription_code: string;
    email_token: string;
    id: number;
    next_payment_date: string;
    cancelledAt: string | null;
  };
}

/**
 * Create a subscription directly with Paystack
 */
export const createSubscription = async (
  customerCode: string,
  planCode: string,
  metadata: any = {},
  startDate?: string
): Promise<any> => {
  try {
    console.log(`Creating Paystack subscription: customer=${customerCode}, plan=${planCode}`);
    
    const payload: any = {
      customer: customerCode,
      plan: planCode,
      metadata
    };
    
    // Add start date if provided (allows for future subscription starts)
    if (startDate) {
      payload.start_date = startDate;
    }
    
    const response = await createPaystackRequest('subscription', 'POST', payload);
    const data = await response.json();
    
    if (!response.ok || !data.status) {
      throw new Error(`Failed to create subscription: ${data.message}`);
    }
    
    console.log('Subscription created successfully:', data.data.subscription_code);
    return data.data;
  } catch (error) {
    console.error('Error creating Paystack subscription:', error);
    throw error;
  }
};

/**
 * Initialize a payment transaction
 */
export const initializeTransaction = async (
  amount: number, 
  email: string, 
  reference: string, 
  metadata: any = {}
): Promise<PaystackTransactionResponse['data']> => {
  try {
    console.log('Setting up Paystack callback URL...');
    
    // Dynamically determine current domain from request headers if available
    let baseUrl: string;
    
    // Check if we're running in development mode (Replit with random subdomain)
    if (process.env.NODE_ENV === 'development' || process.env.REPLIT_SLUG) {
      // Use dynamic detection, REPLIT_SLUG may contain domain information
      baseUrl = process.env.CURRENT_DOMAIN || 'https://janeway.replit.dev';
    } else {
      // Use specified production URL
      baseUrl = process.env.APP_URL || 'https://opian.replit.app';
    }
    
    const callbackUrl = `${baseUrl}/api/payment/callback`;
    
    console.log('Using callback URL:', callbackUrl);
    
    // Check if this is a subscription payment with a plan_code
    const isSubscription = metadata && metadata.plan_code;
    
    if (isSubscription) {
      console.log('Initializing SUBSCRIPTION payment with plan code:', metadata.plan_code);
      
      try {
        // Create customer first if it's a subscription
        const customer = await getOrCreateCustomer(email, {
          first_name: metadata.first_name || '',
          last_name: metadata.last_name || '',
          phone: metadata.phone || ''
        });
        
        console.log('Customer for subscription:', customer.customer_code);
        
        // Store customer code in metadata for later use
        metadata.customer_code = customer.customer_code;
        
        // Create a one-time payment that will later be connected to the subscription
        const response = await createPaystackRequest('transaction/initialize', 'POST', {
          email,
          amount,
          reference,
          callback_url: callbackUrl,
          metadata,
          plan: metadata.plan_code
        });
        
        const responseData = await response.json() as PaystackTransactionResponse;
        
        if (!response.ok || !responseData.status) {
          throw new Error(`Failed to initialize subscription payment: ${responseData.message}`);
        }
        
        console.log('Subscription payment initialized successfully');
        
        // After successful payment initialization, also try to create the subscription directly
        try {
          // This runs in the background, we don't wait for it
          createSubscription(customer.customer_code, metadata.plan_code, {
            ...metadata,
            payment_reference: reference
          }).then(subscription => {
            console.log('Subscription also created directly:', subscription);
          }).catch(err => {
            console.warn('Failed to create direct subscription, will retry after payment:', err.message);
          });
        } catch (subscriptionError) {
          console.error('Error creating direct subscription:', subscriptionError);
          // We continue anyway as we'll create the subscription after payment verification
        }
        
        return responseData.data;
      } catch (error) {
        console.error('Error in subscription flow:', error);
        throw error;
      }
    } else {
      // Regular one-time payment
      console.log('Initializing ONE-TIME payment');
      
      const response = await createPaystackRequest('transaction/initialize', 'POST', {
        amount,
        email,
        reference,
        callback_url: callbackUrl,
        metadata
      });
      
      const responseData = await response.json() as PaystackTransactionResponse;
      
      if (!response.ok || !responseData.status) {
        throw new Error(`Failed to initialize transaction: ${responseData.message}`);
      }
      
      console.log('One-time payment initialized successfully');
      return responseData.data;
    }
    
  } catch (error) {
    console.error('Error initializing Paystack transaction:', error);
    throw error;
  }
};

/**
 * Verify a transaction
 */
export const verifyTransaction = async (reference: string): Promise<PaystackVerificationResponse['data']> => {
  try {
    const response = await createPaystackRequest(`transaction/verify/${reference}`);
    const responseData = await response.json() as PaystackVerificationResponse;
    
    if (!response.ok) {
      throw new Error(`Failed to verify transaction: ${responseData.message}`);
    }
    
    return responseData.data;
    
  } catch (error) {
    console.error('Error verifying Paystack transaction:', error);
    throw error;
  }
};

/**
 * List transactions for a customer
 */
export const listCustomerTransactions = async (customerEmail: string) => {
  try {
    const response = await createPaystackRequest(`transaction?customer=${encodeURIComponent(customerEmail)}`);
    const responseData = await response.json();
    
    if (!response.ok || !responseData.status) {
      throw new Error(`Failed to list customer transactions: ${responseData.message}`);
    }
    
    return responseData.data;
    
  } catch (error) {
    console.error('Error listing customer transactions:', error);
    throw error;
  }
};

/**
 * Generate a unique reference for transactions
 */
export const generateReference = (): string => {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  return `opian_${timestamp}_${random}`;
};