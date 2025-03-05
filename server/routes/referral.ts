import { Router } from 'express';
import { createConnection } from '../db';

const router = Router();

// Helper function to calculate commission percentages
const calculateCommission = (amount: number, level: number) => {
  const percentages = {
    1: 0.15, // 15% for level 1
    2: 0.10, // 10% for level 2
    3: 0.05, // 5% for level 3
  };
  return Math.floor(amount * percentages[level as keyof typeof percentages]);
};

router.get('/api/customer/referrals', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const connection = await createConnection();
  try {
    console.log('Fetching referrals for user:', req.user.id);

    // Get package premium amounts
    const [premiumAmounts] = await connection.execute(
      'SELECT package_type, premium_amount FROM package_premium_amounts'
    );

    const premiumMap = (premiumAmounts as any[]).reduce((acc, curr) => {
      acc[curr.package_type] = curr.premium_amount;
      return acc;
    }, {} as Record<string, number>);

    // Get user's referral code
    const [currentUser] = await connection.execute(
      'SELECT referral_code FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!currentUser || !(currentUser as any[])[0]?.referral_code) {
      return res.status(400).json({ error: "User has no referral code" });
    }

    const userInfo = (currentUser as any[])[0];

    // Initialize package statistics and commission details
    const packageStats = {
      level1: {} as Record<string, { count: number, commission: number }>,
      level2: {} as Record<string, { count: number, commission: number }>,
      level3: {} as Record<string, { count: number, commission: number }>
    };

    // Get direct referrals (Level 1)
    const [level1Referrals] = await connection.execute(
      `SELECT id, first_name, last_name, email, created_at, selected_package, referral_code
       FROM users 
       WHERE referred_by = ?
       ORDER BY created_at DESC`,
      [userInfo.referral_code]
    );

    // Calculate Level 1 stats and commissions
    let level1Amount = 0;
    const level1Count = (level1Referrals as any[]).length;

    (level1Referrals as any[]).forEach(referral => {
      if (referral.selected_package) {
        if (!packageStats.level1[referral.selected_package]) {
          packageStats.level1[referral.selected_package] = { count: 0, commission: 0 };
        }
        packageStats.level1[referral.selected_package].count++;

        if (premiumMap[referral.selected_package]) {
          const commission = calculateCommission(premiumMap[referral.selected_package], 1);
          packageStats.level1[referral.selected_package].commission += commission;
          level1Amount += commission;
        }
      }
    });

    // Get and calculate Level 2 referrals
    let level2Amount = 0;
    let level2Count = 0;
    const level2Referrals = [];

    for (const level1Ref of level1Referrals as any[]) {
      if (!level1Ref.referral_code) continue;

      const [level2Refs] = await connection.execute(
        `SELECT id, first_name, last_name, email, created_at, selected_package, referral_code
         FROM users 
         WHERE referred_by = ?
         ORDER BY created_at DESC`,
        [level1Ref.referral_code]
      );

      level2Count += (level2Refs as any[]).length;
      level2Referrals.push(...(level2Refs as any[]));

      (level2Refs as any[]).forEach(referral => {
        if (referral.selected_package) {
          if (!packageStats.level2[referral.selected_package]) {
            packageStats.level2[referral.selected_package] = { count: 0, commission: 0 };
          }
          packageStats.level2[referral.selected_package].count++;

          if (premiumMap[referral.selected_package]) {
            const commission = calculateCommission(premiumMap[referral.selected_package], 2);
            packageStats.level2[referral.selected_package].commission += commission;
            level2Amount += commission;
          }
        }
      });
    }

    // Get and calculate Level 3 referrals
    let level3Amount = 0;
    let level3Count = 0;
    const level3Referrals = [];

    for (const level2Ref of level2Referrals) {
      if (!level2Ref.referral_code) continue;

      const [level3Refs] = await connection.execute(
        `SELECT id, first_name, last_name, email, created_at, selected_package
         FROM users 
         WHERE referred_by = ?
         ORDER BY created_at DESC`,
        [level2Ref.referral_code]
      );

      level3Count += (level3Refs as any[]).length;
      level3Referrals.push(...(level3Refs as any[]));

      (level3Refs as any[]).forEach(referral => {
        if (referral.selected_package) {
          if (!packageStats.level3[referral.selected_package]) {
            packageStats.level3[referral.selected_package] = { count: 0, commission: 0 };
          }
          packageStats.level3[referral.selected_package].count++;

          if (premiumMap[referral.selected_package]) {
            const commission = calculateCommission(premiumMap[referral.selected_package], 3);
            packageStats.level3[referral.selected_package].commission += commission;
            level3Amount += commission;
          }
        }
      });
    }

    res.json({
      level1Count,
      level2Count,
      level3Count,
      referralCode: userInfo.referral_code,
      referrals: {
        level1: level1Referrals,
        level2: level2Referrals,
        level3: level3Referrals
      },
      packageStats,
      commission: {
        level1Amount,
        level2Amount,
        level3Amount,
        totalAmount: level1Amount + level2Amount + level3Amount
      }
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

    const connection = await createConnection();
    const [users] = await connection.execute(
      'SELECT id, is_enabled FROM users WHERE referral_code = ?',
      [code]
    );
    await connection.end();

    const referrer = (users as any[])[0];
    console.log('Referral verification result:', { isValid: !!referrer?.is_enabled });
    res.json({ isValid: !!referrer?.is_enabled });
  } catch (error) {
    console.error('Error verifying referral:', error);
    res.status(500).json({ error: 'Failed to verify referral code' });
  }
});

export default router;