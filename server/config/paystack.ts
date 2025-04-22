/**
 * Paystack Configuration
 * 
 * This file contains configuration settings for the Paystack integration.
 */

import { PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY } from '../env';

export const paystackConfig = {
  secretKey: PAYSTACK_SECRET_KEY,
  publicKey: PAYSTACK_PUBLIC_KEY || '',
  
  // Base URLs
  baseUrl: 'https://api.paystack.co',
  
  // Currency settings
  currency: 'ZAR', // South African Rand
  
  // Convert rand to the smallest currency unit (kobo/cents)
  // For ZAR - multiply by 100 to convert to cents
  convertAmountToLowestUnit: (amount: number): number => {
    return Math.round(amount * 100);
  },
  
  // Convert from the smallest unit back to the currency amount
  convertFromLowestUnit: (amount: number): number => {
    return amount / 100;
  },
  
  // Generate a reference with a specified prefix
  generateReference: (prefix: string = 'OPIAN'): string => {
    const timestamp = Date.now();
    const randomStr = Math.random().toString(36).substring(2, 10);
    return `${prefix}_${timestamp}_${randomStr}`;
  }
};