import { Router } from 'express';
import { createConnection } from '../db';
import { db } from '@db';
import { users } from '@db/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

// Helper function to calculate commission for referrals
const calculateCommission = async (connection: any, packageType: string, level: number) => {
  try {
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
  } catch (error) {
    console.error('Error calculating commission:', error);
    return 0;
  }
};

router.get('/referrals', async (req, res) => {
  if (!req.user?.id) {
    console.log('Unauthorized referral request');
    return res.status(401).json({ error: "Unauthorized" });
  }

  const connection = await createConnection();
  try {
    console.log('Fetching referral info for user:', req.user.id);

    // Get user's referral code
    const [userInfo] = await connection.execute(
      `SELECT referral_code FROM users WHERE id = ?`,
      [req.user.id]
    );

    if (!userInfo || userInfo.length === 0) {
      console.log('User not found:', req.user.id);
      return res.status(404).json({ error: "User not found" });
    }

    let referralCode = userInfo[0].referral_code;
    if (!referralCode) {
      referralCode = `REF${req.user.id}${Date.now().toString(36)}`;
      await connection.execute(
        'UPDATE users SET referral_code = ? WHERE id = ?',
        [referralCode, req.user.id]
      );
    }
    console.log('Using referral code:', referralCode);

    // Get direct referrals with their package info and nested referrals count
    const [referrals] = await connection.execute(
      `WITH RECURSIVE referral_tree AS (
          -- Base case: direct referrals (level 1)
          SELECT 
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            u.selected_package,
            u.created_at,
            u.referral_code,
            1 as level,
            pp.premium_amount as package_amount
          FROM users u
          LEFT JOIN package_premium_amounts pp ON pp.package_type = u.selected_package
          WHERE u.referred_by = ?
          UNION ALL
          -- Recursive case: find nested referrals
          SELECT 
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            u.selected_package,
            u.created_at,
            u.referral_code,
            rt.level + 1,
            pp.premium_amount
          FROM users u
          LEFT JOIN package_premium_amounts pp ON pp.package_type = u.selected_package
          INNER JOIN referral_tree rt ON u.referred_by = rt.referral_code
          WHERE rt.level < 3
        )
        SELECT 
          rt.*,
          (
            SELECT COUNT(*) 
            FROM users u2 
            WHERE u2.referred_by = rt.referral_code
          ) as direct_referral_count,
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'package', u3.selected_package,
                'count', COUNT(*)
              )
            )
            FROM users u3
            WHERE u3.referred_by = rt.referral_code
            GROUP BY u3.selected_package
          ) as referral_package_stats
        FROM referral_tree rt
        ORDER BY rt.level, rt.created_at DESC`,
      [referralCode]
    );

    // Get package prices for commission calculations
    const [packagePrices] = await connection.execute(
      'SELECT package_type, premium_amount FROM package_premium_amounts'
    );

    const packagePriceMap = packagePrices.reduce((acc: any, pkg: any) => {
      acc[pkg.package_type] = pkg.premium_amount;
      return acc;
    }, {});

    // Transform referrals data with commission calculations
    const transformedReferrals = await Promise.all(
      referrals.map(async (referral: any) => {
        const commission = await calculateCommission(
          connection,
          referral.selected_package,
          referral.level
        );

        // Parse referral package stats
        const packageStats = referral.referral_package_stats 
          ? JSON.parse(referral.referral_package_stats)
          : [];

        return {
          id: referral.id,
          firstName: referral.first_name,
          lastName: referral.last_name,
          email: referral.email,
          selectedPackage: referral.selected_package,
          createdAt: referral.created_at,
          level: referral.level,
          directReferralCount: referral.direct_referral_count,
          referralPackageStats: packageStats,
          commission: {
            percentage: referral.level === 1 ? 15 : referral.level === 2 ? 10 : 5,
            randValue: commission.toFixed(2),
            points: Math.floor(commission * 100)
          }
        };
      })
    );

    // Group referrals by level
    const groupedReferrals = transformedReferrals.reduce((acc: any, ref: any) => {
      if (!acc[ref.level]) {
        acc[ref.level] = [];
      }
      acc[ref.level].push(ref);
      return acc;
    }, {});

    // Calculate package statistics for direct referrals
    const directReferralsByPackage = transformedReferrals
      .filter(ref => ref.level === 1)
      .reduce((acc: any, ref: any) => {
        const packageType = ref.selectedPackage || 'UNKNOWN';
        if (!acc[packageType]) {
          acc[packageType] = {
            count: 0,
            totalReferrals: 0,
            referralsByPackage: {
              BEGINNER: 0,
              NOVICE: 0,
              ACTIVE: 0,
              PROFESSIONAL: 0,
              EXPERT: 0
            },
            commission: {
              percentage: 15,
              baseAmount: packagePriceMap[packageType] || 0
            }
          };
        }
        acc[packageType].count++;
        acc[packageType].totalReferrals += ref.directReferralCount;

        // Add up referrals by package
        ref.referralPackageStats.forEach((stat: any) => {
          if (stat.package) {
            acc[packageType].referralsByPackage[stat.package] += stat.count;
          }
        });

        return acc;
      }, {});

    res.json({
      referralCode,
      referralCount: referrals.length,
      packagePrices: packagePriceMap,
      directReferralsByPackage,
      referralsByLevel: groupedReferrals
    });

  } catch (error) {
    console.error('Error in referral handler:', error);
    res.status(500).json({ 
      error: 'Failed to fetch referral data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
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