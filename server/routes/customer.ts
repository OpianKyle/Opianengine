import { Router, Request, Response } from 'express';
import mysql from 'mysql2/promise';
import { pool } from '@db';
import { createConnection } from '../db';

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
  let connection;
  try {
    connection = await createConnection();
    console.log('Fetching cash deposits for user:', req.user.id);

    // First, check if the cash_deposits table exists
    const [tables] = await connection.execute(
      `SHOW TABLES LIKE 'cash_deposits'`
    );
    
    if (!tables || !Array.isArray(tables) || tables.length === 0) {
      console.log('Cash deposits table does not exist');
      // Return empty result if table doesn't exist
      return res.json({
        deposits: [],
        totalPoints: 0,
        totalCashValue: 0
      });
    }
    
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
      `SELECT COALESCE(SUM(points), 0) as total_points 
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
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

// Add cash deposit point allocation endpoint
router.post('/cash-deposits/allocate', isAuthenticated, async (req: Request, res: Response) => {
  let connection;
  try {
    const { points, description } = req.body;
    
    if (!points || isNaN(Number(points)) || Number(points) <= 0) {
      return res.status(400).json({ error: 'Valid points amount is required' });
    }
    
    connection = await createConnection();
    
    // First check if the user has enough points 
    const [userPoints] = await connection.execute(
      'SELECT points FROM users WHERE id = ?',
      [req.user.id]
    );
    
    if (!userPoints || !userPoints[0] || userPoints[0].points < points) {
      return res.status(400).json({ error: 'Insufficient points' });
    }
    
    // Start transaction
    await connection.beginTransaction();
    
    // Insert into cash deposits
    const cashValue = parseFloat((Number(points) * 0.015).toFixed(2));
    await connection.execute(
      `INSERT INTO cash_deposits (user_id, points, cash_value, description, created_at) 
       VALUES (?, ?, ?, ?, NOW())`,
      [req.user.id, points, cashValue, description || 'Points allocated to cash deposits']
    );
    
    // Deduct points from user
    await connection.execute(
      'UPDATE users SET points = points - ? WHERE id = ?',
      [points, req.user.id]
    );
    
    // Add transaction record
    await connection.execute(
      `INSERT INTO points_transactions (user_id, points, transaction_type, description, created_at)
       VALUES (?, ?, 'CASH_DEPOSIT_ALLOCATION', ?, NOW())`,
      [req.user.id, -points, `Allocated ${points} points to cash deposits`]
    );
    
    await connection.commit();
    
    res.json({ 
      success: true, 
      message: `Successfully allocated ${points} points to cash deposits`,
      cashValue
    });
    
  } catch (error) {
    console.error('Error allocating cash deposits:', error);
    if (connection) {
      await connection.rollback();
    }
    res.status(500).json({ 
      error: 'Failed to allocate points to cash deposits',
      details: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  } finally {
    if (connection) {
      connection.release();
    }
  }
});

export default router;