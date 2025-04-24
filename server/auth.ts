/**
 * Authentication utilities for the Opian Rewards API
 * 
 * This file contains helper functions for user authentication and session management.
 */

import { Request, Express } from 'express';
import jwt from 'jsonwebtoken';
import { createConnection } from './db';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import session from 'express-session';
import { scrypt, randomBytes, timingSafeEqual } from 'crypto';
import { promisify } from 'util';

/**
 * Verify user authentication from session or JWT token
 * 
 * This function attempts to verify user authentication using either:
 * 1. Session authentication (from req.isAuthenticated)
 * 2. JWT token in the Authorization header
 * 
 * @param req Express request object
 * @returns User object if authenticated, null otherwise
 */
export async function verifySession(req: Request): Promise<any> {
  // Check if authenticated via Passport session
  if (req.isAuthenticated && req.isAuthenticated()) {
    console.log('User is authenticated via session');
    return req.user;
  }
  
  // Check for authorization header with Bearer token
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    console.log(`Found token in Authorization header (length: ${token.length})`);
    
    try {
      // Verify the token
      const secret = process.env.JWT_SECRET;
      if (!secret) {
        console.error('JWT_SECRET is not defined in environment variables');
        return null;
      }
      
      const decoded = jwt.verify(token, secret);
      console.log('Token verified successfully');
      
      // Get user from the database
      const connection = await createConnection();
      try {
        const [users] = await connection.execute(
          'SELECT * FROM users WHERE id = ?',
          [decoded.id]
        );
        
        if (Array.isArray(users) && users.length > 0) {
          console.log(`Found user with ID ${decoded.id} from token`);
          return users[0];
        } else {
          console.log(`No user found with ID ${decoded.id} from token`);
          return null;
        }
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('Error verifying token:', error);
      return null;
    }
  }
  
  console.log('User is not authenticated via session or token');
  return null;
}

/**
 * Setup authentication middleware for Express app
 * 
 * Configures passport with local strategy, session, and serialization/deserialization
 * 
 * @param app Express application instance
 */
export function setupAuth(app: Express): void {
  const scryptAsync = promisify(scrypt);
  
  // Configure session
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || 'default-session-secret-please-change-me',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };
  
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());
  
  // Helper functions for password hashing and verification
  async function hashPassword(password: string) {
    const salt = randomBytes(16).toString('hex');
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString('hex')}.${salt}`;
  }
  
  async function comparePasswords(supplied: string, stored: string) {
    const [hashed, salt] = stored.split('.');
    const hashedBuf = Buffer.from(hashed, 'hex');
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  }
  
  // Configure Local Strategy for username/password login
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const connection = await createConnection();
        try {
          // Find user by username or email
          const [users] = await connection.execute(
            'SELECT * FROM users WHERE username = ? OR email = ?',
            [username, username]
          );
          
          if (!Array.isArray(users) || users.length === 0) {
            return done(null, false, { message: 'Incorrect username or password' });
          }
          
          const user = users[0];
          
          // Check if user is enabled
          if (user.is_enabled === 0) {
            return done(null, false, { message: 'Account is disabled' });
          }
          
          // Verify password
          const isValid = await comparePasswords(password, user.password);
          if (!isValid) {
            return done(null, false, { message: 'Incorrect username or password' });
          }
          
          return done(null, user);
        } finally {
          await connection.end();
        }
      } catch (error) {
        return done(error);
      }
    })
  );
  
  // Serialization/deserialization for sessions
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });
  
  passport.deserializeUser(async (id: number, done) => {
    try {
      const connection = await createConnection();
      try {
        const [users] = await connection.execute(
          'SELECT * FROM users WHERE id = ?',
          [id]
        );
        
        if (Array.isArray(users) && users.length > 0) {
          done(null, users[0]);
        } else {
          done(new Error('User not found'));
        }
      } finally {
        await connection.end();
      }
    } catch (error) {
      done(error);
    }
  });
  
  // Register auth routes
  app.post('/api/register', async (req, res, next) => {
    try {
      const { username, email, password, firstName, lastName } = req.body;
      
      if (!username || !email || !password) {
        return res.status(400).json({ error: 'Username, email, and password are required' });
      }
      
      const connection = await createConnection();
      try {
        // Check if username or email already exists
        const [existingUsers] = await connection.execute(
          'SELECT * FROM users WHERE username = ? OR email = ?',
          [username, email]
        );
        
        if (Array.isArray(existingUsers) && existingUsers.length > 0) {
          return res.status(400).json({ error: 'Username or email already in use' });
        }
        
        // Hash the password
        const hashedPassword = await hashPassword(password);
        
        // Begin transaction
        await connection.beginTransaction();
        
        // Insert the new user
        const [result] = await connection.execute(
          `INSERT INTO users (
            username, email, password, first_name, last_name, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, NOW(), NOW())`,
          [username, email, hashedPassword, firstName || null, lastName || null]
        );
        
        // Get the new user ID
        const userId = (result as any).insertId;
        
        // Commit the transaction
        await connection.commit();
        
        // Get the complete user object
        const [users] = await connection.execute(
          'SELECT * FROM users WHERE id = ?',
          [userId]
        );
        
        if (Array.isArray(users) && users.length > 0) {
          const newUser = users[0];
          
          // Log the user in
          req.login(newUser, (err) => {
            if (err) return next(err);
            res.status(201).json(newUser);
          });
        } else {
          throw new Error('Failed to retrieve new user');
        }
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  });
}