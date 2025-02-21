import { Router } from 'express';
import { db } from '@db';
import { users, referralStats, referralCommissions, packagePremiumAmounts } from '@db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { startOfMonth, endOfMonth } from 'date-fns';

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

router.get('/api/customer/referrals', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    console.log('Fetching referrals for user:', req.user.id);

    // Get current month's date range and premium amounts
    const currentDate = new Date();
    const startOfCurrentMonth = startOfMonth(currentDate);
    const endOfCurrentMonth = endOfMonth(currentDate);

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

    console.log('Found referral code:', currentUser.referralCode);

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

    console.log('Found level 1 referrals:', level1Referrals.length);

    // Calculate Level 1 commissions
    let level1Amount = 0;
    const level1Count = level1Referrals.length;
    for (const referral of level1Referrals) {
      if (referral.selectedPackage && premiumMap[referral.selectedPackage]) {
        level1Amount += calculateCommission(premiumMap[referral.selectedPackage], 1);
      }
    }

    // Calculate Level 2 commissions
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

      for (const ref of level2Refs) {
        if (ref.selectedPackage && premiumMap[ref.selectedPackage]) {
          level2Amount += calculateCommission(premiumMap[ref.selectedPackage], 2);
        }
      }
    }

    // Calculate Level 3 commissions
    let level3Amount = 0;
    let level3Count = 0;
    const level3Referrals = [];
    for (const level2Ref of level2Referrals) { //Corrected loop to iterate through level2Referrals
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

      for (const ref of level3Refs) {
        if (ref.selectedPackage && premiumMap[ref.selectedPackage]) {
          level3Amount += calculateCommission(premiumMap[ref.selectedPackage], 3);
        }
      }
    }

    // Update referral stats
    await db.insert(referralStats)
      .values({
        userId: req.user.id,
        level1Count,
        level2Count,
        level3Count,
        updatedAt: currentDate
      })
      .onConflictDoUpdate({
        target: [referralStats.userId],
        set: {
          level1Count,
          level2Count,
          level3Count,
          updatedAt: currentDate
        }
      });

    // Update or create monthly commission record
    const [monthlyCommission] = await db
      .insert(referralCommissions)
      .values({
        userId: req.user.id,
        month: currentDate,
        level1Amount,
        level2Amount,
        level3Amount,
        totalAmount: level1Amount + level2Amount + level3Amount,
        isPaid: false
      })
      .onConflictDoUpdate({
        target: [
          referralCommissions.userId,
          referralCommissions.month
        ],
        set: {
          level1Amount,
          level2Amount,
          level3Amount,
          totalAmount: level1Amount + level2Amount + level3Amount,
          updatedAt: currentDate
        }
      })
      .returning();

    console.log('Sending response with:', {
      referralCounts: { level1Count, level2Count, level3Count },
      commissionAmounts: { level1Amount, level2Amount, level3Amount }
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
      commission: {
        level1Amount: monthlyCommission.level1Amount,
        level2Amount: monthlyCommission.level2Amount,
        level3Amount: monthlyCommission.level3Amount,
        totalAmount: monthlyCommission.totalAmount,
        isPaid: monthlyCommission.isPaid,
      }
    });
  } catch (error) {
    console.error('Error fetching referral data:', error);
    res.status(500).json({ error: 'Failed to fetch referral data' });
  }
});

export default router;