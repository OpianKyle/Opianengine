import { Router } from 'express';
import { createConnection } from '../db';
import { db } from '@db';
import { users } from '@db/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

// Helper function to calculate commission for referrals
const calculateCommission = async (connection: any, packageType: string, level: number) => {
  // Get package amount from database
  const [prices] = await connection.execute(
    'SELECT premium_amount FROM package_premium_amounts WHERE package_type = ?',
    [packageType]
  );

  const packageAmount = prices.length > 0 ? Number(prices[0].premium_amount) : 0;
  console.log('Package price lookup:', { packageType, packageAmount });

  const percentages = {
    1: 0.15, // 15% for level 1
    2: 0.10, // 10% for level 2
    3: 0.05, // 5% for level 3
  };

  const commission = packageAmount * (percentages[level as keyof typeof percentages] || 0);
  console.log('Commission calculation:', { packageAmount, level, commission });

  return commission;
};

router.get('/api/customer/referral', async (req, res) => {
  if (!req.user?.id) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const connection = await createConnection();
  try {
    console.log('Fetching basic referral info for user:', req.user.id);

    // Get user's referral code and basic info
    const [userInfo] = await connection.execute(
      `SELECT referral_code FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!userInfo || !userInfo[0]) {
      console.log('User not found:', req.user.id);
      return res.status(404).json({ error: "User not found" });
    }

    const referralCode = userInfo[0].referral_code;
    console.log('Found referral code:', referralCode);

    // Get referral count and recent referrals
    const [referrals] = await connection.execute(
      `SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.created_at,
        u.selected_package,
        (SELECT COUNT(*) FROM users WHERE referred_by = ?) as referral_count
       FROM users u 
       WHERE u.referred_by = ?
       ORDER BY u.created_at DESC
       LIMIT 5`,
      [referralCode, referralCode]
    );

    console.log('Found referrals:', {
      count: referrals.length,
      referralCode: referralCode
    });

    res.json({
      referralCode: referralCode,
      referralCount: referrals[0]?.referral_count || 0,
      referrals: referrals.map((ref: any) => ({
        id: ref.id,
        firstName: ref.first_name,
        lastName: ref.last_name,
        createdAt: ref.created_at
      }))
    });

  } catch (error) {
    console.error('Error fetching referral data:', error);
    res.status(500).json({ error: 'Failed to fetch referral data' });
  } finally {
    await connection.end();
  }
});

router.get('/api/verify-referral/:code', async (req, res) => {
  try {
    const { code } = req.params;
    console.log('Verifying referral code:', code);

    const referrer = await db.query.users.findFirst({
      where: eq(users.referralCode, code),
      columns: {
        id: true,
        isEnabled: true,
      }
    });

    console.log('Referral verification result:', { isValid: !!referrer?.isEnabled });
    res.json({ isValid: !!referrer?.isEnabled });
  } catch (error) {
    console.error('Error verifying referral:', error);
    res.status(500).json({ error: 'Failed to verify referral code' });
  }
});

export default router;