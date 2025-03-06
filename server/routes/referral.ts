import { Router } from 'express';
import { createConnection } from '../db';
import { db } from '@db';
import { users } from '@db/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

// Helper function to calculate commission for referrals
const calculateCommission = async (connection: any, packageType: string, level: number) => {
  try {
    if (!packageType) return 0;

    // Get package amount from database
    const [prices] = await connection.execute(
      'SELECT premium_amount FROM package_premium_amounts WHERE package_type = ?',
      [packageType.toUpperCase()]
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
      'SELECT referral_code FROM users WHERE id = ?',
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

    // Get referrals up to level 3 with package info
    const [referrals] = await connection.execute(`
      WITH RECURSIVE referral_chain AS (
        -- Level 1 (direct referrals)
        SELECT 
          id,
          first_name,
          last_name,
          email,
          selected_package,
          created_at,
          referral_code,
          1 as level
        FROM users 
        WHERE referred_by = ?

        UNION ALL

        -- Level 2 and 3
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.selected_package,
          u.created_at,
          u.referral_code,
          rc.level + 1
        FROM users u
        INNER JOIN referral_chain rc ON u.referred_by = rc.referral_code
        WHERE rc.level < 3
      )
      SELECT 
        rc.*,
        pp.premium_amount as package_amount,
        (
          SELECT COUNT(*) 
          FROM users u2 
          WHERE u2.referred_by = rc.referral_code
        ) as direct_referral_count,
        (
          SELECT JSON_ARRAYAGG(
            JSON_OBJECT(
              'package', u3.selected_package,
              'count', COUNT(*)
            )
          )
          FROM users u3
          WHERE u3.referred_by = rc.referral_code
          GROUP BY u3.selected_package
        ) as package_stats
      FROM referral_chain rc
      LEFT JOIN package_premium_amounts pp ON pp.package_type = rc.selected_package
      ORDER BY rc.level, rc.created_at DESC
    `, [referralCode]);

    // Get package prices
    const [packagePrices] = await connection.execute(
      'SELECT package_type, premium_amount FROM package_premium_amounts'
    );

    const packagePriceMap = packagePrices.reduce((acc: any, pkg: any) => {
      acc[pkg.package_type] = pkg.premium_amount;
      return acc;
    }, {});

    // Transform referrals with commission calculations
    const transformedReferrals = await Promise.all(
      referrals.map(async (ref: any) => {
        const commission = await calculateCommission(connection, ref.selected_package, ref.level);

        // Parse package stats
        const packageStats = ref.package_stats 
          ? JSON.parse(ref.package_stats)
          : [];

        return {
          id: ref.id,
          firstName: ref.first_name,
          lastName: ref.last_name,
          email: ref.email,
          selectedPackage: ref.selected_package,
          createdAt: ref.created_at,
          level: ref.level,
          directReferralCount: ref.direct_referral_count,
          packageStats,
          commission: {
            percentage: ref.level === 1 ? 15 : ref.level === 2 ? 10 : 5,
            randValue: commission.toFixed(2),
            points: Math.floor(commission * 100)
          }
        };
      })
    );

    // Group referrals by level
    const referralsByLevel = transformedReferrals.reduce((acc: any, ref: any) => {
      if (!acc[ref.level]) {
        acc[ref.level] = [];
      }
      acc[ref.level].push(ref);
      return acc;
    }, {});

    // Calculate package statistics for each level
    const packageStatsByLevel = [1, 2, 3].reduce((acc: any, level: number) => {
      const levelReferrals = referralsByLevel[level] || [];

      acc[level] = levelReferrals.reduce((levelAcc: any, ref: any) => {
        const packageType = ref.selectedPackage || 'UNKNOWN';
        if (!levelAcc[packageType]) {
          levelAcc[packageType] = {
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
              percentage: level === 1 ? 15 : level === 2 ? 10 : 5,
              baseAmount: packagePriceMap[packageType] || 0
            }
          };
        }
        levelAcc[packageType].count++;
        levelAcc[packageType].totalReferrals += ref.directReferralCount;

        // Add up referrals by package
        ref.packageStats.forEach((stat: any) => {
          if (stat.package) {
            levelAcc[packageType].referralsByPackage[stat.package] += stat.count;
          }
        });

        return levelAcc;
      }, {});

      return acc;
    }, {});

    const response = {
      referralCode,
      referralCount: referrals.length,
      packagePrices: packagePriceMap,
      packageStatsByLevel,
      referralsByLevel
    };

    console.log('Sending response:', {
      referralCode,
      referralCount: referrals.length,
      levels: Object.keys(referralsByLevel).length,
      totalCommission: transformedReferrals.reduce((sum, ref) => sum + Number(ref.commission.randValue), 0)
    });

    res.json(response);

  } catch (error) {
    console.error('Error in referral handler:', error);
    res.status(500).json({
      error: 'Failed to fetch referral data',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
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