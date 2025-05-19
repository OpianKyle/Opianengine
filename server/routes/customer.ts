import express from 'express';
import mysql from 'mysql2/promise';

// Database connection helper function
export async function createConnection() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'dedi1350.jnb1.host-h.net',
    user: process.env.DB_USER || 'opianrewards',
    password: process.env.DB_PASSWORD || 'R4yq9q6ZxYOkbdgf',
    database: process.env.DB_NAME || 'opianrewards'
  });
  
  return connection;
}

const router = express.Router();

// Get customer cash redemption history
router.get('/redemptions', async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Not authenticated' });
  }
  
  const connection = await createConnection();
  
  try {
    const userId = req.user?.id;
    console.log('Fetching redemptions for user:', userId);
    
    // Check if cash_redemptions table exists
    const [tables] = await connection.execute(
      `SHOW TABLES LIKE 'cash_redemptions'`
    );
    
    if (!tables || tables.length === 0) {
      console.log('cash_redemptions table does not exist');
      return res.json([]);
    }
    
    // Get redemptions for this user with processor details
    const [redemptions] = await connection.execute(
      `SELECT r.*, 
              u.first_name AS processor_first_name, 
              u.last_name AS processor_last_name,
              DATE_FORMAT(r.created_at, '%Y-%m-%dT%H:%i:%s.000Z') as formatted_created_date,
              DATE_FORMAT(r.processed_at, '%Y-%m-%dT%H:%i:%s.000Z') as formatted_processed_date
       FROM cash_redemptions r
       LEFT JOIN users u ON r.processed_by = u.id
       WHERE r.user_id = ?
       ORDER BY r.created_at DESC`,
      [userId]
    );
    
    console.log('Found redemptions for user:', {
      userId,
      count: redemptions ? redemptions.length : 0
    });
    
    // Format the redemptions for the frontend
    const formattedRedemptions = redemptions ? redemptions.map((r: any) => ({
      id: r.id,
      points: Math.abs(r.points), // Convert to positive for display
      cashAmount: r.cash_amount || (Math.abs(r.points) * 0.015).toFixed(2),
      status: r.status || 'PENDING',
      createdAt: r.formatted_created_date || r.created_at,
      processedAt: r.formatted_processed_date || r.processed_at,
      processor: r.processed_by ? {
        firstName: r.processor_first_name,
        lastName: r.processor_last_name
      } : null
    })) : [];
    
    res.json(formattedRedemptions);
  } catch (error: any) {
    console.error('Error fetching redemptions:', error);
    res.status(500).json({ 
      error: "Failed to fetch redemptions",
      message: error.message 
    });
  } finally {
    await connection.end();
  }
});

export default router;