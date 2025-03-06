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

    // First get all direct referrals (level 1)
    const [level1Referrals] = await connection.execute(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.selected_package,
        u.created_at,
        u.referral_code,
        COUNT(r.id) as direct_referral_count
      FROM users u
      LEFT JOIN users r ON r.referred_by = u.referral_code
      WHERE u.referred_by = ?
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.selected_package, u.created_at, u.referral_code
    `, [referralCode]);

    // Get level 2 referrals
    const level2Referrals = [];
    for (const level1 of level1Referrals) {
      const [refs] = await connection.execute(`
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.selected_package,
          u.created_at,
          u.referral_code,
          COUNT(r.id) as direct_referral_count
        FROM users u
        LEFT JOIN users r ON r.referred_by = u.referral_code
        WHERE u.referred_by = ?
        GROUP BY u.id, u.first_name, u.last_name, u.email, u.selected_package, u.created_at, u.referral_code
      `, [level1.referral_code]);
      level2Referrals.push(...refs);
    }

    // Get level 3 referrals
    const level3Referrals = [];
    for (const level2 of level2Referrals) {
      const [refs] = await connection.execute(`
        SELECT 
          u.id,
          u.first_name,
          u.last_name,
          u.email,
          u.selected_package,
          u.created_at,
          COUNT(r.id) as direct_referral_count
        FROM users u
        LEFT JOIN users r ON r.referred_by = u.referral_code
        WHERE u.referred_by = ?
        GROUP BY u.id, u.first_name, u.last_name, u.email, u.selected_package, u.created_at
      `, [level2.referral_code]);
      level3Referrals.push(...refs);
    }

    // Get package prices
    const [packagePrices] = await connection.execute(
      'SELECT package_type, premium_amount FROM package_premium_amounts'
    );

    const packagePriceMap = packagePrices.reduce((acc: any, pkg: any) => {
      acc[pkg.package_type] = pkg.premium_amount;
      return acc;
    }, {});

    // Transform referrals with commission calculations
    const transformLevel = async (referrals: any[], level: number) => {
      return Promise.all(referrals.map(async (ref: any) => {
        const commission = await calculateCommission(connection, ref.selected_package, level);
        return {
          id: ref.id,
          firstName: ref.first_name,
          lastName: ref.last_name,
          email: ref.email,
          selectedPackage: ref.selected_package,
          createdAt: ref.created_at,
          directReferralCount: ref.direct_referral_count || 0,
          commission: {
            percentage: level === 1 ? 15 : level === 2 ? 10 : 5,
            randValue: commission.toFixed(2),
            points: Math.floor(commission * 100)
          }
        };
      }));
    };

    const level1Transformed = await transformLevel(level1Referrals, 1);
    const level2Transformed = await transformLevel(level2Referrals, 2);
    const level3Transformed = await transformLevel(level3Referrals, 3);

    // Calculate package statistics for each level
    const calculateLevelStats = (referrals: any[]) => {
      return referrals.reduce((acc: any, ref: any) => {
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
              percentage: ref.commission.percentage,
              baseAmount: packagePriceMap[packageType] || 0
            }
          };
        }
        acc[packageType].count++;
        acc[packageType].totalReferrals += ref.directReferralCount;
        return acc;
      }, {});
    };

    const packageStatsByLevel = {
      1: calculateLevelStats(level1Transformed),
      2: calculateLevelStats(level2Transformed),
      3: calculateLevelStats(level3Transformed)
    };

    const response = {
      referralCode,
      referralCount: level1Transformed.length + level2Transformed.length + level3Transformed.length,
      packagePrices: packagePriceMap,
      packageStatsByLevel,
      referralsByLevel: {
        1: level1Transformed,
        2: level2Transformed,
        3: level3Transformed
      }
    };

    console.log('Sending response:', {
      referralCode,
      referralCount: response.referralCount,
      levels: Object.keys(response.referralsByLevel).length,
      totalCommission: [...level1Transformed, ...level2Transformed, ...level3Transformed]
        .reduce((sum, ref) => sum + Number(ref.commission.randValue), 0)
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