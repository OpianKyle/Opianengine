import { Router } from 'express';
import { db } from '@db';
import { users, packagePremiumAmounts } from '@db/schema';
import { eq, and, desc } from 'drizzle-orm';

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

  try {
    console.log('Fetching referrals for user:', req.user.id);

    // Get package premium amounts
    const premiumAmounts = await db
      .select()
      .from(packagePremiumAmounts);

    const premiumMap = premiumAmounts.reduce((acc, curr) => {
      acc[curr.packageType] = curr.premiumAmount;
      return acc;
    }, {} as Record<string, number>);

    // Get user's referral code
    const [currentUser] = await db
      .select({
        referralCode: users.referralCode
      })
      .from(users)
      .where(eq(users.id, req.user.id));

    if (!currentUser?.referralCode) {
      return res.status(400).json({ error: "User has no referral code" });
    }

    // Initialize package statistics and commission details
    const packageStats = {
      level1: {} as Record<string, { count: number, commission: number }>,
      level2: {} as Record<string, { count: number, commission: number }>,
      level3: {} as Record<string, { count: number, commission: number }>
    };

    // Get direct referrals (Level 1)
    const level1Referrals = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        createdAt: users.createdAt,
        selectedPackage: users.selectedPackage,
        referralCode: users.referralCode
      })
      .from(users)
      .where(eq(users.referredBy, currentUser.referralCode))
      .orderBy(desc(users.createdAt));

    // Calculate Level 1 stats and commissions
    let level1Amount = 0;
    const level1Count = level1Referrals.length;

    level1Referrals.forEach(referral => {
      if (referral.selectedPackage) {
        if (!packageStats.level1[referral.selectedPackage]) {
          packageStats.level1[referral.selectedPackage] = { count: 0, commission: 0 };
        }
        packageStats.level1[referral.selectedPackage].count++;

        if (premiumMap[referral.selectedPackage]) {
          const commission = calculateCommission(premiumMap[referral.selectedPackage], 1);
          packageStats.level1[referral.selectedPackage].commission += commission;
          level1Amount += commission;
        }
      }
    });

    // Get and calculate Level 2 referrals
    let level2Amount = 0;
    let level2Count = 0;
    const level2Referrals = [];

    for (const level1Ref of level1Referrals) {
      if (!level1Ref.referralCode) continue;

      const level2Refs = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          createdAt: users.createdAt,
          selectedPackage: users.selectedPackage,
          referralCode: users.referralCode
        })
        .from(users)
        .where(eq(users.referredBy, level1Ref.referralCode))
        .orderBy(desc(users.createdAt));

      level2Count += level2Refs.length;
      level2Referrals.push(...level2Refs);

      level2Refs.forEach(referral => {
        if (referral.selectedPackage) {
          if (!packageStats.level2[referral.selectedPackage]) {
            packageStats.level2[referral.selectedPackage] = { count: 0, commission: 0 };
          }
          packageStats.level2[referral.selectedPackage].count++;

          if (premiumMap[referral.selectedPackage]) {
            const commission = calculateCommission(premiumMap[referral.selectedPackage], 2);
            packageStats.level2[referral.selectedPackage].commission += commission;
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
      if (!level2Ref.referralCode) continue;

      const level3Refs = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          createdAt: users.createdAt,
          selectedPackage: users.selectedPackage
        })
        .from(users)
        .where(eq(users.referredBy, level2Ref.referralCode))
        .orderBy(desc(users.createdAt));

      level3Count += level3Refs.length;
      level3Referrals.push(...level3Refs);

      level3Refs.forEach(referral => {
        if (referral.selectedPackage) {
          if (!packageStats.level3[referral.selectedPackage]) {
            packageStats.level3[referral.selectedPackage] = { count: 0, commission: 0 };
          }
          packageStats.level3[referral.selectedPackage].count++;

          if (premiumMap[referral.selectedPackage]) {
            const commission = calculateCommission(premiumMap[referral.selectedPackage], 3);
            packageStats.level3[referral.selectedPackage].commission += commission;
            level3Amount += commission;
          }
        }
      });
    }

    console.log('Sending response with:', {
      referralCounts: { level1Count, level2Count, level3Count },
      commissionAmounts: { level1Amount, level2Amount, level3Amount },
      packageStats
    });

    res.json({
      level1Count,
      level2Count,
      level3Count,
      referralCode: currentUser.referralCode,
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