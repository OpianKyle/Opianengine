import { Router } from 'express';
import { createConnection } from '../db';
import { db } from '@db';
import { users } from '@db/schema';
import { eq, and, desc } from 'drizzle-orm';

const router = Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req, res, next) => {
  if (!req.isAuthenticated()) {
    console.log('Unauthorized referral request - no session');
    return res.status(401).json({ error: "Please log in to access this resource" });
  }
  next();
};

// Apply authentication middleware to all routes
router.use(isAuthenticated);

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

// Helper function to get package prices
const getPackagePrices = async (connection: any) => {
  const [packagePrices] = await connection.execute(
    'SELECT package_type, premium_amount FROM package_premium_amounts'
  );
  return packagePrices.reduce((acc: any, pkg: any) => {
    acc[pkg.package_type] = pkg.premium_amount;
    return acc;
  }, {});
};

// Shared logic for getting referral info
const getReferralInfo = async (userId: number) => {
  const connection = await createConnection();
  try {
    console.log('Fetching referral info for user:', userId);

    // Get user's referral code
    const [userInfo] = await connection.execute(
      'SELECT referral_code FROM users WHERE id = ?',
      [userId]
    );

    if (!userInfo || userInfo.length === 0) {
      console.log('User not found:', userId);
      throw new Error("User not found");
    }

    let referralCode = userInfo[0].referral_code;
    if (!referralCode) {
      referralCode = `REF${userId}${Date.now().toString(36)}`;
      await connection.execute(
        'UPDATE users SET referral_code = ? WHERE id = ?',
        [referralCode, userId]
      );
    }
    console.log('Using referral code:', referralCode);

    // Get all levels of referrals
    const [referrals] = await connection.execute(`
      WITH RECURSIVE referral_tree AS (
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
          rt.level + 1
        FROM users u
        INNER JOIN referral_tree rt ON u.referred_by = rt.referral_code
        WHERE rt.level < 3
      )
      SELECT 
        rt.*,
        (SELECT COUNT(*) FROM users WHERE referred_by = rt.referral_code) as direct_referral_count
      FROM referral_tree rt
      ORDER BY rt.level, rt.created_at DESC
    `, [referralCode]);

    // Get package prices
    const packagePrices = await getPackagePrices(connection);

    // Transform and group referrals by level
    const referralsByLevel = {};
    const packageStatsByLevel = {};

    for (const ref of referrals) {
      const level = ref.level;
      const commission = await calculateCommission(connection, ref.selected_package, level);

      // Transform referral data
      const transformedRef = {
        id: ref.id,
        firstName: ref.first_name,
        lastName: ref.last_name,
        email: ref.email,
        selectedPackage: ref.selected_package,
        createdAt: ref.created_at,
        directReferralCount: ref.direct_referral_count,
        commission: {
          percentage: level === 1 ? 15 : level === 2 ? 10 : 5,
          randValue: commission.toFixed(2),
          points: Math.floor(commission * 100)
        }
      };

      // Group by level
      if (!referralsByLevel[level]) {
        referralsByLevel[level] = [];
      }
      referralsByLevel[level].push(transformedRef);

      // Calculate package stats
      if (!packageStatsByLevel[level]) {
        packageStatsByLevel[level] = {};
      }

      const packageType = ref.selected_package || 'UNKNOWN';
      if (!packageStatsByLevel[level][packageType]) {
        packageStatsByLevel[level][packageType] = {
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
            baseAmount: packagePrices[packageType] || 0
          }
        };
      }

      packageStatsByLevel[level][packageType].count++;
      packageStatsByLevel[level][packageType].totalReferrals += ref.direct_referral_count || 0;
    }

    return {
      referralCode,
      referralCount: referrals.length,
      packagePrices,
      packageStatsByLevel,
      referralsByLevel
    };

  } catch (error) {
    console.error('Error getting referral info:', error);
    throw error;
  } finally {
    await connection.end();
  }
};

// Route for the referral section component
router.get('/referral', async (req, res) => {
  const connection = await createConnection();
  try {
    console.log('Fetching referral info for user:', req.user?.id);
    const referralInfo = await getReferralInfo(req.user!.id);
    res.json(referralInfo);
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

// Route for the full referrals page
router.get('/referrals', async (req, res) => {
  const connection = await createConnection();
  try {
    console.log('Fetching referrals for user:', req.user?.id);
    const referralInfo = await getReferralInfo(req.user!.id);
    res.json(referralInfo);
  } catch (error) {
    console.error('Error in referrals handler:', error);
    res.status(500).json({
      error: 'Failed to fetch referral data',
      details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
    });
  } finally {
    await connection.end();
  }
});

export default router;