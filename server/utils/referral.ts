import { createConnection } from '../db';
import { randomBytes } from 'crypto';

/**
 * Generate a random referral code of specified length
 * @param length The length of the referral code
 * @returns A random alphanumeric referral code
 */
export function generateReferralCode(length: number = 8): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const randomBytesBuffer = randomBytes(length);
  
  for (let i = 0; i < length; i++) {
    const randomIndex = randomBytesBuffer.readUInt8(i) % chars.length;
    result += chars.charAt(randomIndex);
  }
  
  return result;
}

/**
 * Format a referral code with dashes for better readability
 * @param code The raw referral code
 * @returns The formatted referral code
 */
export function formatReferralCode(code: string): string {
  if (!code) return '';
  
  // Clean the code first (remove any existing dashes)
  const cleanCode = code.replace(/-/g, '');
  
  // If the code length is 8, format it as XXXX-XXXX
  if (cleanCode.length === 8) {
    return `${cleanCode.substring(0, 4)}-${cleanCode.substring(4)}`;
  }
  
  // Otherwise return as is
  return cleanCode;
}

/**
 * Verify if a referral code exists in the database
 * @param code The referral code to verify
 * @returns True if the code exists and belongs to an active agent
 */
export async function verifyReferralCode(code: string): Promise<boolean> {
  if (!code) return false;
  
  // Clean the code (remove any dashes)
  const cleanCode = code.replace(/-/g, '');
  
  const connection = await createConnection();
  try {
    const [results] = await connection.execute(
      'SELECT id FROM users WHERE referral_code = ? AND is_agent = 1 AND is_enabled = 1',
      [cleanCode]
    );
    
    // @ts-ignore - MySQL2 results structure
    return Array.isArray(results) && results.length > 0;
  } catch (error) {
    console.error('Error verifying referral code:', error);
    return false;
  } finally {
    await connection.end();
  }
}

/**
 * Get the agent associated with a referral code
 * @param code The referral code
 * @returns The agent data if found, null otherwise
 */
export async function getAgentByReferralCode(code: string) {
  if (!code) return null;
  
  // Clean the code (remove any dashes)
  const cleanCode = code.replace(/-/g, '');
  
  const connection = await createConnection();
  try {
    const [results] = await connection.execute(
      'SELECT id, first_name, last_name, email FROM users WHERE referral_code = ? AND is_agent = 1 AND is_enabled = 1',
      [cleanCode]
    );
    
    // @ts-ignore - MySQL2 results structure
    if (!Array.isArray(results) || results.length === 0) {
      return null;
    }
    
    // @ts-ignore - MySQL2 results structure
    return results[0];
  } catch (error) {
    console.error('Error getting agent by referral code:', error);
    return null;
  } finally {
    await connection.end();
  }
}