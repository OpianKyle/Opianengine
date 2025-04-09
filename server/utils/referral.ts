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
 * @returns True if the code exists and belongs to an active user or agent
 */
export async function verifyReferralCode(code: string): Promise<boolean> {
  if (!code) return false;
  
  // Clean the code (remove any dashes)
  const cleanCode = code.replace(/-/g, '');
  
  console.log(`verifyReferralCode - Looking up code: ${cleanCode}`);
  
  const connection = await createConnection();
  try {
    // First try to find an agent with this code (for referral form use case)
    const [agentResults] = await connection.execute(
      'SELECT id FROM users WHERE referral_code = ? AND is_agent = 1 AND is_enabled = 1',
      [cleanCode]
    );
    
    // @ts-ignore - MySQL2 results structure
    if (Array.isArray(agentResults) && agentResults.length > 0) {
      console.log(`verifyReferralCode - Found valid agent with code ${cleanCode}`);
      return true;
    }
    
    // If no agent found, check if the code belongs to any active user
    // This is useful for the referral section where we just need to verify code validity
    const [userResults] = await connection.execute(
      'SELECT id FROM users WHERE referral_code = ? AND is_enabled = 1',
      [cleanCode]
    );
    
    // @ts-ignore - MySQL2 results structure
    const isValid = Array.isArray(userResults) && userResults.length > 0;
    console.log(`verifyReferralCode - Code ${cleanCode} belongs to a regular user and is ${isValid ? 'valid' : 'invalid'}`);
    return isValid;
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
  
  console.log(`getAgentByReferralCode - Looking up code: ${cleanCode}`);
  
  const connection = await createConnection();
  try {
    // For the referral form, we need a valid agent to receive the lead
    // For validation, priority goes to finding an actual agent with this code
    const [agentResults] = await connection.execute(
      'SELECT id, first_name, last_name, email, is_agent, is_enabled FROM users WHERE referral_code = ? AND is_agent = 1 AND is_enabled = 1',
      [cleanCode]
    );
    
    // @ts-ignore - MySQL2 results structure
    if (Array.isArray(agentResults) && agentResults.length > 0) {
      // @ts-ignore - MySQL2 results structure
      const agent = agentResults[0];
      
      console.log(`getAgentByReferralCode - Found agent:`, { 
        id: agent.id, 
        name: `${agent.first_name} ${agent.last_name}`, 
        isAgent: agent.is_agent, 
        isEnabled: agent.is_enabled 
      });
      
      return agent;
    }
    
    // If no agent found but we need to validate any user's referral code (for the referral section)
    // Check if the code belongs to any normal user
    const [userResults] = await connection.execute(
      'SELECT id, first_name, last_name, email, is_agent, is_enabled FROM users WHERE referral_code = ? AND is_enabled = 1',
      [cleanCode]
    );
    
    // @ts-ignore - MySQL2 results structure
    if (Array.isArray(userResults) && userResults.length > 0) {
      // @ts-ignore - MySQL2 results structure
      const user = userResults[0];
      
      console.log(`getAgentByReferralCode - Found regular user:`, { 
        id: user.id, 
        name: `${user.first_name} ${user.last_name}`, 
        isAgent: user.is_agent, 
        isEnabled: user.is_enabled 
      });
      
      // Return the user - for form submission this might not be ideal, 
      // but this ensures any valid referral code can be validated
      console.log(`getAgentByReferralCode - No agent found with this code, returning regular user`);
      return user;
    }
    
    console.log(`getAgentByReferralCode - No active user found with referral code: ${cleanCode}`);
    return null;
  } catch (error) {
    console.error('Error getting agent by referral code:', error);
    return null;
  } finally {
    await connection.end();
  }
}