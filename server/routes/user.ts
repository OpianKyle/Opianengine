import { Router, Request, Response } from 'express';
import { getUserFromTokenOrSession } from '../auth';
import { createConnection } from '../db';

const router = Router();

// Get user activities
router.get('/activities', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromTokenOrSession(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const connection = await createConnection();
    
    try {
      // Fetch activities for the user (points history, referrals, etc.)
      const [activities] = await connection.execute(
        `SELECT 
          ph.id,
          ph.points,
          ph.reason as type,
          ph.description,
          ph.created_at as date
        FROM point_history ph
        WHERE ph.user_id = ?
        ORDER BY ph.created_at DESC
        LIMIT 10`,
        [user.id]
      );
      
      return res.status(200).json(activities);
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Error fetching user activities:', error);
    return res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// Get user package information
router.get('/package', async (req: Request, res: Response) => {
  try {
    const user = await getUserFromTokenOrSession(req);
    
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    const connection = await createConnection();
    
    try {
      // Fetch the user's current subscription/package
      const [subscriptions] = await connection.execute(
        `SELECT 
          s.id,
          s.package_type as name,
          CASE 
            WHEN s.is_active = 1 THEN 'Active'
            ELSE 'Inactive'
          END as status,
          s.expiry_date as expiryDate
        FROM subscriptions s
        WHERE s.user_id = ? AND s.is_active = 1
        ORDER BY s.created_at DESC
        LIMIT 1`,
        [user.id]
      );
      
      if (subscriptions.length === 0) {
        return res.status(200).json(null);
      }
      
      return res.status(200).json(subscriptions[0]);
    } finally {
      await connection.end();
    }
  } catch (error) {
    console.error('Error fetching user package:', error);
    return res.status(500).json({ error: 'Failed to fetch package information' });
  }
});

export default router;