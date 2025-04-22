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
 * Initialize a payment transaction
 */
export const initializeTransaction = async (
  amount: number, 
  email: string, 
  reference: string, 
  metadata: any = {}
): Promise<PaystackTransactionResponse['data']> => {
  try {
    const response = await createPaystackRequest('transaction/initialize', 'POST', {
      amount,
      email,
      reference,
      callback_url: `${process.env.APP_URL || 'https://opian.replit.app'}/profile/subscription`,
      metadata
    });
    
    const responseData = await response.json() as PaystackTransactionResponse;
    
    if (!response.ok || !responseData.status) {
      throw new Error(`Failed to initialize transaction: ${responseData.message}`);
    }
    
    return responseData.data;
    
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