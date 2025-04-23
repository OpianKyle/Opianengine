import { Request, Response } from "express";
import mysql from 'mysql2/promise';
import jwt from "jsonwebtoken";
import { pool } from "../../db";

// Create a database connection
async function createConnection() {
  try {
    return await mysql.createConnection({
      host: process.env.DB_HOST || 'dedi1350.jnb1.host-h.net',
      user: process.env.DB_USER || 'admin',
      password: process.env.DB_PASSWORD || '8E33U976qa800F',
      database: process.env.DB_NAME || 'opianrewards',
      port: parseInt(process.env.DB_PORT || '3306'),
      ssl: {
        rejectUnauthorized: false
      }
    });
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

/**
 * Test login endpoint for development purposes only
 * This route should be disabled in production
 */
export function setupTestAuth(app: any) {
  // Test login endpoint - for development only
  app.post("/api/test-login", async (req: Request, res: Response) => {
    console.log("Test login attempt", req.body);
    
    const { email, password } = req.body;
    
    // In development, accept the admin@example.com / password credentials
    if (email === "admin@example.com" && password === "password") {
      try {
        const connection = await createConnection();
        
        // Check if test admin exists
        const [adminResult] = await connection.execute(
          "SELECT * FROM users WHERE email = ? OR email = 'admin@example.com' LIMIT 1",
          [email]
        );
        
        let user = adminResult[0];
        
        // If admin doesn't exist, create it
        if (!adminResult.length) {
          // Create a test admin user
          const [insertResult] = await connection.execute(
            `INSERT INTO users (
              email, password, first_name, last_name, 
              is_admin, is_super_admin, points, is_enabled, 
              created_at, country_code, referral_code
            ) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)`,
            [
              'admin@example.com',
              '$2b$10$tgWuQHv5jN1KAiUXPepLP.DVdX3htkLfuC5VwT88B5yZB8WyDPNLO', // Hashed password value
              'Test',
              'Admin',
              1, // is_admin
              1, // is_super_admin
              0, // points
              1, // is_enabled
              'ZA', // country_code
              'TESTADMIN' // referral_code
            ]
          );
          
          // Get the newly created user
          const [newAdminResult] = await connection.execute(
            "SELECT * FROM users WHERE email = 'admin@example.com' LIMIT 1"
          );
          
          user = newAdminResult[0];
        }
        
        // Generate a JWT token
        const token = jwt.sign(
          { 
            id: user.id,
            email: user.email,
            is_admin: Boolean(user.is_admin),
            is_super_admin: Boolean(user.is_super_admin)
          },
          process.env.JWT_SECRET || 'test-jwt-secret',
          { expiresIn: '1d' }
        );
        
        // Login the user (set session)
        req.login(user, (err) => {
          if (err) {
            console.error("Session login error:", err);
            return res.status(500).json({ error: "Failed to establish session" });
          }
          
          // Return user data along with the token
          return res.status(200).json({
            user: {
              id: user.id,
              email: user.email,
              first_name: user.first_name,
              last_name: user.last_name,
              is_admin: Boolean(user.is_admin),
              is_super_admin: Boolean(user.is_super_admin),
              is_agent: Boolean(user.is_agent),
              is_enabled: Boolean(user.is_enabled),
              points: user.points || 0
            },
            token
          });
        });
        
      } catch (error) {
        console.error("Test login error:", error);
        res.status(500).json({ error: "Test login failed" });
      }
    } else {
      // For any other credentials in development, return unauthorized
      res.status(401).json({ error: "Invalid credentials" });
    }
  });
}