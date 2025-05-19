import { Router } from 'express';
import mysql from 'mysql2/promise';
import { adminCheckMiddleware } from '../middleware';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const router = Router();
const scryptAsync = promisify(scrypt);

// Get database connection from environment variables
const poolConnection = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'opian',
  port: parseInt(process.env.DB_PORT || '3306'),
  ssl: {
    rejectUnauthorized: false
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Resend welcome email to a customer
router.post('/resend-welcome-email', adminCheckMiddleware, async (req, res) => {
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({
      success: false,
      message: "User ID is required"
    });
  }

  let connection;
  
  try {
    connection = await poolConnection.getConnection();
    
    // Get user details
    const [users] = await connection.query(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    if (!users || !Array.isArray(users) || users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }
    
    const user = users[0];
    
    // Generate a temporary password
    const tempPassword = "12345678";
    
    // Hash the password
    const salt = randomBytes(16).toString('hex');
    const buf = await scryptAsync(tempPassword, salt, 64) as Buffer;
    const hashedPassword = `${buf.toString('hex')}.${salt}`;
    
    // Update the user's password in the database
    await connection.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, userId]
    );
    
    console.log(`Password updated successfully for user ${userId}`);
    
    // For demo purposes, we'll skip the actual email sending
    // and just return success
    return res.json({
      success: true,
      message: `Welcome email would be sent to ${user.email} with password ${tempPassword}`
    });
    
  } catch (error) {
    console.error("Error in resend-welcome-email:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while processing your request"
    });
  } finally {
    if (connection) connection.release();
  }
});

export default router;