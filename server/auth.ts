/**
 * Authentication utilities for the Opian Rewards API
 * 
 * This file contains helper functions for user authentication and session management.
 */

import { Request } from 'express';
import jwt from 'jsonwebtoken';
import { createConnection } from './db';

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