import { Router, Request, Response } from 'express';
import mysql from 'mysql2/promise';
import { pool } from '@db';

const router = Router();

// Middleware to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  next();
};

// Get cash deposits data for the logged-in customer
router.get('/cash-deposits', isAuthenticated, async (req: Request, res: Response) => {
  const connection = await pool.getConnection();
  try {
    // Get all cash deposits for the current user
    const [deposits] = await connection.execute(
      `SELECT id, points, description, created_at 
       FROM cash_deposits 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [req.user.id]
    );

    // Get total cash deposit points for the current user
    const [totalResult] = await connection.execute(
      `SELECT SUM(points) as total_points 
       FROM cash_deposits 
       WHERE user_id = ?`,
      [req.user.id]
    );

    // Calculate total cash value (R0.015 per point)
    const totalPoints = totalResult[0]?.total_points || 0;
    const totalCashValue = parseFloat((totalPoints * 0.015).toFixed(2));

    // Add cash value to each deposit
    const depositsWithCashValue = deposits.map((deposit: any) => ({
      ...deposit,
      cashValue: parseFloat((deposit.points * 0.015).toFixed(2))
    }));

    res.json({
      deposits: depositsWithCashValue,
      totalPoints,
      totalCashValue
    });
  } catch (error) {
    console.error('Error fetching cash deposits:', error);
    res.status(500).json({ 
      error: 'Failed to fetch cash deposits data',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  } finally {
    connection.release();
  }
});

export default router;