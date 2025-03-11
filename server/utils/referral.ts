import { randomBytes } from 'crypto';
import { createConnection } from '../db';

export function generateReferralCode(): string {
  // Generate 6 random bytes and convert to hex
  const prefix = 'CUS'; // Customer prefix
  const randomPart = randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}${randomPart}`;
}

// Export other utility functions if needed
export function formatReferralCode(code: string): string {
  return code.toUpperCase();
}

// Verify if a referral code is valid and belongs to an active agent
export async function verifyReferralCode(code: string): Promise<boolean> {
  const connection = await createConnection();
  try {
    const [agents] = await connection.execute(
      'SELECT id, is_agent, is_enabled FROM users WHERE referral_code = ?',
      [code]
    );

    const agent = Array.isArray(agents) && agents.length > 0 ? agents[0] : null;
    return Boolean(agent && agent.is_agent && agent.is_enabled);
  } finally {
    await connection.end();
  }
}

// Get agent details by referral code
export async function getAgentByReferralCode(code: string) {
  const connection = await createConnection();
  try {
    const [agents] = await connection.execute(
      `SELECT id, first_name as firstName, last_name as lastName, 
       email, is_enabled as isEnabled
       FROM users 
       WHERE referral_code = ?`,
      [code]
    );

    return Array.isArray(agents) && agents.length > 0 ? agents[0] : null;
  } finally {
    await connection.end();
  }
}