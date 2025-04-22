/**
 * Paystack Configuration
 * 
 * This file contains configuration settings for the Paystack integration.
 */

import { PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY } from '../env';

export const paystackConfig = {
  secretKey: PAYSTACK_SECRET_KEY,
  publicKey: PAYSTACK_PUBLIC_KEY,
  
  // Convert amount from lowest unit (kobo/cents) to main unit (rand)
  convertFromLowestUnit: (amount: number): number => {
    return amount / 100;
  },
  
  // Convert amount to lowest unit (kobo/cents) from main unit (rand)
  convertAmountToLowestUnit: (amount: number): number => {
    return Math.floor(amount * 100);
  },
  
  // List of available currencies
  currencies: ['ZAR', 'USD', 'NGN', 'GHS'],
  
  // Default currency
  defaultCurrency: 'ZAR',
  
  // Payment channels to enable
  channels: ['card', 'bank_transfer'],
  
  // Webhook settings
  webhook: {
    enabled: true,
    secret: process.env.PAYSTACK_WEBHOOK_SECRET || '',
  }
};