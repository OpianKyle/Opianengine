import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { setupAuth, checkAgent, checkAdmin, verifyJwtToken } from "./auth";
import { setupWebSocketServer } from "./websocket"; 
import { createConnection } from './db';
import { sendEmail, formatPointsAssignmentEmail, formatAdminNotificationEmail, formatQuoteRequestEmail, formatAdminQuoteRequestEmail, formatRegistrationEmail, sendAdminRegistrationNotification, formatFundCardEmail, formatNewCustomerAdminEmail, generateRegistrationPDF } from "./utils/emailService";
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { Readable } from 'stream';
import session from 'express-session';
import MemoryStore from 'memorystore';
import referralRouter from './routes/referral';
import agentRouter from './routes/agent';
import migrationRouter from './routes/migration';
import manualMigrationRouter from './routes/manual-migration';
import packageTypesRouter from './routes/package-types';
import { NotificationService } from './services/notification-service';
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { logAdminAction } from './admin-logger';
import nodemailer from 'nodemailer';
import jwt from 'jsonwebtoken';
import mysql from 'mysql2/promise';

const scryptAsync = promisify(scrypt);
const crypto = {
  hash: async (password: string) => {
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    return `${buf.toString("hex")}.${salt}`;
  }
};

// Helper function to get package price
async function getPackagePrice(connection: any, packageName: string): Promise<number> {
  // Get package price from the table
  const [prices] = await connection.execute(
    'SELECT premium_amount FROM package_premium_amounts WHERE package_type = ?',
    [packageName?.toUpperCase()]
  );

  console.log('Fetched package price:', {
    packageName: packageName?.toUpperCase(),
    prices,
    amount: prices.length > 0 ? Number(prices[0].premium_amount) : 0
  });

  return prices.length > 0 ? Number(prices[0].premium_amount) : 0;
}

// Helper function to calculate referral commission points
async function calculateCommissionPoints(connection: any, packageName: string, level: number): Promise<{points: number, randValue: number}> {
  const packageValue = await getPackagePrice(connection, packageName);
  
  console.log('Package value for commission calculation:', {
    packageName,
    packageValue,
    level
  });
  
  // Apply level-based commission percentage
  let commissionPercentage = 0;
  switch (level) {
    case 1: // Direct referral
      commissionPercentage = 0.15; // 15%
      break;
    case 2:
      commissionPercentage = 0.10; // 10%
      break;
    case 3:
      commissionPercentage = 0.05; // 5%
      break;
    default:
      commissionPercentage = 0;
  }

  // Calculate commission in Rands
  const randValue = packageValue * commissionPercentage;
  // Convert to points (1 Rand = 100 points)
  const points = Math.floor(randValue * 100);

  console.log('Commission calculation result:', {
    packageValue,
    commissionPercentage,
    randValue,
    points
  });

  return { points, randValue };
}

export function registerRoutes(app: Express, sessionMiddleware: any): Server {
  // Note: Session middleware is already configured in server/index.ts
  // And authentication setup is handled there as well
  // Just setup the routes here

  // Debug middleware to log session state
  app.use((req: any, res, next) => {
    console.log('Session debug:', {
      hasSession: !!req.session,
      sessionID: req.sessionID,
      isAuthenticated: req.isAuthenticated(),
      user: req.user,
      cookies: req.headers.cookie
    });
    next();
  });

// SMTP Test route - test connection to SMTP server without sending an email
  app.get("/api/test-smtp", async (req: Request, res: Response) => {
    try {
      // Get SMTP settings with fallbacks
      const host = process.env.SMTP_HOST || process.env.OPIAN_SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || process.env.OPIAN_SMTP_PORT || '587');
      const user = process.env.SMTP_USER || process.env.OPIAN_SMTP_USER;
      const pass = process.env.SMTP_PASSWORD || process.env.OPIAN_SMTP_PASSWORD;
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;
      
      // Create a nodemailer transporter with the SMTP settings
      console.log('=== SMTP CONNECTION TEST ===');
      console.log('SMTP_HOST:', host ? 'Set' : 'Not set');
      console.log('SMTP_PORT:', port);
      console.log('SMTP_USER:', user ? 'Set' : 'Not set');
      console.log('SMTP_PASSWORD:', pass ? 'Set (length: ' + (pass.length || 0) + ')' : 'Not set');
      console.log('SMTP_SECURE:', secure ? 'true' : 'false');
      
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure, // true for 465, false for other ports
        auth: {
          user,
          pass
        },
        debug: true,
        logger: true,
        tls: {
          rejectUnauthorized: false // Accept all certificates (less secure but useful for testing)
        }
      });

      console.log('Attempting to verify SMTP connection...');
      const verificationResult = await transporter.verify();
      
      return res.status(200).json({
        success: true,
        message: 'SMTP connection verified successfully',
        details: {
          verificationResult,
          smtp: {
            host: host ? 'Configured (hidden)' : 'Missing',
            port: port.toString(),
            user: user ? 'Configured (hidden)' : 'Missing',
            password: pass ? 'Configured (hidden)' : 'Missing',
            secure: secure ? 'Yes' : 'No'
          },
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('SMTP Connection Test Error:', error);
      // Variables in the catch block lose scope, so let's get our settings again
      const host = process.env.SMTP_HOST || process.env.OPIAN_SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || process.env.OPIAN_SMTP_PORT || '587');
      const user = process.env.SMTP_USER || process.env.OPIAN_SMTP_USER;
      const pass = process.env.SMTP_PASSWORD || process.env.OPIAN_SMTP_PASSWORD;
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;
      
      return res.status(500).json({
        success: false,
        message: 'SMTP connection test failed',
        error: error instanceof Error ? error.message : 'Unknown error',
        errorDetails: error,
        smtp: {
          host: host ? 'Configured (hidden)' : 'Missing',
          port: port.toString(),
          user: user ? 'Configured (hidden)' : 'Missing',
          password: pass ? 'Configured (hidden)' : 'Missing',
          secure: secure ? 'Yes' : 'No'
        },
        timestamp: new Date().toISOString()
      });
    }
  });

  // Register route handlers
  app.use('/api/referral', referralRouter);
  app.use('/api/migration', migrationRouter);
  app.use('/api/manual-migration', manualMigrationRouter);
  app.use('/api/package-types', packageTypesRouter);
  
  /**
   * User authentication endpoint
   * Returns the current authenticated user (from session or JWT token)
   */
  app.get("/api/user", async (req: Request, res: Response) => {
    try {
      console.log('GET /api/user called, checking authentication');
      const user = await getUserFromTokenOrSession(req);
      
      if (!user) {
        console.log('No authenticated user found');
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      console.log('Authenticated user found:', { 
        id: user.id, 
        email: user.email,
        isAdmin: user.is_admin,
        isSuperAdmin: user.is_super_admin 
      });
      
      // Return user data without sensitive fields
      return res.json({
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
        is_admin: user.is_admin,
        is_super_admin: user.is_super_admin,
        is_agent: user.is_agent,
        is_enabled: user.is_enabled,
        points: user.points,
        referral_code: user.referral_code,
        referred_by: user.referred_by,
        created_at: user.created_at,
        updated_at: user.updated_at
      });
    } catch (error) {
      console.error('Error in /api/user endpoint:', error);
      return res.status(500).json({ 
        error: "Server error retrieving user data",
        details: error instanceof Error ? error.message : "Unknown error" 
      });
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup WebSocket
  setupWebSocketServer(httpServer, sessionMiddleware);
  console.log('WebSocket server initialized...');

  return httpServer;
}

/**
 * Helper function to retrieve user from either session or JWT token
 * Returns null if no valid authentication is found
 */
async function getUserFromTokenOrSession(req: Request): Promise<any> {
  try {
    // First check if user is authenticated via session
    if (req.isAuthenticated() && req.user) {
      console.log('User authenticated via session');
      return req.user;
    }
    
    // If not in session, check for JWT token in Authorization header
    const token = extractBearerToken(req);
    if (token) {
      const decoded = verifyJwtToken(token);
      if (decoded) {
        console.log('User authenticated via JWT token');
        
        // Connect to the database
        const connection = await mysql.createConnection({
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          ssl: {
            rejectUnauthorized: false
          }
        });
        
        // Fetch the user from the database
        const [rows] = await connection.execute(
          'SELECT * FROM users WHERE id = ?',
          [decoded.id]
        );
        
        await connection.end();
        
        // Check if user exists and is enabled
        if (Array.isArray(rows) && rows.length > 0) {
          const user = rows[0];
          if (user.is_enabled) {
            return user;
          }
        }
      }
    }
    
    // No valid authentication found
    return null;
  } catch (error) {
    console.error('Error in getUserFromTokenOrSession:', error);
    throw error;
  }
}

/**
 * Helper function to extract bearer token from request headers
 */
function extractBearerToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return null;
}