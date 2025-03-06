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

router.get('/referral', async (req, res) => {
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

    // Generate or retrieve referral code
    let referralCode = userInfo[0].referral_code;
    if (!referralCode) {
      referralCode = `REF${req.user.id}${Date.now().toString(36)}`;
      await connection.execute(
        'UPDATE users SET referral_code = ? WHERE id = ?',
        [referralCode, req.user.id]
      );
    }
    console.log('Using referral code:', referralCode);

    // Get all referrals and their package details
    const [referrals] = await connection.execute(`
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.selected_package,
        u.created_at,
        u.referral_code,
        COUNT(r.id) as direct_referral_count,
        p.premium_amount as package_amount
      FROM users u
      LEFT JOIN users r ON r.referred_by = u.referral_code
      LEFT JOIN package_premium_amounts p ON p.package_type = u.selected_package
      WHERE u.referred_by = ?
      GROUP BY u.id, u.first_name, u.last_name, u.email, u.selected_package, 
               u.created_at, u.referral_code, p.premium_amount`,
      [referralCode]
    );

    console.log('Found referrals:', { count: referrals.length });

    // Transform the referrals data
    const transformedReferrals = await Promise.all(
      referrals.map(async (ref: any) => {
        const commission = await calculateCommission(connection, ref.selected_package, 1);
        return {
          id: ref.id,
          firstName: ref.first_name,
          lastName: ref.last_name,
          email: ref.email,
          selectedPackage: ref.selected_package,
          createdAt: ref.created_at,
          directReferralCount: ref.direct_referral_count,
          commission: {
            percentage: 15,
            randValue: commission.toFixed(2),
            points: Math.floor(commission * 100)
          }
        };
      })
    );

    // Get package prices for display
    const [packagePrices] = await connection.execute(
      'SELECT package_type, premium_amount FROM package_premium_amounts'
    );

    const packagePriceMap = packagePrices.reduce((acc: any, pkg: any) => {
      acc[pkg.package_type] = pkg.premium_amount;
      return acc;
    }, {});

    // Group referrals by package type
    const directReferralsByPackage = transformedReferrals.reduce((acc: any, ref: any) => {
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
      return acc;
    }, {});

    res.json({
      referralCode,
      referralCount: referrals.length,
      packagePrices: packagePriceMap,
      directReferralsByPackage,
      referralsByLevel: {
        1: transformedReferrals,
      }
    });

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