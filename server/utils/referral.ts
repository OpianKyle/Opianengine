import { randomBytes } from 'crypto';
import { db } from '@db';
import { users } from '@db/schema';
import { eq } from 'drizzle-orm';

// Generate a unique referral code for agents
export async function generateUniqueReferralCode(userId: number): Promise<string> {
  const prefix = 'AG';
  let isUnique = false;
  let referralCode = '';
  
  while (!isUnique) {
    // Generate 6 random bytes and convert to hex
    const randomPart = randomBytes(3).toString('hex').toUpperCase();
    referralCode = `${prefix}${randomPart}`;
    
    // Check if code already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.referral_code, referralCode))
      .limit(1);
    
    if (!existingUser) {
      isUnique = true;
    }
  }
  
  // Update the user with the new referral code
  await db
    .update(users)
    .set({ referral_code: referralCode })
    .where(eq(users.id, userId));
  
  return referralCode;
}

// Verify if a referral code is valid and belongs to an active agent
export async function verifyReferralCode(code: string): Promise<boolean> {
  const [agent] = await db
    .select()
    .from(users)
    .where(eq(users.referral_code, code))
    .limit(1);
  
  return Boolean(agent && agent.isAgent && agent.isEnabled);
}

// Get agent details by referral code
export async function getAgentByReferralCode(code: string) {
  const [agent] = await db
    .select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      isEnabled: users.isEnabled,
    })
    .from(users)
    .where(eq(users.referral_code, code))
    .limit(1);
  
  return agent;
}
