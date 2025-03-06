import { Router } from 'express';
import { db } from '@db';
import { users } from '@db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { createConnection } from '../db';

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

router.get('/api/customer/referrals', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const connection = await createConnection();
  try {
    console.log('Fetching referrals for user:', req.user.id);

    // Get user's referral code
    const [userInfo] = await connection.execute(
      'SELECT referral_code FROM users WHERE id = ?',
      [req.user.id]
    );

    if (!userInfo || !userInfo[0]?.referral_code) {
      return res.status(404).json({ error: "Referral code not found" });
    }

    const referralCode = userInfo[0].referral_code;

    // Get package prices
    const [packagePrices] = await connection.execute(
      'SELECT package_type, premium_amount FROM package_premium_amounts'
    );

    // Get all referrals up to level 3 with their package info
    const [referrals] = await connection.execute(`
      WITH RECURSIVE referral_tree AS (
        -- Direct referrals (level 1)
        SELECT 
          u.*,
          1 as level,
          u.referral_code as parent_code
        FROM users u
        WHERE u.referred_by = ?

        UNION ALL

        -- Indirect referrals (levels 2 and 3)
        SELECT 
          u.*,
          rt.level + 1,
          rt.referral_code
        FROM users u
        INNER JOIN referral_tree rt ON u.referred_by = rt.referral_code
        WHERE rt.level < 3
      )
      SELECT rt.*, 
        (SELECT COUNT(*) FROM users u2 WHERE u2.referred_by = rt.referral_code) as direct_referral_count,
        (SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'package', u3.selected_package,
            'count', COUNT(*)
          )
        )
        FROM users u3
        WHERE u3.referred_by = rt.referral_code
        GROUP BY u3.selected_package) as package_stats
      FROM referral_tree rt
      ORDER BY rt.level, rt.created_at DESC
    `, [referralCode]);

    // Transform referrals with commission calculations
    const transformedReferrals = await Promise.all(referrals.map(async (ref: any) => {
      const commission = await calculateCommission(connection, ref.selected_package, ref.level);

      return {
        id: ref.id,
        firstName: ref.first_name,
        lastName: ref.last_name,
        email: ref.email,
        selectedPackage: ref.selected_package,
        createdAt: ref.created_at,
        level: ref.level,
        directReferralCount: ref.direct_referral_count,
        packageStats: JSON.parse(ref.package_stats || '[]'),
        commission: {
          percentage: ref.level === 1 ? 15 : ref.level === 2 ? 10 : 5,
          randValue: commission.toFixed(2),
          points: Math.floor(commission * 100)
        }
      };
    }));

    // Group referrals by level
    const referralsByLevel = transformedReferrals.reduce((acc: any, ref: any) => {
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
            }
          };
        }
        acc[packageType].count++;
        acc[packageType].totalReferrals += ref.directReferralCount;

        ref.packageStats.forEach((stat: any) => {
          if (stat.package) {
            acc[packageType].referralsByPackage[stat.package] = stat.count;
          }
        });

        return acc;
      }, {});

    res.json({
      referralCode,
      referralCount: referrals.length,
      packagePrices: packagePrices.reduce((acc: any, pkg: any) => {
        acc[pkg.package_type] = pkg.premium_amount;
        return acc;
      }, {}),
      directReferralsByPackage,
      referralsByLevel
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