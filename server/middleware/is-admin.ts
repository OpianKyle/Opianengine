import { Request, Response, NextFunction } from 'express';
import { createConnection } from '../db';

/**
 * Middleware to check if a user is an admin
 * Can be used to protect admin-only routes
 */
export async function isAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }
  
  const connection = await createConnection();
  try {
    // Check admin status in users table
    const [adminCheck] = await connection.execute(
      'SELECT is_admin FROM users WHERE id = ?',
      [req.user?.id]
    );
    
    const isAdmin = adminCheck && adminCheck[0]?.is_admin;
    
    if (!isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }
    
    next();
  } catch (error) {
    console.error('Error checking admin status:', error);
    res.status(500).json({ error: 'Server error checking admin status' });
  } finally {
    await connection.end();
  }
}