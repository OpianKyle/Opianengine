import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility for combining class names with Tailwind
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Helper function to safely parse JSON
 */
export function safeParseJSON<T>(jsonString: string, fallback: T): T {
  try {
    return JSON.parse(jsonString) as T;
  } catch (error) {
    console.error('Failed to parse JSON:', error);
    return fallback;
  }
}

/**
 * Format a date string or timestamp to a localized date string
 */
export function formatDate(date: string | number | Date, options?: Intl.DateTimeFormatOptions): string {
  const dateObject = typeof date === 'string' || typeof date === 'number' 
    ? new Date(date) 
    : date;
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  return new Intl.DateTimeFormat('en-ZA', defaultOptions).format(dateObject);
}

/**
 * Format a number as currency
 */
export function formatCurrency(amount: number, currency = 'ZAR'): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format points with delimiter
 */
export function formatPoints(points: number): string {
  return new Intl.NumberFormat('en-ZA').format(points);
}

/**
 * Clean up WebSocket connections
 */
export function cleanupWebSockets(): void {
  // Close global WebSocket instance if it exists
  if ((window as any).__webSocketInstance) {
    try {
      (window as any).__webSocketInstance.close();
      (window as any).__webSocketInstance = null;
      console.log('WebSocket connection closed');
    } catch (err) {
      console.error('Error closing WebSocket:', err);
    }
  }
}

/**
 * Generate a random hex string of a given length
 */
export function randomHex(length: number): string {
  const characters = '0123456789abcdef';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  
  return result;
}

/**
 * Generate a unique ID with a prefix
 */
export function uniqueId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${randomHex(6)}`;
}

/**
 * Check if two dates are the same day
 */
export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

/**
 * Truncate a string to a given length and add ellipsis
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Delay execution for a specified time
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Deep clone an object
 */
export function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Format transaction type for display
 */
export function formatTransactionType(type: string): string {
  const typeMap: { [key: string]: string } = {
    'POINTS_AWARDED': 'Points Awarded',
    'POINTS_DEDUCTED': 'Points Deducted',
    'REFERRAL_BONUS': 'Referral Bonus',
    'COMMISSION': 'Commission',
    'SIGNUP_BONUS': 'Signup Bonus',
    'PRODUCT_PURCHASE': 'Product Purchase',
    'MANUAL_ADJUSTMENT': 'Manual Adjustment',
    'SYSTEM_ADJUSTMENT': 'System Adjustment',
    'REWARD_REDEMPTION': 'Reward Redemption',
    'ACCOUNT_CREDIT': 'Account Credit',
    'FUNDING': 'Account Funding',
    'FUNDING_FAILED': 'Failed Funding',
    'EARNED': 'Points Earned',
    'REDEEMED': 'Points Redeemed',
    'ADMIN_ADJUSTMENT': 'Admin Adjustment',
    'CASH_REDEMPTION': 'Cash Redemption',
    'WELCOME_BONUS': 'Welcome Bonus',
    'QUOTE_REQUEST': 'Quote Request',
    'AGENT_COMMISSION': 'Agent Commission'
  };
  
  return typeMap[type] || type.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}