import { Router } from 'express';
import { createConnection } from '../db';

const router = Router();

// Get customer information including points and cash balance
router.get("/points", async (req: any, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const connection = await createConnection();
  try {
    const [userData] = await connection.execute(
      `SELECT 
        id,
        email,
        first_name,
        last_name,
        CAST(COALESCE(points, 0) as DECIMAL(10,2)) as points,
        CAST(COALESCE(cash_balance, 0) as DECIMAL(10,2)) as cash_balance,
        selected_package
      FROM users 
      WHERE id = ?`,
      [req.user?.id]
    );

    if (!userData || !userData[0]) {
      return res.status(404).json({ error: "User not found" });
    }

    console.log('Points data retrieved:', {
      userId: userData[0].id,
      rawPoints: userData[0].points,
      pointsType: typeof userData[0].points,
      cashBalance: userData[0].cash_balance,
      package: userData[0].selected_package,
      packageUpperCase: userData[0].selected_package ? userData[0].selected_package.toUpperCase() : null
    });

    // Ensure points is properly converted to a number
    const points = parseFloat(userData[0].points || '0');
    const cashBalance = parseFloat(userData[0].cash_balance || '0');

    // Format response
    res.json({
      points,
      cashBalance,
      firstName: userData[0].first_name,
      lastName: userData[0].last_name,
      email: userData[0].email,
      selectedPackage: userData[0].selected_package
    });
  } catch (error) {
    console.error('Error fetching user points:', error);
    res.status(500).json({ error: 'Failed to fetch user points' });
  } finally {
    await connection.end();
  }
});

// Endpoint to fetch cash wallet transactions
router.get("/cash-wallet", async (req: any, res) => {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const connection = await createConnection();
  try {
    console.log('Fetching cash wallet data for user:', req.user.id);

    // First get the user's cash balance
    const [userRows] = await connection.execute(
      `SELECT 
        id,
        CAST(COALESCE(cash_balance, 0) as DECIMAL(10,2)) as cash_balance
      FROM users 
      WHERE id = ?`,
      [req.user.id]
    );

    if (!userRows || !userRows[0]) {
      return res.status(404).json({ error: "User not found" });
    }

    const cashBalance = parseFloat(userRows[0].cash_balance || '0');

    // Now get transactions from cash_wallet_transactions table
    const [transactions] = await connection.execute(
      `SELECT 
        cwt.*,
        DATE_FORMAT(cwt.created_at, '%Y-%m-%dT%H:%i:%s.000Z') as timestamp
      FROM cash_wallet_transactions cwt
      WHERE cwt.user_id = ?
      ORDER BY cwt.created_at DESC
      LIMIT 50`,
      [req.user.id]
    );

    console.log('Found cash wallet transactions:', transactions ? transactions.length : 0);

    // Format the response
    res.json({
      cash_balance: cashBalance,
      transactions: transactions || []
    });
  } catch (error) {
    console.error('Error fetching cash wallet data:', error);
    res.status(500).json({ error: 'Failed to fetch cash wallet data' });
  } finally {
    await connection.end();
  }
});

export default router;