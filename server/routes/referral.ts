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
    const referrer = await db.query.users.findFirst({
      where: eq(users.referralCode, code),
      columns: {
        id: true,
        isEnabled: true,
      }
    });
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
    // Get user's referral stats
    const [stats] = await db
      .select()
      .from(referralStats)
      .where(eq(referralStats.userId, req.user.id));

    // Get user's referral code
    const [currentUser] = await db
      .select({
        referralCode: users.referralCode
      })
      .from(users)
      .where(eq(users.id, req.user.id));

    // Get direct referrals with their package info
    const referrals = await db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        createdAt: users.createdAt,
        selectedPackage: users.selectedPackage,
        referralCode: users.referralCode, // Add this field
      })
      .from(users)
      .where(eq(users.referredBy, currentUser.referralCode));

    // Get current month's commissions
    const now = new Date();
    const [currentCommission] = await db
      .select()
      .from(referralCommissions)
      .where(
        and(
          eq(referralCommissions.userId, req.user.id),
          sql`DATE_TRUNC('month', ${referralCommissions.month}) = DATE_TRUNC('month', ${sql`NOW()`})`
        )
      );

    // Calculate commissions if not already calculated
    let monthlyCommission = currentCommission;
    if (!monthlyCommission) {
      const premiumAmounts = await db
        .select()
        .from(packagePremiumAmounts);

      const premiumMap = premiumAmounts.reduce((acc, curr) => {
        acc[curr.packageType] = curr.premiumAmount;
        return acc;
      }, {} as Record<string, number>);

      // Calculate commissions for each level
      let level1Amount = 0;
      let level2Amount = 0;
      let level3Amount = 0;

      // Level 1 calculations
      for (const referral of referrals) {
        if (referral.selectedPackage && premiumMap[referral.selectedPackage]) {
          level1Amount += calculateCommission(premiumMap[referral.selectedPackage], 1);
        }
      }

      // Level 2 calculations (referrals of referrals)
      for (const directRef of referrals) {
        if (!directRef.referralCode) continue;

        const level2Refs = await db
          .select({
            selectedPackage: users.selectedPackage
          })
          .from(users)
          .where(eq(users.referredBy, directRef.referralCode));

        for (const ref of level2Refs) {
          if (ref.selectedPackage && premiumMap[ref.selectedPackage]) {
            level2Amount += calculateCommission(premiumMap[ref.selectedPackage], 2);
          }
        }
      }

      // Level 3 calculations
      for (const directRef of referrals) {
        if (!directRef.referralCode) continue;

        const level2Refs = await db
          .select({
            referralCode: users.referralCode
          })
          .from(users)
          .where(eq(users.referredBy, directRef.referralCode));

        for (const level2Ref of level2Refs) {
          if (!level2Ref.referralCode) continue;

          const level3Refs = await db
            .select({
              selectedPackage: users.selectedPackage
            })
            .from(users)
            .where(eq(users.referredBy, level2Ref.referralCode));

          for (const ref of level3Refs) {
            if (ref.selectedPackage && premiumMap[ref.selectedPackage]) {
              level3Amount += calculateCommission(premiumMap[ref.selectedPackage], 3);
            }
          }
        }
      }

      // Save the commission calculations
      const [newCommission] = await db
        .insert(referralCommissions)
        .values({
          userId: req.user.id,
          month: now,
          level1Amount,
          level2Amount,
          level3Amount,
          totalAmount: level1Amount + level2Amount + level3Amount,
        })
        .returning();

      monthlyCommission = newCommission;
    }

    res.json({
      level1Count: stats?.level1Count || 0,
      level2Count: stats?.level2Count || 0,
      level3Count: stats?.level3Count || 0,
      referralCode: currentUser.referralCode,
      referrals,
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