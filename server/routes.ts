import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { setupAuth, checkAgent, checkAdmin, verifyJwtToken, getUserFromTokenOrSession } from "./auth";
import { setupWebSocketServer } from "./websocket"; 
import { getAgentByReferralCode } from "./utils/referral";
import { createConnection, connectionPool } from './db';
import { sendEmail, formatPointsAssignmentEmail, formatAdminNotificationEmail, formatQuoteRequestEmail, formatAdminQuoteRequestEmail, formatRegistrationEmail, sendAdminRegistrationNotification, formatFundCardEmail, formatNewCustomerAdminEmail, generateRegistrationPDF } from "./utils/emailService";
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { Readable } from 'stream';
import session from 'express-session';
import MemoryStore from 'memorystore';
import referralRouter from './routes/referral';
import agentRouter from './routes/agent';
import agentsRouter from './routes/agents';
import migrationRouter from './routes/migration';
import manualMigrationRouter from './routes/manual-migration';
import packageTypesRouter from './routes/package-types';
import subscriptionRouter from './routes/subscription';
import { setupCardStatusRoutes } from './routes/card-status';
import { leadsRouter } from './routes/leads';
import { contactRouter } from './routes/contact';
import { registerTestCustomerRoutes } from './test-customer-routes';
import adminToolsRouter from './routes/admin-tools';
import analyticsRouter from './routes/analytics';
import socialUsersRouter from './routes/social-users';
import specialMigrationsRouter from './routes/special-migrations';
import { NotificationService } from './services/notification-service';
import { scrypt, randomBytes } from "crypto";
import nodemailer from 'nodemailer';
import { promisify } from "util";
import { logAdminAction } from './admin-logger';
import { generateSitemap, scheduleSitemapGeneration } from './sitemap/sitemap-generator';

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
  // Check if table exists and create it if it doesn't
  try {
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS package_premium_amounts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        package_type VARCHAR(50) NOT NULL UNIQUE,
        premium_amount DECIMAL(10,2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Check if we have data in the table
    const [checkData] = await connection.execute(
      `SELECT COUNT(*) as count FROM package_premium_amounts`
    );
    
    // If no data, insert default values
    if (checkData[0].count === 0) {
      await connection.execute(`
        INSERT INTO package_premium_amounts (package_type, premium_amount) VALUES 
        ('OPPORTUNITY', 350.00),
        ('MOMENTUM', 450.00),
        ('PROSPER', 550.00),
        ('PRESTIGE', 695.00),
        ('PINNACLE', 825.00)
      `);
      console.log('Created package_premium_amounts table with default values');
    }
  } catch (error) {
    console.error('Error setting up package_premium_amounts table:', error);
  }
  
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
      commissionPercentage = 0.075; // 7.5%
      break;
    case 2:
      commissionPercentage = 0.05; // 5%
      break;
    case 3:
      commissionPercentage = 0.025; // 2.5%
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

  // Email test route (temporary for testing) - UPDATED WITH NEW ENVIRONMENT VARIABLES
  app.get("/api/test-email", async (req: Request, res: Response) => {
    try {
      // Get SMTP settings with fallbacks
      const host = process.env.SMTP_HOST || process.env.OPIAN_SMTP_HOST;
      const port = parseInt(process.env.SMTP_PORT || process.env.OPIAN_SMTP_PORT || '587');
      const user = process.env.SMTP_USER || process.env.OPIAN_SMTP_USER;
      const pass = process.env.SMTP_PASSWORD || process.env.OPIAN_SMTP_PASSWORD;
      const secure = process.env.SMTP_SECURE === 'true' || port === 465;
      
      // Email configuration check
      console.log('=== EMAIL CONFIG CHECK ===');
      console.log('SMTP_HOST:', host ? 'Set' : 'Not set');
      console.log('SMTP_PORT:', port);
      console.log('SMTP_USER:', user ? 'Set' : 'Not set');
      console.log('SMTP_PASSWORD:', pass ? 'Set (length: ' + (pass.length || 0) + ')' : 'Not set');
      console.log('SMTP_SECURE:', secure ? 'true' : 'false');
      
      // Use query parameter or default to client services email
      const testEmail = req.query.email as string || 'clientservices@opianrewards.com';
      console.log('Recipient email:', testEmail);
      
      // Generate test email content with improved logging
      console.log('Generating test email content...');
      const { text, html } = formatRegistrationEmail('Test User', 'clientservices@opianrewards.com');
      
      console.log('Sending test email using updated transport configuration...');
      try {
        // Try to send email with detailed error capturing
        const result = await sendEmail({
          to: testEmail,
          subject: 'Test Email from Opian Rewards',
          text,
          html,
          emailType: 'TEST'
        });
        
        if (result) {
          console.log('Email sent successfully!');
          return res.status(200).json({ 
            success: true,
            message: 'Test email sent successfully',
            config: {
              host: host ? 'Configured' : 'Missing',
              port: port.toString(),
              user: user ? 'Configured' : 'Missing',
              password: pass ? 'Configured' : 'Missing',
              smtp_secure: secure ? 'Yes' : 'No'
            },
            timestamp: new Date().toISOString(),
            recipient: testEmail
          });
        } else {
          console.error('Email sending returned false');
          return res.status(500).json({ 
            success: false,
            error: 'Failed to send test email',
            config: {
              host: host ? 'Configured' : 'Missing',
              port: port.toString(),
              user: user ? 'Configured' : 'Missing',
              password: pass ? 'Configured' : 'Missing',
              smtp_secure: secure ? 'Yes' : 'No'
            },
            timestamp: new Date().toISOString(),
            recipient: testEmail
          });
        }
      } catch (emailError) {
        console.error('Detailed email sending error:', emailError);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to send test email', 
          details: emailError instanceof Error ? emailError.message : 'Unknown error',
          config: {
            host: host ? 'Configured' : 'Missing',
            port: port.toString(),
            user: user ? 'Configured' : 'Missing',
            password: pass ? 'Configured' : 'Missing',
            smtp_secure: secure ? 'Yes' : 'No'
          },
          timestamp: new Date().toISOString(),
          recipient: testEmail
        });
      }
    } catch (error) {
      console.error('Test email route error:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to process email test',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Test route for admin notification emails with PDF attachment
  app.post("/api/register-test", async (req: Request, res: Response) => {
    try {
      console.log('Received test registration data:', req.body);
      
      // Create a structured customer data object from the request body
      const customerData = {
        firstName: req.body.first_name,
        lastName: req.body.last_name,
        email: req.body.email,
        mobileNumber: req.body.phone_number,
        selectedPackage: req.body.selectedPackage,
        referralCode: req.body.referralCode,
        signature: req.body.signature || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        isSouthAfrican: req.body.isSouthAfrican !== undefined ? req.body.isSouthAfrican : true,
        idNumber: req.body.idNumber,
        dateOfBirth: req.body.dateOfBirth,
        gender: req.body.gender,
        occupation: req.body.occupation,
        industry: req.body.industry,
        address: req.body.address,
        city: req.body.city,
        postalCode: req.body.postalCode,
        hasCreditCard: req.body.hasCreditCard,
        bankName: req.body.bankName,
        accountType: req.body.accountType,
        accountNumber: req.body.accountNumber,
        accountHolderName: req.body.accountHolderName,
        branchCode: req.body.branchCode,
        mandate_accepted: req.body.mandate_accepted || false
      };
      
      // Log the admin notification attempt
      console.log('Sending admin registration notification for test user');
      
      // This recipient email must match what's used in sendAdminRegistrationNotification function
      const adminRecipientEmail = 'clientservices@opianrewards.com';
      
      console.log('Using admin recipient email:', adminRecipientEmail);
      
      // Send the notification
      const result = await sendAdminRegistrationNotification(customerData);
      
      if (result) {
        // Create response object with the correct recipient email
        const responseData = { 
          success: true, 
          message: "Test admin notification with PDF attachment sent successfully",
          recipient: adminRecipientEmail
        };
        
        console.log('Sending response with recipient:', responseData.recipient);
        
        // Send the response
        res.status(200).json(responseData);
      } else {
        // Failure response
        res.status(500).json({ 
          success: false, 
          message: "Failed to send test admin notification" 
        });
      }
    } catch (error) {
      // Error handling
      console.error("Error sending test admin notification:", error);
      res.status(500).json({ 
        success: false, 
        message: "Error sending test admin notification", 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // Test endpoint for manually verifying email content with mandate acceptance
  app.post("/api/register-test-email-html", async (req: Request, res: Response) => {
    try {
      console.log('Received email HTML test request');
      
      // Create sample customer data with mandate_accepted set to true
      const customerData = {
        firstName: req.body.first_name || "Test",
        lastName: req.body.last_name || "Customer",
        email: req.body.email || "test@example.com",
        mobileNumber: req.body.phone_number || "27123456789",
        selectedPackage: req.body.selectedPackage || "Gold",
        signature: req.body.signature || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        isSouthAfrican: req.body.isSouthAfrican !== undefined ? req.body.isSouthAfrican : true,
        idNumber: req.body.idNumber || "7012345678901",
        mandate_accepted: req.body.mandate_accepted !== undefined ? req.body.mandate_accepted : true // explicitly set to true for testing
      };
      
      // Generate email content
      const { text, html } = formatNewCustomerAdminEmail(customerData);
      
      // Also generate PDF to check its content
      console.log('Generating PDF for mandate acceptance test...');
      const pdfBuffer = await generateRegistrationPDF(customerData);
      
      // Return the HTML for inspection
      res.status(200).json({
        success: true,
        message: "Email content generated successfully",
        mandate_accepted: customerData.mandate_accepted,
        html: html,
        text: text,
        pdf_generated: !!pdfBuffer
      });
    } catch (error) {
      console.error('Error generating email content:', error);
      res.status(500).json({
        success: false,
        message: "Failed to generate email content",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });


  /* Registration endpoint functionality moved to auth.ts
   * The setupAuth function in auth.ts now handles user registration
   * with proper crypto, database transaction, and signature validation.
   * See auth.ts for the complete implementation.
   */

  // Login endpoint uses imported passport instance
  // Global error handler
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Global error handler caught:', err);
    const status = (err as any).status || (err as any).statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ error: message });
  });

  app.post("/api/login", passport.authenticate("local"), async (req, res) => {
    const connection = await createConnection();
    try {
      // Get complete user data including points with explicit numeric conversion
      const [userData] = await connection.execute(
        `SELECT 
          id,
          email, 
          first_name,
          last_name,
          CAST(COALESCE(points, 0) as DECIMAL(10,2)) as points,
          is_admin,
          is_super_admin,
          is_agent
        FROM users
        WHERE id = ?`,
        [req.user?.id]
      );

      console.log('Login user data:', {
        id: userData[0]?.id,
        email: userData[0]?.email,
        rawPoints: userData[0]?.points,
        pointsType: typeof userData[0]?.points
      });

      // Ensure points is a number
      const points = parseFloat(userData[0]?.points || '0');

      console.log('Processed points:', {
        points,
        pointsType: typeof points
      });

      // Send user data with properly typed points
      res.json({
        id: userData[0]?.id,
        email: userData[0]?.email,
        firstName: userData[0]?.first_name,
        lastName: userData[0]?.last_name,
        points: points,
        isAdmin: Boolean(userData[0]?.is_admin),
        isSuperAdmin: Boolean(userData[0]?.is_super_admin),
        isAgent: Boolean(userData[0]?.is_agent)
      });

      // Update session with points
      if (req.session && req.user) {
        req.session.points = points;
      }

    } catch (error) {
      console.error('Error fetching user data:', error);
      res.status(500).json({ error: 'Failed to fetch user data' });
    } finally {
      await connection.end();
    }
  });

  // Enhanced logout handling 
  app.post("/api/logout", (req, res) => {
    console.log('Logout request received');
    
    // Clear all cookies
    res.clearCookie('connect.sid', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.clearCookie('session', {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    // Destroy the session and logout
    if (req.session) {
      req.session.destroy((err) => {
        if (err) {
          console.error('Error destroying session:', err);
        }
        console.log('Session destroyed successfully');
        
        // Properly logout with passport
        req.logout((err) => {
          if (err) {
            console.error('Error during passport logout:', err);
          }
          console.log('Passport logout successful');
          res.status(200).json({ message: "Logged out successfully" });
        });
      });
    } else {
      // If no session exists, still return success
      console.log('No session to destroy');
      res.status(200).json({ message: "Logged out successfully" });
    }
  });

  // Notification endpoints
  app.get("/api/notifications/stream", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Set headers for SSE
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });

    // Send initial connection success
    res.write('event: connected\n');
    res.write(`data: ${JSON.stringify({ userId: req.user.id })}\n\n`);

    // Add this client to notification service
    const sendNotification = (notification) => {
      res.write('event: notification\n');
      res.write(`data: ${JSON.stringify(notification)}\n\n`);
    };

    NotificationService.addClient(req.user.id, sendNotification);

    // Remove client on connection close
    req.on('close', () => {
      NotificationService.removeClient(req.user.id, sendNotification);
    });
  });

  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const notifications = await NotificationService.getUnreadNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.post("/api/notifications/mark-read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      const { notificationId } = req.body;
      await NotificationService.markAsRead(req.user.id, notificationId);
      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
    }
  });

  // Add test endpoints for notifications with detailed feedback
  app.all("/api/notifications/test", async (req, res) => {
    // Check authentication
    const isAuthenticated = req.isAuthenticated();
    const userId = req.user?.id;

    // If not POST method, return instructions
    if (req.method !== 'POST') {
      return res.status(400).json({
        error: "Invalid method",
        message: "This endpoint requires a POST request",
        currentStatus: {
          isAuthenticated,
          userId,
          method: req.method
        },
        instructions: [
          "1. Make sure you're logged in first",
          "2. Use POST method to create a test notification",
          "3. You can verify notifications at /api/notifications endpoint"
        ]
      });
    }

    // If not authenticated, return helpful message
    if (!isAuthenticated) {
      return res.status(401).json({
        error: "Not authenticated",
        message: "You need to be logged in to create test notifications",
        instructions: [
          "1. Log in to your account first",
          "2. Try this request again after logging in"
        ]
      });
    }

    try {
      console.log('Creating test notification for user:', userId);
      const notification = await NotificationService.createTestNotification(userId);
      
      res.json({
        success: true,
        message: "Test notification created successfully",
        notification,
        instructions: [
          "1. Check /api/notifications for your new notification",
          "2. The notification should appear in real-time via SSE",
          "3. You can create multiple test notifications using /api/notifications/test-multiple"
        ]
      });
    } catch (error) {
      console.error('Error creating test notification:', error);
      res.status(500).json({
        error: 'Failed to create test notification',
        details: error.message,
        instructions: [
          "1. Check if the notifications table exists",
          "2. Verify your user ID is valid",
          "3. Try /api/notifications/test-db-public to check database status"
        ]
      });
    }
  });

  // Add test endpoints for multiple notifications
  app.post("/api/notifications/test-multiple", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    try {
      console.log('Creating multiple test notifications for user:', req.user.id);
      const notifications = await NotificationService.createTestNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      console.error('Error creating test notifications:', error);
      res.status(500).json({ error: 'Failed to create test notifications' });
    }
  });

  // Add test endpoint for notifications database structure
  app.get("/api/notifications/test-db", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      console.log('Testing notifications database setup...');
      
      // Check if table exists
      const [tables] = await connection.execute(
        'SHOW TABLES LIKE "notifications"'
      );
      
      if (!Array.isArray(tables) || tables.length === 0) {
        return res.status(500).json({ error: "Notifications table does not exist" });
      }

      // Check table structure
      const [columns] = await connection.execute(
        'DESCRIBE notifications'
      );
      
      // Create a test notification
      const notification = await NotificationService.createTestNotification(req.user.id);
      
      res.json({
        tableExists: true,
        tableStructure: columns,
        testNotification: notification
      });
      
    } catch (error) {
      console.error('Error testing notifications:', error);
      res.status(500).json({ error: 'Failed to test notifications system' });
    } finally {
      await connection.end();
    }
  });



  // Enhance the public test endpoint with more details
  app.get("/api/notifications/test-db-public", async (req, res) => {
    const connection = await createConnection();
    try {
      console.log('Testing notifications database setup...');
      
      // Check if table exists
      const [tables] = await connection.execute(
        'SHOW TABLES LIKE "notifications"'
      );
      
      if (!Array.isArray(tables) || tables.length === 0) {
        console.log('Notifications table not found');
        return res.status(500).json({ error: "Notifications table does not exist" });
      }

      // Check table structure
      const [columns] = await connection.execute(
        'DESCRIBE notifications'
      );
      
      // Get sample notifications if any exist
      const [notifications] = await connection.execute(
        'SELECT * FROM notifications ORDER BY created_at DESC LIMIT 5'
      );

      // Get total count of notifications
      const [countResult] = await connection.execute(
        'SELECT COUNT(*) as total FROM notifications'
      );

      // Test creating a notification
      const testData = {
        user_id: 1, // Using a test user ID
        type: 'SYSTEM_UPDATE',
        title: 'Database Test',
        message: 'Testing database connectivity',
        is_read: false,
        metadata: JSON.stringify({ test: true, time: new Date().toISOString() }),
        created_at: new Date()
      };

      const [insertResult] = await connection.execute(
        `INSERT INTO notifications (
          user_id, type, title, message, is_read, metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          testData.user_id,
          testData.type,
          testData.title,
          testData.message,
          testData.is_read,
          testData.metadata,
          testData.created_at
        ]
      );
      
      res.json({
        tableExists: true,
        tableStructure: columns,
        sampleNotifications: notifications,
        totalNotifications: countResult[0].total,
        timestamp: new Date().toISOString(),
        testInsert: {
          success: true,
          insertId: insertResult.insertId,
          testData
        }
      });
      
    } catch (error) {
      console.error('Error testing notifications:', error);
      res.status(500).json({ 
        error: 'Failed to test notifications system',
        details: error.message
      });
    } finally {
      await connection.end();
    }
  });

  // Add GET endpoint for easier browser-based notification testing
  app.get("/api/notifications/test-create", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        error: "Not authenticated",
        message: "You need to be logged in to create test notifications",
        howToTest: "Please log in first, then visit this URL again"
      });
    }

    try {
      console.log('Creating test notification for user:', req.user.id);
      const notification = await NotificationService.createTestNotification(req.user.id);
      
      res.json({
        success: true,
        message: "Test notification created successfully",
        notification,
        nextSteps: "Check your notifications page to see the test notification"
      });
    } catch (error) {
      console.error('Error creating test notification:', error);
      res.status(500).json({ 
        error: 'Failed to create test notification',
        details: error.message
      });
    }
  });

  // Add new customer profile endpoint
  app.get("/api/customer/profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Get complete user profile data with explicit type conversion
      const [userData] = await connection.execute(
        `SELECT 
          id,
          email,
          first_name,
          last_name,
          phone_number,
          is_south_african,
          id_number,
          date_of_birth,
          gender,
          occupation,
          industry,
          address,
          city,
          postal_code,
          selected_package,
          bank_name,
          account_type,
          account_number,
          account_holder_name,
          branch_code,
          has_credit_card,
          CAST(COALESCE(points, 0) as DECIMAL(10,2)) as points,
          is_enabled,
          created_at,
          mandate_accepted,
          mandate_accepted_at
        FROM users 
        WHERE id = ?`,
        [req.user?.id]
      );

      if (!userData || !userData[0]) {
        return res.status(404).json({ error: "User not found" });
      }

      const user = userData[0];
      
      console.log('Profile data retrieved:', {
        userId: user.id,
        rawPoints: user.points,
        pointsType: typeof user.points
      });

      // Transform data for frontend
      const transformedData = {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        phoneNumber: user.phone_number,
        isSouthAfrican: Boolean(user.is_south_african),
        idNumber: user.id_number,
        dateOfBirth: user.date_of_birth,
        gender: user.gender,
        occupation: user.occupation,
        industry: user.industry,
        address: user.address,
        city: user.city,
        postalCode: user.postal_code,
        selectedPackage: user.selected_package,
        bankName: user.bank_name,
        accountType: user.account_type,
        accountNumber: user.account_number,
        accountHolderName: user.account_holder_name,
        branchCode: user.branch_code,
        hasCreditCard: Boolean(user.has_credit_card),
        points: parseFloat(user.points || '0'),
        isEnabled: Boolean(user.is_enabled),
        createdAt: user.created_at,
        mandateAccepted: Boolean(user.mandate_accepted),
        mandateAcceptedAt: user.mandate_accepted_at
      };

      console.log('Transformed data:', {
        userId: transformedData.id,
        points: transformedData.points,
        pointsType: typeof transformedData.points
      });

      res.json(transformedData);

    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ error: 'Failed to fetch user profile' });
    } finally {
      await connection.end();
    }
  });

  // Get customer points endpoint
  app.get("/api/customer/points", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      const [userData] = await connection.execute(
        `SELECT 
          id,
          email,
          first_name,
          last_name,
          CAST(COALESCE(points, 0) as DECIMAL(10,2)) as points,
          selected_package
        FROM users 
        WHERE id = ?`,
        [req.user?.id]
      );

      if (!userData || !userData[0]) {
        return res.status(404).json({ error: "User not found" });
      }

      console.log('Points data retrieved:', {
        userId: userData[0].id,
        rawPoints: userData[0].points,
        pointsType: typeof userData[0].points,
        package: userData[0].selected_package,
        packageUpperCase: userData[0].selected_package ? userData[0].selected_package.toUpperCase() : null
      });

      // Ensure points is properly converted to a number
      const points = parseFloat(userData[0].points || '0');

      res.json({
        id: userData[0].id,
        email: userData[0].email,
        firstName: userData[0].first_name,
        lastName: userData[0].last_name,
        points: points,
        selectedPackage: userData[0].selected_package || null
      });

    } catch (error) {
      console.error('Error fetching user points:', error);
      res.status(500).json({ error: 'Failed to fetch user points' });
    } finally {
      await connection.end();
    }
  });

  // Mount referral routes
  // Mount the referral routes
  app.use('/api/referral', referralRouter);
  
  // Direct endpoints for referral routes to avoid 404 issues
  app.get("/api/referral/validate", async (req, res) => {
    try {
      const { code } = req.query;
      
      if (!code) {
        return res.status(400).json({
          success: false,
          error: 'Referral code is required'
        });
      }
      
      // Clean the code (remove any dashes)
      const cleanCode = (code as string).replace(/-/g, '');
      console.log(`Validating referral code: ${cleanCode}`);
      
      // Use existing utility function to get agent
      const agent = await getAgentByReferralCode(cleanCode);
      
      if (!agent) {
        console.log(`Invalid referral code: ${cleanCode} (No agent found)`);
        return res.status(404).json({
          success: false,
          error: 'Invalid referral code or the agent is no longer active'
        });
      }
      
      console.log(`Valid referral code: ${cleanCode} (Agent: ${agent.first_name} ${agent.last_name})`);
      
      // Return agent name but not all details
      return res.status(200).json({
        success: true,
        agentName: `${agent.first_name} ${agent.last_name}`
      });
    } catch (error) {
      console.error('Error validating referral code:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to validate referral code'
      });
    }
  });
  
  // Direct endpoint for submitting a referral lead
  app.post("/api/referral/public/submit", async (req, res) => {
    try {
      const { firstName, lastName, email, phoneNumber, notes, referralCode } = req.body;
      
      // Basic validation
      if (!firstName || !lastName || !email || !phoneNumber || !referralCode) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
      }
      
      const connection = await createConnection();
      
      try {
        // Find the agent by referral code
        const agent = await getAgentByReferralCode(referralCode);
        
        if (!agent) {
          return res.status(404).json({
            success: false,
            error: 'Invalid referral code'
          });
        }
        
        // Create a new lead in the database
        const [result] = await connection.execute(
          `INSERT INTO referral_leads (
            agent_id, first_name, last_name, email, phone_number, 
            notes, status, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'NEW', NOW())`,
          [
            agent.id,
            firstName,
            lastName,
            email,
            phoneNumber,
            notes || null
          ]
        );
        
        console.log(`New referral lead created: ${firstName} ${lastName} for agent ID ${agent.id}`);
        
        res.status(201).json({
          success: true,
          message: 'Referral lead submitted successfully',
          leadId: (result as any).insertId
        });
      } catch (error) {
        console.error('Database error creating referral lead:', error);
        res.status(500).json({
          success: false,
          error: 'Failed to submit referral lead'
        });
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('Error submitting referral lead:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to process referral lead submission'
      });
    }
  });
  
  app.use('/api/agent', agentRouter);
  app.use('/api/admin/agents', agentsRouter);
  
  // Setup card status routes
  setupCardStatusRoutes(app);
  
  // Debug endpoint for agent listing that bypasses all authentication middleware
  app.get('/api/debug/agents', async (req, res) => {
    try {
      console.log("Direct debug endpoint for agents accessed");
      // Create a direct database connection
      const connection = await createConnection();
      const [agents] = await connection.execute('SELECT id, first_name, last_name, email FROM users WHERE is_agent = 1');
      
      console.log(`Found ${Array.isArray(agents) ? agents.length : 0} agents through global debug endpoint`);
      
      // Format for frontend compatibility
      const formatted = Array.isArray(agents) ? agents.map((agent: any) => ({
        id: agent.id,
        firstName: agent.first_name,
        lastName: agent.last_name,
        email: agent.email
      })) : [];
      
      return res.status(200).json(formatted);
    } catch (error) {
      console.error("Global debug endpoint error:", error);
      return res.status(500).json({ error: 'Server error in global debug endpoint' });
    }
  });
  app.use('/api/migration', migrationRouter);
  app.use('/api/manual-migration', manualMigrationRouter);
  app.use('/api/package-types', packageTypesRouter);
  app.use('/api/subscription', subscriptionRouter);
  app.use('/api/leads', leadsRouter);
  app.use('/api/contact-submit', contactRouter);
  app.use('/api/admin/tools', adminToolsRouter);
  app.use('/api/analytics', analyticsRouter);
  app.use('/api/social', socialUsersRouter);
  app.use('/api/special-migrations', specialMigrationsRouter);
  
  // Register test customer routes
  registerTestCustomerRoutes(app);

  // Create new agent endpoint
  app.post("/api/admin/agents/create", async (req: Request, res: Response) => {
    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user?.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      console.log('Creating new agent:', {
        email: req.body.email,
        firstName: req.body.firstName,
        lastName: req.body.lastName
      });

      await connection.beginTransaction();

      try {
        // Check for existing agent with same email
        const [existingAgent] = await connection.execute(
          'SELECT id FROM users WHERE email = ?',
          [req.body.email]
        );

        if (Array.isArray(existingAgent) && existingAgent.length > 0) {
          return res.status(400).json({ error: "Email already exists" });
        }

        // Hash password if provided
        let hashedPassword = null;
        if (req.body.password) {
          hashedPassword = await crypto.hash(req.body.password);
        }

        // Insert the new agent with explicit is_agent flag
        const [result] = await connection.execute(
          `INSERT INTO users (
            email, password, first_name, last_name,
            phone_number, is_agent, is_enabled, created_at
          ) VALUES (?, ?, ?, ?, ?, 1, 1, NOW())`,
          [
            req.body.email,
            hashedPassword,
            req.body.firstName,
            req.body.lastName,
            req.body.phoneNumber || null
          ]
        );

        const agentId = (result as any).insertId;

        // Log the admin action
        await logAdminAction({
          adminId: req.user?.id,
          actionType: 'AGENT_CREATED',
          targetUserId: agentId,
          details: `Created agent: ${req.body.firstName} ${req.body.lastName} (${req.body.email})`
        });

        await connection.commit();

        console.log('Agent created successfully:', {
          id: agentId,
          email: req.body.email,
          firstName: req.body.firstName,
          lastName: req.body.lastName
        });

        res.json({
          success: true,
          agentId,
          message: 'Agent created successfully'
        });

      } catch (error) {
        await connection.rollback();
        console.error('Error during agent creation transaction:', error);
        throw error;
      }

    } catch (error) {
      console.error('Error creating agent:', error);
      res.status(500).json({ 
        error: "Failed to create agent", 
        details: error.message 
      });
    } finally {
      await connection.end();
    }
  });

  // Bulk points allocation endpoint
  app.post("/api/admin/points/bulk", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { userIds, points, description } = req.body;
      console.log('Bulk points allocation request:', { userIds, points, description });

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        return res.status(400).json({ error: "No users selected" });
      }

      if (!points || isNaN(points)) {
        return res.status(400).json({ error: "Points must be a number" });
      }

      if (!description) {
        return res.status(400).json({ error: "Description is required" });
      }

      // Begin transaction for bulk operations
      await connection.beginTransaction();

      try {
        // Get admin user info for logging
        const [admins] = await connection.execute(
          'SELECT id, email, first_name, last_name FROM users WHERE id = ?',
          [req.user.id]
        );
        const admin = admins[0];

        // Process each user
        const results = [];
        for (const userId of userIds) {
          // Get user info
          const [users] = await connection.execute(
            'SELECT id, email, first_name, last_name, points FROM users WHERE id = ?',
            [userId]
          );

          if (users && users.length > 0) {
            const user = users[0];
            
            // Insert transaction record
            await connection.execute(
              `INSERT INTO transactions (user_id, points, type, description)
               VALUES (?, ?, 'ADMIN_ADJUSTMENT', ?)`,
              [userId, points, description]
            );

            // Update user points
            await connection.execute(
              'UPDATE users SET points = points + ? WHERE id = ?',
              [points, userId]
            );

            // Get updated points
            const [updatedUsers] = await connection.execute(
              'SELECT points FROM users WHERE id = ?',
              [userId]
            );

            // Log admin action
            await connection.execute(
              `INSERT INTO admin_logs (admin_id, action_type, target_user_id, details)
               VALUES (?, 'POINT_ADJUSTMENT', ?, ?)`,
              [req.user.id, userId, `Bulk adjustment - Points: ${points}, Reason: ${description}`]
            );

            results.push({
              userId,
              name: `${user.first_name} ${user.last_name}`,
              email: user.email,
              previousPoints: user.points,
              newPoints: updatedUsers[0].points
            });
          }
        }

        await connection.commit();

        // Return success
        res.json({
          success: true,
          message: `Points allocated to ${results.length} customers successfully`,
          results
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error allocating bulk points:', error);
      res.status(500).json({ error: 'Failed to allocate points to multiple customers' });
    } finally {
      await connection.end();
    }
  });

  // Points adjustment endpoint with notifications
  app.post("/api/admin/points/adjust", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { userId, points, description } = req.body;
      console.log('Points assignment request:', { userId, points, description });

      // Update user points
      await connection.execute(
        'UPDATE users SET points = points + ? WHERE id = ?',
        [points, userId]
      );

      // Record transaction
      await connection.execute(
        `INSERT INTO transactions (user_id, points, type, description)
         VALUES (?, ?, ?, ?)`,
        [userId, points, points >= 0 ? 'POINTS_AWARDED' : 'POINTS_DEDUCTED', description]
      );

      // Get user details for notification
      const [userDetails] = await connection.execute(
        'SELECT first_name, last_name FROM users WHERE id = ?',
        [userId]
      );
      const user = userDetails[0];

      // Create notification with proper structure
      try {
        const notificationData = {
          userId,
          type: points >= 0 ? 'POINTS_AWARDED' as const : 'POINTS_DEDUCTED' as const,
          title: points >= 0 ? 
            `Earned ${points} Points` : 
            `Deducted ${Math.abs(points)} Points`,
          message: description || (points >= 0 ? 
            `${points} points have been added to your account` : 
            `${Math.abs(points)} points have been deducted from your account`),
          metadata: JSON.stringify({
            points,
            adjustedBy: req.user.id,
            timestamp: new Date().toISOString()
          })
        };

        console.log('Creating notification with data:', notificationData);
        await NotificationService.createNotification(notificationData);
      } catch (notificationError) {
        console.error('Error creating notification:', notificationError);
        // Continue execution even if notification fails
      }

      res.json({ 
        success: true,
        message: 'Points adjusted and notification sent successfully'
      });
    } catch (error) {
      console.error('Error adjusting points:', error);
      res.status(500).json({ error: 'Failed to adjust points' });
    } finally {
      await connection.end();
    }
  });

  // Admin customers endpoint - get only regular customers
  // Cache for customers data with segmented caching by page and limit
  const CUSTOMERS_CACHE_TTL = 30 * 1000; // 30 seconds - reduced to improve refresh rate
  const CUSTOMERS_CACHE_STALE_TTL = 5 * 60 * 1000; // 5 minutes for stale data
  // Use a map for caching different pagination states
  const customersCache = new Map();
  
  // Make cache available globally for other modules to access and clear
  global.customersCache = customersCache;

  app.get("/api/admin/customers", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;
    const search = (req.query.search as string) || '';
    const requestedShowTest = req.query.showTest === 'true';
    
    // Check if the user is a super admin
    const [superAdminCheck] = await connectionPool.execute(
      'SELECT is_super_admin FROM users WHERE id = ? LIMIT 1',
      [req.user.id]
    );
    
    const isSuperAdmin = superAdminCheck[0]?.is_super_admin === 1;
    
    // Only allow showing test users if the user is a super admin
    const showTest = requestedShowTest && isSuperAdmin;
    
    // Create a cache key based on pagination, search and test filter
    const cacheKey = `customers_${page}_${limit}_${search}_showTest_${showTest}`;
    const now = Date.now();
    
    // Changed to 10 seconds for development to enable immediate updates
    const cacheTTL = 10 * 1000;
    
    // Check if we have a valid cached response for this pagination state
    if (customersCache.has(cacheKey)) {
      const cacheEntry = customersCache.get(cacheKey);
      if (now - cacheEntry.timestamp < cacheTTL) {
        console.log('Returning cached customers data:', {
          page,
          limit,
          count: cacheEntry.data.data.length,
          showTest: showTest,
          cacheAge: Math.round((now - cacheEntry.timestamp) / 1000) + 's'
        });
        return res.json(cacheEntry.data);
      }
    }

    console.time('customersQuery'); // Start timing the query
    
    // Use the connection pool instead of creating a new connection
    const connection = await connectionPool.getConnection();
    
    try {
      console.log('Fetching customers...');
      
      // Check admin status using more efficient query with PRIMARY key
      const [adminCheck] = await connection.execute(
        'SELECT is_admin FROM users USE INDEX (PRIMARY) WHERE id = ? LIMIT 1',
        [req.user.id]
      );

      if (!adminCheck || !adminCheck[0]?.is_admin) {
        connection.release(); // Release connection back to pool
        return res.status(403).json({ error: "Admin access required" });
      }

      // Improved query using LEFT JOIN instead of a subquery for better performance
      // Count total users for pagination info with search functionality
      let countQuery = `
        SELECT COUNT(*) as total 
        FROM users u 
        LEFT JOIN admin_users au ON u.id = au.user_id
        WHERE u.is_agent = 0 AND au.user_id IS NULL`;
      
      // Add test user filter - only show test users if showTest is true
      if (showTest) {
        countQuery += ` AND u.is_test = TRUE`;
      } else {
        countQuery += ` AND (u.is_test IS NULL OR u.is_test = FALSE)`;
      }
      
      // Add search condition if search term is provided
      if (search) {
        countQuery += ` AND (
          u.first_name LIKE ? OR 
          u.last_name LIKE ? OR 
          u.email LIKE ? OR 
          u.phone_number LIKE ?
        )`;
      }
      
      const countParams = search ? 
        [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`] : 
        [];
      
      const [countResult] = await connection.execute(
        countQuery,
        countParams
      );
      
      const totalCustomers = countResult[0]?.total || 0;
      const totalPages = Math.ceil(totalCustomers / limit);
      
      // Get users with pagination using improved JOIN strategy with search functionality
      let usersQuery = `SELECT 
          u.id,
          u.email,
          u.first_name,
          u.last_name,
          u.phone_number,
          u.is_south_african,
          u.id_number,
          u.date_of_birth,
          u.gender,
          u.occupation,
          u.industry,
          u.address,
          u.city,
          u.postal_code,
          u.selected_package,
          u.bank_name,
          u.account_type,
          u.account_number,
          u.account_holder_name,
          u.branch_code,
          u.has_credit_card,
          u.card_status,
          u.is_enabled,
          CAST(u.points as DECIMAL(10,2)) as points,
          u.created_at,
          u.agent_id,
          u.is_agent,
          u.is_test,
          CASE WHEN au.role_type IS NOT NULL THEN TRUE ELSE FALSE END as is_admin,
          au.role_type as admin_role
         FROM users u
         LEFT JOIN admin_users au ON u.id = au.user_id
         WHERE u.is_agent = 0 AND au.user_id IS NULL`;
      
      // Add test user filter - only show test users if showTest is true
      if (showTest) {
        usersQuery += ` AND u.is_test = TRUE`;
      } else {
        usersQuery += ` AND (u.is_test IS NULL OR u.is_test = FALSE)`;
      }
         
      // Add search condition if search term is provided
      if (search) {
        usersQuery += ` AND (
          u.first_name LIKE ? OR 
          u.last_name LIKE ? OR 
          u.email LIKE ? OR 
          u.phone_number LIKE ?
        )`;
      }
      
      // Add ordering and limit
      usersQuery += ` ORDER BY u.created_at DESC LIMIT ?, ?`;
      
      // Prepare query parameters
      const userQueryParams = search ? 
        [`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`, offset, limit] : 
        [offset, limit];
      
      const [users] = await connection.execute(
        usersQuery,
        userQueryParams
      );
      
      if (!users || users.length === 0) {
        connection.release(); // Release connection back to pool
        return res.json({
          data: [],
          pagination: {
            page,
            limit,
            totalItems: 0,
            totalPages: 0
          }
        });
      }
      
      // Extract user IDs for subsequent queries
      const userIds = users.map(user => user.id);
      
      // Prepare comma-separated list of IDs for IN clauses
      const userIdsString = userIds.join(',');
      
      // Run the next 3 queries in parallel for improved performance
      const [assignmentsResult, transactionsResult, activitiesResult] = await Promise.all([
        // Get product assignments using a safe approach for IN clause
        connection.query(
          `SELECT 
            pa.user_id,
            p.id as product_id,
            p.name as product_name,
            p.description as product_description
           FROM product_assignments pa
           JOIN products p ON pa.product_id = p.id
           WHERE pa.user_id IN (${userIds.map(() => '?').join(',')})`,
          userIds
        ),
        
        // Get latest transactions
        connection.query(
          `SELECT 
            t1.user_id,
            t1.created_at as last_transaction,
            t1.type as transaction_type,
            t1.points as transaction_points
           FROM transactions t1
           INNER JOIN (
             SELECT user_id, MAX(created_at) as max_created_at
             FROM transactions
             WHERE user_id IN (${userIds.map(() => '?').join(',')})
             GROUP BY user_id
           ) t2 ON t1.user_id = t2.user_id AND t1.created_at = t2.max_created_at`,
          [...userIds]
        ),
        
        // Get product activities
        connection.query(
          `SELECT 
            pa.id,
            pa.product_id,
            pa.type,
            pa.points_value
           FROM product_activities pa
           JOIN products p ON pa.product_id = p.id
           JOIN product_assignments ps ON p.id = ps.product_id
           WHERE ps.user_id IN (${userIds.map(() => '?').join(',')})
           GROUP BY pa.id, pa.product_id, pa.type, pa.points_value`,
          [...userIds]
        )
      ]);
      
      // Destructure results
      const [assignments] = assignmentsResult;
      const [transactions] = transactionsResult;
      const [activities] = activitiesResult;
      
      // Create lookup maps for faster association
      const transactionsByUserId = {};
      transactions.forEach(t => {
        transactionsByUserId[t.user_id] = t;
      });
      
      // Group activities by product
      const activitiesByProductId = {};
      activities.forEach(a => {
        if (!activitiesByProductId[a.product_id]) {
          activitiesByProductId[a.product_id] = [];
        }
        activitiesByProductId[a.product_id].push({
          id: a.id,
          type: a.type,
          pointsValue: a.points_value
        });
      });
      
      // Group assignments by user
      const assignmentsByUserId = {};
      assignments.forEach(a => {
        if (!assignmentsByUserId[a.user_id]) {
          assignmentsByUserId[a.user_id] = [];
        }
        
        assignmentsByUserId[a.user_id].push({
          id: a.product_id,
          name: a.product_name,
          description: a.product_description,
          activities: activitiesByProductId[a.product_id] || []
        });
      });
      
      // Transform the data
      const transformedCustomers = users.map(user => {
        // Get assignments count and products
        const assignedProducts = assignmentsByUserId[user.id] || [];
        const assignmentCount = assignedProducts.length;
        
        // Get latest transaction
        const transaction = transactionsByUserId[user.id];
        
        // Ensure points is properly converted to a number
        const points = typeof user.points === 'string' 
          ? parseFloat(user.points) 
          : Number(user.points || 0);

        return {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phoneNumber: user.phone_number,
          isEnabled: Boolean(user.is_enabled),
          points,
          createdAt: user.created_at,
          selectedPackage: user.selected_package,
          isAgent: Boolean(user.is_agent),
          isAdmin: Boolean(user.is_admin),
          isTest: Boolean(user.is_test),
          adminRole: user.admin_role,
          assignmentCount,
          assignedProducts,
          lastActivity: transaction ? {
            date: transaction.last_transaction,
            type: transaction.transaction_type,
            points: transaction.transaction_points
          } : null,
          idNumber: user.id_number || '',
          dateOfBirth: user.date_of_birth || '',
          gender: user.gender || '',
          occupation: user.occupation || '',
          industry: user.industry || '',
          address: user.address || '',
          city: user.city || '',
          postalCode: user.postal_code || '',
          bankName: user.bank_name || '',
          accountType: user.account_type || '',
          accountNumber: user.account_number || '',
          accountHolderName: user.account_holder_name || '',
          branchCode: user.branch_code || '',
          hasCreditCard: Boolean(user.has_credit_card),
          cardStatus: user.card_status || 'NOT_DELIVERED',
          isSouthAfrican: Boolean(user.is_south_african),
          agentId: user.agent_id || null
        };
      });
      
      console.timeEnd('customersQuery'); // End timing
      
      console.log('Processed customers data:', {
        count: transformedCustomers.length,
        sample: transformedCustomers[0] ? {
          id: transformedCustomers[0].id,
          firstName: transformedCustomers[0].firstName,
          lastName: transformedCustomers[0].lastName
        } : null
      });
      
      // Create response object with pagination metadata
      const response = {
        data: transformedCustomers,
        pagination: {
          page,
          limit,
          totalItems: totalCustomers,
          totalPages
        }
      };
      
      // Update cache with the new data
      customersCache.set(cacheKey, {
        data: response,
        timestamp: now
      });

      res.json(response);
    } catch (error) {
      console.error('Error fetching customers:', error);
      
      // If there's a stale cache for this page, return it rather than showing an error
      if (customersCache.has(cacheKey)) {
        console.log('Returning stale cache due to error');
        return res.json(customersCache.get(cacheKey).data);
      }
      
      // Try to find any cache entry that might be relevant
      if (customersCache.size > 0) {
        // Get the first available cache entry
        const firstCacheKey = Array.from(customersCache.keys())[0];
        console.log('Returning alternative cache due to error');
        return res.json(customersCache.get(firstCacheKey).data);
      }
      
      res.status(500).json({ 
        error: 'Failed to fetch customers',
        details: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      });
    } finally {
      // Release the connection back to the pool
      connection.release();
    }
  });
  
  // Send fund card follow-up email to a customer
  app.post("/api/admin/customers/:id/send-fund-card-email", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { id } = req.params;
    const connection = await createConnection();

    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT is_admin FROM users WHERE id = ?',
        [req.user.id]
      );

      if (!adminCheck || !adminCheck[0]?.is_admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get customer details
      const [customers] = await connection.execute(
        'SELECT * FROM users WHERE id = ? AND is_admin = 0 AND is_agent = 0',
        [id]
      );

      if (!customers || !customers.length) {
        return res.status(404).json({ error: "Customer not found" });
      }

      const customer = customers[0];

      // Log admin action
      await logAdminAction({
        adminId: req.user.id,
        actionType: "ADMIN_MESSAGE",
        targetUserId: parseInt(id),
        details: `Sent fund card follow-up email to ${customer.first_name} ${customer.last_name} (${customer.email})`
      });

      // Send the fund card email
      const emailResult = await sendEmail({
        to: customer.email,
        subject: "Next STEP: Fund your Opian Rewards card!",
        ...formatFundCardEmail(customer.first_name),
        emailType: 'FUND_CARD_FOLLOWUP'
      });

      if (emailResult) {
        res.json({ 
          success: true, 
          message: `Fund card email has been sent successfully to ${customer.email}` 
        });
      } else {
        res.status(500).json({ error: "Failed to send email" });
      }
    } catch (error) {
      console.error("Error sending fund card email:", error);
      res.status(500).json({ 
        error: "Failed to send fund card email",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      await connection.end();
    }
  });

  // Add endpoints for product assignment management
  app.get("/api/admin/products/available", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status using users table
      const [adminCheck] = await connection.execute(
        'SELECT is_admin FROM users WHERE id = ?',
        [req.user.id]
      );

      console.log('Admin check result:', {
        userId: req.user.id,
        adminCheck: adminCheck[0]
      });

      if (!adminCheck || !adminCheck[0]?.is_admin) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get all enabled products with their activities
      const [products] = await connection.execute(
        `SELECT 
          p.id,
          p.name,
          p.description,
          p.is_enabled,
          p.created_at,
          p.updated_at,
          COALESCE(
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', pa.id,
                'type', pa.type,
                'points_value', pa.points_value,
                'created_at', pa.created_at
              )
            ),
            '[]'
          ) as activities
        FROM products p
        LEFT JOIN product_activities pa ON p.id = pa.product_id
        WHERE p.is_enabled = TRUE
        GROUP BY p.id, p.name, p.description, p.is_enabled, p.created_at, p.updated_at
        ORDER BY p.created_at DESC`
      );

      console.log('Products query result:', {
        count: products?.length || 0,
        firstProduct: products?.[0] || null
      });

      // Transform the data
      const transformedProducts = (products || []).map(product => ({
        id: product.id,
        name: product.name,
        description: product.description,
        isEnabled: Boolean(product.is_enabled),
        createdAt: product.created_at,
        updatedAt: product.updated_at,
        activities: JSON.parse(product.activities || '[]')
      }));

      console.log('Sending transformed products:', {
        count: transformedProducts.length,
        sample: transformedProducts[0] || null
      });

      res.json(transformedProducts);
    } catch (error) {
      console.error('Error fetching available products:', error);
      res.status(500).json({ 
        error: 'Failed to fetch products',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      await connection.end();
    }
  });

  // Add endpoint to get assigned products for a specific user
  app.get("/api/admin/users/:userId/products", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status  
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get assigned products with activities
      const [assignments] = await connection.execute(
        `SELECT 
          p.*,
          pa.id as assignment_id,
          pa.created_at as assigned_at,
          COALESCE(
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', act.id,
                'type', act.type,
                'pointsValue', act.points_value,
                'createdAt', act.created_at
              )
            ),
            '[]'
          ) as activities
        FROM product_assignments pa
        JOIN products p ON pa.product_id = p.id
        LEFT JOIN product_activities act ON p.id = act.product_id
        WHERE pa.user_id = ?
        GROUP BY p.id, pa.id
        ORDER BY pa.created_at DESC`,
        [req.params.userId]
      );

      console.log('User product assignments fetched:', {
        userId: req.params.userId,
        count: assignments.length,
        sample: assignments[0]
      });

      // Transform the data
      const transformedAssignments = assignments.map(assignment => ({
        id: assignment.id,
        name: assignment.name,
        description: assignment.description,
        isEnabled: Boolean(assignment.is_enabled),
        assignmentId: assignment.assignment_id,
        assignedAt: assignment.assigned_at,
        activities: JSON.parse(assignment.activities || '[]')
      }));

      res.json(transformedAssignments);
    } catch (error) {
      console.error('Error fetching user product assignments:', error);
      res.status(500).json({ error: 'Failed to fetch product assignments' });
    } finally {
      await connection.end();
    }
  });

  const httpServer = createServer(app);
  const wsServer = setupWebSocketServer(httpServer, sessionMiddleware);

  // Add agent customer management endpoints
  app.get("/api/agent/customers", checkAgent, async (req, res) => {
    const connection = await createConnection();
    try {
      console.log('Fetching agent customers...');
      // Get customers associated with this agent
      const [customers] = await connection.execute(
        `SELECT id, first_name, last_name, 
                email, phone_number, points, 
                is_enabled, selected_package
         FROM users 
         WHERE agent_id = ?
         ORDER BY created_at DESC`,
        [req.session?.passport?.user]
      );

      console.log('Agent customers query result:', {
        count: customers?.length || 0,
        firstCustomer: customers?.[0] ? {
          id: customers[0].id,
          firstName: customers[0].first_name,
          lastName: customers[0].last_name
        } : null
      });

      // Transform the data
      const transformedCustomers = (customers || []).map(customer => ({
        id: customer.id,
        firstName: customer.first_name,
        lastName: customer.last_name,
        email: customer.email,
        phoneNumber: customer.phone_number,
        points: Number(customer.points || 0),
        isEnabled: Boolean(customer.is_enabled),
        selectedPackage: customer.selected_package
      }));

      console.log('Sending transformed agent customers:', {
        count: transformedCustomers.length,
        sample: transformedCustomers[0] ? {
          id: transformedCustomers[0].id,
          firstName: transformedCustomers[0].firstName,
          lastName: transformedCustomers[0].lastName
        } : null
      });

      res.json(transformedCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ 
        error: 'Failed to fetch customers',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined  
      });
    } finally {
      await connection.end();
    }
  });

  // Add customer creation endpoint for agents
  app.post("/api/agent/customers/create", checkAgent, async (req, res) => {
    const connection = await createConnection();
    try {
      console.log('Creating customer for agent...');
      const { 
        firstName, lastName, email, phoneNumber, 
        industry, occupation, address, city, 
        postalCode, selectedPackage,
        idNumber, dateOfBirth, gender,
        isSouthAfrican
      } = req.body;

      console.log('Customer creation request:', {
        email,
        firstName,
        lastName,
        selectedPackage
      });

      // Check for existing user
      const [existingUser] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if ((existingUser || []).length > 0) {
        console.log('Customer creation failed: email already exists:', email);
        return res.status(400).json({ error: "Email already exists" });
      }

      // Calculate initial points based on selected package
      let initialPoints = 0;
      switch (selectedPackage) {
        case 'OPPORTUNITY': initialPoints = 2500; break;
        case 'MOMENTUM': initialPoints = 5000; break;
        case 'PROSPER': initialPoints = 7500; break;
        case 'PRESTIGE': initialPoints = 10000; break;
        case 'PINNACLE': initialPoints = 12500; break;
      }

      console.log('Initial points for package:', {
        package: selectedPackage,
        points: initialPoints
      });

      await connection.beginTransaction();

      try {
        // Generate a random password for the customer
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await crypto.hash(tempPassword);

        console.log('Creating user in database...');
        // Create user with all fields
        const [userResult] = await connection.execute(
          `INSERT INTO users (
            email, password, first_name, last_name, 
            phone_number, is_enabled, points, selected_package,
            industry, occupation, address, city, postal_code,
            id_number, date_of_birth, gender, is_south_african,
            agent_id
          ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            email,
            hashedPassword,
            firstName,
            lastName,
            phoneNumber,
            initialPoints,
            selectedPackage,
            industry || null,
            occupation || null,
            address || null,
            city || null,
            postalCode || null,
            idNumber || null,
            dateOfBirth || null,
            gender || null,
            isSouthAfrican || false,
            req.session?.passport?.user // Associate with the agent
          ]
        );

        const userId = userResult?.insertId;
        console.log('User created with ID:', userId);

        // Record the points transaction
        if (initialPoints > 0) {
          console.log('Recording welcome bonus transaction...');
          await connection.execute(
            `INSERT INTO transactions (
              user_id, points, type, description
            ) VALUES (?, ?, ?, ?)`,
            [
              userId,
              initialPoints,
              'WELCOME_BONUS',
              `Welcome bonus points for ${selectedPackage} package`
            ]
          );
        }

        await connection.commit();
        console.log('Customer creation transaction committed successfully');

        res.status(201).json({
          message: "Customer created successfully",
          customerId: userId,
          temporaryPassword: tempPassword // Include the temporary password in the response
        });
      } catch (error) {
        console.error('Error in customer creation transaction:', error);
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ 
        error: 'Failed to create customer',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      await connection.end();
    }
  });

  app.get("/api/customer/referral", async (req, res) => {
    if (!req.user) {
      console.log("Referral API: Authentication check failed");
      return res.status(401).json({ error: "Unauthorized" });
    }

    const connection = await createConnection();
    
    try {
      console.log("Referral API: Fetching referral data for user:", req.user.id);
      
      // Check if user has access to the referral program (PROSPER, PRESTIGE, or PINNACLE package)
      const [packageCheck] = await connection.execute(
        `SELECT selected_package FROM users WHERE id = ?`,
        [req.user.id]
      );
      
      if (!packageCheck || packageCheck.length === 0) {
        console.log(`Referral API: User ${req.user.id} not found in database`);
        return res.status(404).json({ error: "User not found" });
      }
      
      // Get user package and convert to uppercase for consistent case-insensitive comparison
      const userCurrentPackage = packageCheck[0].selected_package;
      const allowedPackages = ['PROSPER', 'PRESTIGE', 'PINNACLE'];
      
      // Convert to uppercase for case-insensitive comparison
      const userPackageUpper = userCurrentPackage ? userCurrentPackage.toUpperCase() : '';
      
      console.log(`REFERRAL API: Checking package access for user ${req.user.id}: package="${userCurrentPackage}" (uppercase: "${userPackageUpper}"), eligible=${allowedPackages.includes(userPackageUpper)}`);
      
      // Case-insensitive check for package eligibility
      if (!userCurrentPackage || !allowedPackages.includes(userPackageUpper)) {
        console.log(`REFERRAL API: ⛔ Access denied to referral system for user ${req.user.id} with package "${userCurrentPackage}"`);
        return res.status(403).json({ 
          error: "Package upgrade required", 
          message: "Referral program is only available for PROSPER package or higher",
          details: {
            currentPackage: userCurrentPackage, // Original case preserved
            requiredPackages: allowedPackages,
            eligibleCheck: allowedPackages.includes(userPackageUpper)
          }
        });
      }
      
      console.log(`REFERRAL API: ✅ Access granted to referral system for user ${req.user.id} with package "${userCurrentPackage}"`)
    } catch (error) {
      console.error("Error checking user package:", error);
      return res.status(500).json({ 
        error: "Failed to check package eligibility",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
    try {
      console.log('Fetching referral info for user:', req.user.id);

      // First get user's referral code
      const [userInfo] = await connection.execute(
        `SELECT referral_code, first_name, last_name 
         FROM users 
         WHERE id = ?`,
        [req.user.id]
      );

      if (!userInfo || userInfo.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Generate referral code if none exists
      let referralCode = userInfo[0].referral_code;
      if (!referralCode) {
        referralCode = `REF${req.user.id}${Date.now().toString(36)}`;
        await connection.execute(
          'UPDATE users SET referral_code = ? WHERE id = ?',
          [referralCode, req.user.id]
        );
      }

      // Get direct referrals with their package info and nested referrals count
      // MariaDB doesn't support the JSON_ARRAYAGG in the same way as other MySQL versions
      // So we'll use a simpler query and build the package stats in JavaScript
      
      // First get basic referral tree
      const [referrals] = await connection.execute(
        `WITH RECURSIVE referral_tree AS (
          -- Base case: direct referrals (level 1)
          SELECT 
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            u.selected_package,
            u.created_at,
            u.referral_code,
            1 as level,
            pp.premium_amount as package_amount
          FROM users u
          LEFT JOIN package_premium_amounts pp ON pp.package_type = u.selected_package
          WHERE u.referred_by = ?

          UNION ALL

          -- Recursive case: find nested referrals
          SELECT 
            u.id,
            u.first_name,
            u.last_name,
            u.email,
            u.selected_package,
            u.created_at,
            u.referral_code,
            rt.level + 1,
            pp.premium_amount
          FROM users u
          LEFT JOIN package_premium_amounts pp ON pp.package_type = u.selected_package
          INNER JOIN referral_tree rt ON u.referred_by = rt.referral_code
          WHERE rt.level < 3
        )
        SELECT 
          rt.*,
          (
            SELECT COUNT(*) 
            FROM users u2 
            WHERE u2.referred_by = rt.referral_code
          ) as direct_referral_count
        FROM referral_tree rt
        ORDER BY rt.level, rt.created_at DESC`,
        [referralCode]
      );
      
      // Now let's get the package stats for each referral separately
      for (const referral of referrals) {
        // Get package counts for this referral's direct referrals
        if (referral.referral_code) {
          const [packageStats] = await connection.execute(
            `SELECT selected_package as package, COUNT(*) as count
             FROM users
             WHERE referred_by = ?
             GROUP BY selected_package`,
            [referral.referral_code]
          );
          
          // Add the package stats to the referral object
          referral.referral_package_stats = packageStats.length > 0 ? JSON.stringify(packageStats) : '[]';
        } else {
          referral.referral_package_stats = '[]';
        }
      }

      // Get package prices for commission calculations
      const [packagePrices] = await connection.execute(
        'SELECT package_type, premium_amount FROM package_premium_amounts'
      );

      const packagePriceMap = packagePrices.reduce((acc: any, pkg: any) => {
        acc[pkg.package_type] = pkg.premium_amount;
        return acc;
      }, {});

      // Transform referrals data with commission calculations
      const transformedReferrals = referrals.map((referral: any) => {
        // Calculate commission based on level
        const commissionPercentage = 
          referral.level === 1 ? 0.075 : // 7.5% for level 1
          referral.level === 2 ? 0.05 : // 5% for level 2
          referral.level === 3 ? 0.025 : // 2.5% for level 3
          0;
        
        const packageAmount = referral.package_amount || 0;
        const randValue = packageAmount * commissionPercentage;
        // Use a fixed 2000 points value for all referrals as required
        const points = referral.level === 1 ? 2000 : Math.floor(randValue * 100);

        // Parse referral package stats
        const packageStats = referral.referral_package_stats 
          ? JSON.parse(referral.referral_package_stats)
          : [];

        return {
          id: referral.id,
          firstName: referral.first_name,
          lastName: referral.last_name,
          email: referral.email,
          selectedPackage: referral.selected_package,
          createdAt: referral.created_at,
          level: referral.level,
          directReferralCount: referral.direct_referral_count,
          referralPackageStats: packageStats,
          commission: {
            percentage: commissionPercentage * 100, // Convert to percentage
            randValue: randValue.toFixed(2),
            points: points
          }
        };
      });

      // Group direct referrals by package type with their referral stats
      const directReferrals = transformedReferrals
        .filter(ref => ref.level === 1)
        .reduce((acc: any, ref: any) => {
          const packageType = ref.selectedPackage || 'UNKNOWN';
          if (!acc[packageType]) {
            acc[packageType] = {
              count: 0,
              totalReferrals: 0,
              referralsByPackage: {
                OPPORTUNITY: 0,
                MOMENTUM: 0,
                PROSPER: 0,
                PRESTIGE: 0,
                PINNACLE: 0
              },
              commission: {
                percentage: 7.5,
                baseAmount: packagePriceMap[packageType] || 0
              }
            };
          }
          acc[packageType].count++;
          acc[packageType].totalReferrals += ref.directReferralCount;
          
          // Add up referrals by package
          ref.referralPackageStats.forEach((stat: any) => {
            if (stat.package) {
              acc[packageType].referralsByPackage[stat.package] += stat.count;
            }
          });
          
          return acc;
        }, {});

      // Group all referrals by level for the full tree view
      const groupedReferrals = transformedReferrals.reduce((acc: any, ref: any) => {
        if (!acc[ref.level]) {
          acc[ref.level] = [];
        }
        acc[ref.level].push(ref);
        return acc;
      }, {});

      res.json({
        referralCode,
        referralCount: referrals.length,
        packagePrices: packagePriceMap,
        directReferralsByPackage: directReferrals,
        referralsByLevel: groupedReferrals
      });
    } catch (error) {
      console.error('Error fetching referral data:', error);
      res.status(500).json({ error: 'Failed to fetch referral data' });
    } finally {
      await connection.end();
    }
  });


  // Fetch product assignments with activities
  app.get("/api/products/assignments/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      console.log('Fetching assignment details for ID:', id);

      // First get the base assignment data
      const [assignments] = await connection.execute(
        `SELECT 
          pa.id,
          pa.product_id,
          pa.user_id,
          pa.created_at,
          p.name as product_name,
          p.description as product_description,
          p.is_enabled as product_is_enabled,
          u.email as user_email,
          u.first_name as user_first_name,
          u.last_name as user_last_name
         FROM product_assignments pa
         JOIN products p ON pa.product_id = p.id
         JOIN users u ON pa.user_id = u.id
         WHERE pa.id = ?`,
        [id]
      );

      if (!assignments || assignments.length === 0) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      const assignment = assignments[0];
      console.log('Found assignment:', {
        id: assignment.id,
        productId: assignment.product_id,
        userId: assignment.user_id
      });

      // Then get the activities for this product
      const [activities] = await connection.execute(
        `SELECT id, type, points_value
         FROM product_activities
         WHERE product_id = ?`,
        [assignment.product_id]
      );

      console.log('Found activities:', activities);

      const transformedAssignment = {
        id: assignment.id,
        productId: assignment.product_id,
        userId: assignment.user_id,
        createdAt: assignment.created_at,
        product: {
          id: assignment.product_id,
          name: assignment.product_name,
          description: assignment.product_description,
          isEnabled: Boolean(assignment.product_is_enabled),
          activities: activities.map(activity => ({
            id: activity.id,
            type: activity.type,
            pointsValue: activity.points_value
          }))
        },
        user: {
          id: assignment.user_id,
          email: assignment.user_email,
          firstName: assignment.user_first_name,
          lastName: assignment.user_last_name
        }
      };

      console.log('Sending assignment with activities:', {
        assignmentId: transformedAssignment.id,
        productId: transformedAssignment.productId,
        activityCount: transformedAssignment.product.activities.length
      });

      res.json(transformedAssignment);
    } catch (error) {
      console.error('Error fetching assignment:', error);
      res.status(500).json({ error: 'Failed to fetch assignment' });
    } finally {
      await connection.end();
    }
  });

  app.get("/api/admin/logs", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Get admin logs with user details
      const [logs] = await connection.execute(
        `SELECT 
          al.*,
          admin.email as admin_email,
          admin.first_name as admin_first_name,
          admin.last_name as admin_last_name,
          target.email as target_email,
          target.first_name as target_first_name,
          target.last_name as target_last_name
         FROM admin_logs al
         JOIN users admin ON al.admin_id = admin.id
         LEFT JOIN users target ON al.target_user_id = target.id
         ORDER BY al.created_at DESC`
      );

      // Transform the logs data
      const transformedLogs = logs.map((log: any) => ({
        id: log.id,
        actionType: log.action_type,
        details: log.details,
        createdAt: log.created_at,
        admin: {
          id: log.admin_id,
          email: log.admin_email,
          firstName: log.admin_first_name,
          lastName: log.admin_last_name
        },
        targetUser: log.target_user_id ? {
          id: log.target_user_id,
          email: log.target_email,
          firstName: log.target_first_name,
          lastName: log.target_last_name
        } : null
      }));

      res.json(transformedLogs);
    } catch (error) {
      console.error('Error fetching admin logs:', error);
      res.status(500).json({ error: 'Failed to fetch admin logs' });
    } finally {
      await connection.end();
    }
  });

  app.post("/api/admin/points", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { userId, points, description } = req.body;
      console.log('Points assignment request:', { userId, points, description });

      await connection.beginTransaction();

      try {
        // Get target user
        const [users] = await connection.execute(
          'SELECT id, email, first_name, last_name, points FROM users WHERE id = ?',
          [userId]
        );

        if (!users || users.length === 0) {
          throw new Error("User not found");
        }

        const targetUser = users[0];

        // Get admin user
        const [admins] = await connection.execute(
          'SELECT id, email, first_name, last_name FROM users WHERE id = ?',
          [req.user.id]
        );

        const admin = admins[0];

        // Insert transaction
        const [transactionResult] = await connection.execute(
          `INSERT INTO transactions (user_id, points, type, description)
           VALUES (?, ?, 'ADMIN_ADJUSTMENT', ?)`,
          [userId, points, description]
        );

        // Update user points
        await connection.execute(
          'UPDATE users SET points = points + ? WHERE id = ?',
          [points, userId]
        );

        // Get updated user points
        const [updatedUsers] = await connection.execute(
          'SELECT points FROM users WHERE id = ?',
          [userId]
        );

        const tierPoints = updatedUsers[0].points;
        let currentTier = "Bronze";
        if (tierPoints >= 150000) currentTier = "Platinum";
        else if (tierPoints >= 100000) currentTier = "Gold";
        else if (tierPoints >= 50000) currentTier = "Purple";
        else if (tierPoints >= 10000) currentTier = "Silver";

        // Insert admin log
        await connection.execute(
          `INSERT INTO admin_logs (admin_id, action_type, target_user_id, details)
           VALUES (?, 'POINT_ADJUSTMENT', ?, ?)`,
          [req.user.id, userId, `Adjusted points by ${points}. Reason: ${description}`]
        );

        await connection.commit();

        // Send notifications and emails
        try {
          const customerEmail = formatPointsAssignmentEmail(
            targetUser.first_name || "Valued Customer",
            points,
            description,
            currentTier
          );
          await sendEmail({
            to: targetUser.email,
            subject: "Points Added to Your Account",
            text: customerEmail.text,
            html: customerEmail.html
          });

          const adminEmail = formatAdminNotificationEmail(
            `${targetUser.first_name} ${targetUser.last_name}`,
            points,
            description,
            admin.first_name || "Admin"
          );
          await sendEmail({
            to: admin.email,
            subject: `Points Assignment Confirmation: ${targetUser.first_name} ${targetUser.last_name}`,
            text: adminEmail.text,
            html: adminEmail.html
          });
        } catch (emailError) {
          console.error('Error sending emails:', emailError);
          // Don't fail the transaction if emails fail
        }

        console.log('Points assigned successfully:', {
          userId,
          points,
          newTotal: tierPoints,
          currentTier
        });

        res.json({ 
          message: "Points adjusted successfully",
          newPoints: tierPoints,
          tier: currentTier
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error adjusting points:', error);
      res.status(500).json({ error: 'Failed to adjust points' });
    } finally {
      await connection.end();
    }
  });

  app.post("/api/admin/users/toggle-agent", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { userId, isAgent } = req.body;

    try {
      const [user] = await db
        .update(users)
        .set({ isAgent })
        .where(eq(users.id, userId))
        .returning();

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await logAdminAction({
        adminId: req.user.id,
        actionType: "ADMIN_UPDATED",
        targetUserId: user.id,
        details: `${isAgent ? 'Added' : 'Removed'} agent status for user: ${user.email}`,
      });

      res.json({ message: `User ${isAgent ? 'made agent' : 'removed from agents'} successfully` });
    } catch (error) {
      console.error('Error toggling agent status:', error);
      res.status(500).json({ error: 'Failed to update agent status' });
    }
  });



  app.post("/api/admin/users/create", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { email, password, firstName, lastName, phoneNumber, isAgent } = req.body;
      
      // Validate required fields
      if (!email || !password || !firstName || !lastName || !phoneNumber) {
        return res.status(400).json({ error: "All fields are required" });
      }

      // Log the creation attempt
      console.log('Creating user with data:', {
        email,
        firstName,
        lastName,
        phoneNumber,
        isAgent,
        adminId: req.user.id
      });

      // Check for existing user
      const [existingUser] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const hashedPassword = await crypto.hash(password);

      await connection.beginTransaction();

      try {
        // Create user with all fields properly set
        const [userResult] = await connection.execute(
          `INSERT INTO users (
            email, password, first_name, last_name, 
            phone_number, is_enabled, points, is_agent,
            agent_id
          ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
          [
            email,
            hashedPassword,
            firstName,
            lastName,
            phoneNumber,
            0, // Initial points
            isAgent ? 1 : 0, // is_agent flag
            isAgent ? req.user.id : null // Set agent_id for agents
          ]
        );

        const userId = userResult.insertId;

        // Create admin role if not agent
        if (!isAgent) {
          await connection.execute(
            `INSERT INTO admin_users (user_id, role_type)
             VALUES (?, ?)`,
            [userId, 'ADMIN']
          );
        }

        await connection.commit();

        // Log the action
        await logAdminAction({
          adminId: req.user.id,
          actionType: isAgent ? "AGENT_CREATED" : "ADMIN_CREATED",
          targetUserId: userId,
          details: `Created new ${isAgent ? 'agent' : 'admin'}: ${email}`,
        });

        // Fetch complete user data
        const [updatedUser] = await connection.execute(
          `SELECT u.*, 
           CASE WHEN au.role_type = 'SUPER_ADMIN' THEN 1 ELSE 0 END as is_super_admin,
           CASE WHEN au.role_type IS NOT NULL THEN 1 ELSE 0 END as is_admin
           FROM users u
           LEFT JOIN admin_users au ON u.id = au.user_id
           WHERE u.id = ?`,
          [userId]
        );

        const { password: _, ...safeUser } = updatedUser[0];

        console.log('User created successfully:', {
          id: userId,
          email,
          isAgent: Boolean(isAgent),
          agentId: isAgent ? req.user.id : null
        });

        res.status(201).json({
          ...safeUser,
          is_admin: !isAgent,
          is_agent: Boolean(isAgent),
          is_super_admin: false
        });
      } catch (error) {
        await connection.rollback();
        console.error('Transaction failed:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: 'Failed to create user', details: error.message });
    } finally {
      await connection.end();
    }
  });
  
  // Generate test customers endpoint moved to test-customer-routes.ts
  app.post("/api/disabled-removed", async (req, res) => {
    res.status(404).json({ error: "Endpoint has been moved to test-customer-routes.ts" });
  });

  app.put("/api/admin/users/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { id } = req.params;
    const { email, firstName, lastName, phoneNumber, password } = req.body;

    try {
      const updates: any = {
        email,
        firstName,
        lastName,
        phoneNumber,
      };

      if (password) {
        updates.password = await crypto.hash(password);
      }

      const [user] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, parseInt(id)))
        .returning()
        .execute();

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      await logAdminAction({
        adminId: req.user.id,
        actionType: "ADMIN_UPDATED",
        targetUserId: user.id,
        details: `Updated admin user: ${user.email}`,
      });

      // Don't send the password back
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      console.error('Error updating user:', error);
      res.status(500).json({ error: 'Failed to update user' });
    }
  });

  // Add the transactions endpoint
  app.get("/api/customer/transactions", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const connection = await createConnection();
    try {
      console.log('Fetching transactions for user:', req.user.id);

      const [transactions] = await connection.execute(
        `SELECT 
          t.*,
          DATE_FORMAT(t.created_at, '%Y-%m-%dT%H:%i:%s.000Z') as formatted_date
        FROM transactions t
        WHERE t.user_id = ?
        ORDER BY t.created_at DESC`,
        [req.user.id]
      );

      console.log('Found transactions:', transactions.length);

      // Transform the transactions data
      const transformedTransactions = transactions.map((t: any) => ({
        id: t.id,
        points: t.points,
        type: t.type,
        description: t.description,
        createdAt: t.formatted_date
      }));

      res.json(transformedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    } finally {
      await connection.end();
    }
  });

  // Add proper error handling and validation for cash redemption
  app.post("/api/rewards/redeem-cash", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const connection = await createConnection();
    try {
      console.log('Cash redemption request:', {
        userId: req.user.id,
        amount: req.body.amount
      });

      // Start transaction
      await connection.beginTransaction();

      try {
        // Get user's current points
        const [users] = await connection.execute(
          'SELECT points FROM users WHERE id = ?',
          [req.user.id]
        );

        if (!users || users.length === 0) {
          throw new Error("User not found");
        }

        const user = users[0];
        const redemptionAmount = Number(req.body.amount);
        const pointsRequired = redemptionAmount * 100; // 1 ZAR = 100 points

        console.log('Redemption calculation:', {
          currentPoints: user.points,
          pointsRequired,
          redemptionAmount
        });

        // Validate points balance
        if (user.points < pointsRequired) {
          throw new Error("Insufficient points balance");
        }

        // Update user points
        await connection.execute(
          'UPDATE users SET points = points - ? WHERE id = ?',
          [pointsRequired, req.user.id]
        );

        // Record the transaction
        await connection.execute(
          `INSERT INTO transactions (
            user_id, points, type, description
          ) VALUES (?, ?, ?, ?)`,
          [
            req.user.id,
            -pointsRequired,
            'CASH_REDEMPTION',
            `Redeemed R${redemptionAmount.toFixed(2)} in cash`
          ]
        );

        await connection.commit();

        // Get updated points balance
        const [updated] = await connection.execute(
          'SELECT points FROM users WHERE id = ?',
          [req.user.id]
        );

        console.log('Redemption successful:', {
          userId: req.user.id,
          newBalance: updated[0].points
        });

        res.json({
          message: "Points redeemed successfully",
          newBalance: updated[0].points
        });

      } catch (error) {
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error processing redemption:', error);
      res.status(500).json({
        error: error.message || "Failed to process redemption"
      });
    } finally {
      await connection.end();
    }
  });

  app.put("/api/admin/users/:id/details", async (req, res) => {
    console.log('Update user details request:', {
      isAuthenticated: req.isAuthenticated(),
      userId: req.params.id,
      user: req.user ? {
        id: req.user.id,
        email: req.user.email
      } : null
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        console.log('User not found in admin_users:', req.user.id);
        return res.status(403).json({ error: "Admin access required" });
      }

      // Convert selectedPackage to uppercase before update
      const updateData = {
        ...req.body,
        selected_package: req.body.selectedPackage ? String(req.body.selectedPackage).toUpperCase() : null
      };

      // Update user details
      const [result] = await connection.execute(
        `UPDATE users SET
          first_name = ?,
          last_name = ?,
          email = ?,
          phone_number = ?,
          selected_package = ?,
          industry = ?,
          occupation = ?,
          address = ?,
          city = ?,
          postal_code = ?
        WHERE id = ?`,
        [
          updateData.firstName,
          updateData.lastName,
          updateData.email,
          updateData.phoneNumber,
          updateData.selected_package,
          updateData.industry,
          updateData.occupation,
          updateData.address,
          updateData.city,
          updateData.postalCode,
          req.params.id
        ]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      // Fetch updated user data
      const [updatedUser] = await connection.execute(
        'SELECT * FROM users WHERE id = ?',
        [req.params.id]
      );

      const user = updatedUser[0];
      const { password: _, ...safeUser } = user;

      res.json(safeUser);
    } catch (error) {
      console.error('Error updating user details:', error);
      res.status(500).json({ error: 'Failed to update user details' });
    } finally {
      await connection.end();
    }
  });

  // Removed duplicate /api/admin/users endpoint

  // This code belongs to another function, moved to the correct context
  app.put("/api/user-profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Build updates object
      const updates = { ...req.body };

      // Handle password update separately if provided
      if (req.body.password) {
        updates.password = await crypto.hash(req.body.password);
      } else {
        delete updates.password;
      }

      // Map any addressLine1 to address field
      if (updates.addressLine1) {
        updates.address = updates.addressLine1;
        delete updates.addressLine1;
      }

      // Remove any fields that don't exist in the database
      const invalidFields = ['addressLine2'];
      invalidFields.forEach(field => delete updates[field]);

      // Remove any undefined or null values
      Object.keys(updates).forEach(key => {
        if (updates[key] === undefined || updates[key] === null) {
          delete updates[key];
        }
      });

      // If no fields to update, return current user
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }

      await connection.beginTransaction();

      try {
        // Build the SET clause dynamically
        const setClause = Object.keys(updates)
          .map(key => `${key} = ?`)
          .join(', ');
        const values = [...Object.values(updates), req.user.id];

        // Update user
        await connection.execute(
          `UPDATE users SET ${setClause} WHERE id = ?`,
          values
        );

        // Fetch updated user
        const [updatedUsers] = await connection.execute(
          'SELECT * FROM users WHERE id = ?',
          [req.user.id]
        );

        if (!updatedUsers || updatedUsers.length === 0) {
          throw new Error("Failed to fetch updated user");
        }

        await connection.commit();

        // Don't send the password back
        const { password: _, ...safeUser } = updatedUsers[0];
        res.json(safeUser);
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ 
        error: "Failed to update profile", 
        message: error instanceof Error ? error.message : "Unknown error occurred"
      });
    } finally {
      await connection.end();
    }
  });

  // Support both PUT and POST methods for toggle-status
  app.use("/api/admin/users/:id/toggle-status", async (req, res) => {
    // Only allow PUT and POST methods
    if (req.method !== 'PUT' && req.method !== 'POST') {
      return res.status(405).json({ error: "Method not allowed" });
    }
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const { enabled } = req.body;

      const [result] = await connection.execute(
        'UPDATE users SET is_enabled = ? WHERE id = ?',
        [enabled ? 1 : 0, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const [updatedUser] = await connection.execute(
        'SELECT * FROM users WHERE id = ?',
        [id]
      );

      const user = updatedUser[0];
      const { password: _, ...safeUser } = user;

      res.json(safeUser);
    } catch (error) {
      console.error('Error toggling user status:', error);
      res.status(500).json({ error: 'Failed to toggle user status' });
    } finally {
      await connection.end();
    }
  });

  app.get("/api/quote-requests", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const [requests] = await connection.execute(
        `SELECT qr.*, 
          u.email as user_email,
          u.first_name as user_first_name,
          u.last_name as user_last_name
         FROM quote_requests qr
         JOIN users u ON qr.user_id = u.id
         ORDER BY qr.created_at DESC`
      );

      res.json(requests);
    } catch (error) {
      console.error('Error fetching quote requests:', error);
      res.status(500).json({ error: 'Failed to fetch quote requests' });
    } finally {
      await connection.end();
    }
  });

  app.post("/api/products", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { name, description, activities } = req.body;

      console.log('Creating product with activities:', {
        name,
        description,
        activities: activities?.map(a => ({ type: a.type, pointsValue: a.pointsValue }))
      });

      await connection.beginTransaction();

      try {
        // Create product
        const [productResult] = await connection.execute(
          `INSERT INTO products (name, description, is_enabled)
           VALUES (?, ?, 1)`,
          [name, description]
        );

        const productId = productResult.insertId;
        console.log('Created product with ID:', productId);

        // Create product activities
        if (activities && Array.isArray(activities)) {
          for (const activity of activities) {
            if (!activity.type || activity.pointsValue === undefined) {
              console.error('Invalid activity data:', activity);
              continue;
            }

            console.log('Creating activity:', {
              productId,
              type: activity.type,
              pointsValue: activity.pointsValue
            });

            try {
              const [activityResult] = await connection.execute(
                `INSERT INTO product_activities (product_id, type, points_value)
                 VALUES (?, ?, ?)`,
                [productId, activity.type, activity.pointsValue]
              );

              console.log('Created activity:', activityResult.insertId);
            } catch (activityError) {
              console.error('Error creating activity:', activityError);
              throw activityError;
            }
          }
        }

        await connection.commit();

        // Fetch complete product data with activities
        const [products] = await connection.execute(
          `SELECT 
            p.*,
            COALESCE(
              GROUP_CONCAT(
                JSON_OBJECT(
                  'id', pa.id,
                  'type', pa.type,
                  'pointsValue', pa.points_value
                )
              ),
              NULL
            ) as activities
           FROM products p
           LEFT JOIN product_activities pa ON p.id = pa.product_id
           WHERE p.id = ?
           GROUP BY p.id`,
          [productId]
        );

        if (!products || products.length === 0) {
          throw new Error('Product not found after creation');
        }

        const product = products[0];

        // Parse activities
        let parsedActivities = [];
        try {
          if (product.activities) {
            parsedActivities = product.activities.split(',').map(activity => {
              try {
                return JSON.parse(activity);
              } catch (e) {
                console.error('Error parsing activity:', e);
                return null;
              }
            }).filter(activity => activity && activity.id && activity.type);
          }
        } catch (e) {
          console.error('Error parsing activities:', e);
          console.log('Raw activities string:', product.activities);
        }

        const transformedProduct = {
          id: product.id,
          name: product.name,
          description: product.description,
          isEnabled: Boolean(product.is_enabled),
          createdAt: product.created_at,
          activities: parsedActivities
        };

        console.log('Product created successfully:', {
          id: transformedProduct.id,
          name: transformedProduct.name,
          activitiesCount: transformedProduct.activities.length
        });

        res.json(transformedProduct);
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error creating product:', error);
      res.status(500).json({ 
        error: 'Failed to create product',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      await connection.end();
    }
  });

  app.get("/api/products", async (req, res) => {
    const connection = await createConnection();
    try {
      console.log('Fetching products...');
      const [products] = await connection.execute(
        `SELECT 
          p.*,
          (SELECT 
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', pa.id,
                'type', pa.type,
                'pointsValue', pa.points_value
              )
            )
           FROM product_activities pa
           WHERE pa.product_id = p.id
          ) as activities
         FROM products p
         ORDER BY p.created_at DESC`
      );

      // Transform the products data
      const transformedProducts = products.map(product => {
        let activities = [];
        try {
          // Handle empty activities case
          if (!product.activities) {
            console.log('No activities found for product:', product.id);
            activities = [];
          } else {
            console.log('Raw activities string for product', product.id, ':', product.activities);
            try {
              activities = JSON.parse(product.activities);
              console.log('Parsed activities for product', product.id, ':', activities);
            } catch (e) {
              console.error('Error parsing activities JSON for product:', product.id, e);
              console.log('Failed activities string:', product.activities);
              activities = [];
            }
          }
        } catch (e) {
          console.error('Error processing activities for product:', product.id, e);
          activities = [];
        }

        return {
          id: product.id,
          name: product.name,
          description: product.description,
          isEnabled: Boolean(product.is_enabled),
          createdAt: product.created_at,
          activities: activities
        };
      });

      console.log(`Found ${transformedProducts.length} products with activities:`, 
        transformedProducts.map(p => ({
          id: p.id,
          name: p.name,
          activityCount: p.activities.length
        }))
      );
      
      res.json(transformedProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ 
        error: 'Failed to fetch products',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      await connection.end();
    }
  });

  app.get("/api/products/customer", async (req, res) => {
    try {
      const allProducts = await db.query.products.findMany({
        where: eq(products.isEnabled, true),
        columns: {          id: true,
          name: true,
          description: true,
        },
        orderBy: desc(products.createdAt),
      });
      res.json(allProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });


  app.put("/api/products/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const { name, description, activities } = req.body;

      console.log('Updating product:', {
        id,
        name,
        description,
        activitiesCount: activities?.length
      });

      await connection.beginTransaction();

      try {
        // Update product
        await connection.execute(
          `UPDATE products 
           SET name = ?, description = ?
           WHERE id = ?`,
          [name, description, id]
        );

        // Delete existing activities
        await connection.execute(
          'DELETE FROM product_activities WHERE product_id = ?',
          [id]
        );

        // Insert new activities
        if (activities && Array.isArray(activities)) {
          for (const activity of activities) {
            await connection.execute(
              `INSERT INTO product_activities (product_id, type, points_value)
               VALUES (?, ?, ?)`,
              [id, activity.type, activity.pointsValue]
            );
          }
        }

        await connection.commit();

        // Fetch updated product with activities
        const [products] = await connection.execute(
          `SELECT 
            p.*,
            COALESCE(
              JSON_ARRAYAGG(
                JSON_OBJECT(
                  'id', pa.id,
                  'type', pa.type,
                  'pointsValue', pa.points_value
                )
              ),
              '[]'
            ) as activities
           FROM products p
           LEFT JOIN product_activities pa ON p.id = pa.product_id
           WHERE p.id = ?
           GROUP BY p.id`,
          [id]
        );

        if (!products || products.length === 0) {
          return res.status(404).json({ error: "Product not found" });
        }

        const product = products[0];

        // Parse the activities JSON string
        let parsedActivities = [];
        try {
          parsedActivities = JSON.parse(product.activities);
          // Remove null entries if any
          parsedActivities = parsedActivities.filter(activity => activity != null);
        } catch (e) {
          console.error('Error parsing activities:', e);
          parsedActivities = [];
        }

        const transformedProduct = {
          id: product.id,
          name: product.name,
          description: product.description,
          isEnabled: Boolean(product.is_enabled),
          createdAt: product.created_at,
          activities: parsedActivities
        };

        console.log('Product updated successfully:', {
          id: transformedProduct.id,
          name: transformedProduct.name,
          activitiesCount: transformedProduct.activities.length
        });

        res.json(transformedProduct);
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error updating product:', error);
      res.status(500).json({ 
        error: 'Failed to update product',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      await connection.end();
    }
  });

  app.post("/api/products/:id/toggle-status", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const { enabled } = req.body;

      // Update product status
      const [result] = await connection.execute(
        'UPDATE products SET is_enabled = ? WHERE id = ?',
        [enabled ? 1 : 0, id]
      );

      if (result.affectedRows === 0) {
        return res.status(404).json({ error: "Product not found" });
      }

      // Fetch updated product
      const [products] = await connection.execute(
        'SELECT * FROM products WHERE id = ?',
        [id]
      );

      const product = products[0];

      // Transform the response
      const transformedProduct = {
        id: product.id,
        name: product.name,
        description: product.description,
        isEnabled: Boolean(product.is_enabled),
        createdAt: product.created_at
      };

      res.json(transformedProduct);
    } catch (error) {
      console.error('Error toggling product status:', error);
      res.status(500).json({ error: 'Failed to toggle product status' });
    } finally {
      await connection.end();
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { id } = req.params;

    try {
      const connection = await createConnection();
      try {
        // First check if product exists
        const [products] = await connection.execute(
          'SELECT name FROM products WHERE id = ?',
          [id]
        );

        if(!products || products.length === 0) {
          return res.status(404).json({ error: "Product not found" });
        }

        const product = products[0];

        // Begin transaction
        await connection.beginTransaction();

        // Delete product activities first (due to foreign key constraint)
        await connection.execute(
          'DELETE FROM product_activities WHERE product_id = ?',
          [id]
        );

        // Delete product assignments (due to foreign key constraint)
        await connection.execute(
          'DELETE FROM product_assignments WHERE product_id = ?',
          [id]
        );

        // Finally delete the product
        await connection.execute(
          'DELETE FROM products WHERE id = ?',
          [id]
        );

        await connection.commit();

        await logAdminAction({
          adminId: req.user.id,
          actionType: "PRODUCT_DELETED",
          details: `Deleted product: ${product.name}`,
        });

        res.json({ message: "Product deleted successfully" });
      } catch (error) {
        await connection.rollback();        throw error;
      } finally{
        await connection.end();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      res.status(500).json({ error: 'Failed to delete product' });
    }
  });

  app.post("/api/products/:id/assign", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const { userId } = req.body;

      // Check if product exists and get its details
      const [products] = await connection.execute(
        `SELECT p.*, 
          GROUP_CONCAT(
            JSON_OBJECT(
              'id', pa.id,
              'type', pa.type,
              'pointsValue', pa.points_value
            )
          ) as activities
         FROM products p
         LEFT JOIN product_activities pa ON p.id = pa.product_id
         WHERE p.id = ? AND p.is_enabled = 1
         GROUP BY p.id`,
        [id]
      );

      if (products.length === 0) {
        return res.status(404).json({ error: "Product not found or is disabled" });
      }

      // Check if user exists
      const [users] = await connection.execute(
        'SELECT * FROM users WHERE id = ? AND is_enabled = 1',
        [userId]
      );

      if (users.length === 0) {
        return res.status(404).json({ error: "User not found or is disabled" });
      }

      // Check if assignment already exists
      const [existingAssignment] = await connection.execute(
        'SELECT id FROM product_assignments WHERE product_id = ? AND user_id = ?',
        [id, userId]
      );

      if (existingAssignment.length > 0) {
        return res.status(400).json({ error: "Customer is already assigned to this product" });
      }

      // Create the assignment
      const [result] = await connection.execute(
        'INSERT INTO product_assignments (product_id, user_id) VALUES (?, ?)',
        [id, userId]
      );

      const product = products[0];
      const user = users[0];

      // Parse activities
      let activities = [];
      try {
        activities = product.activities ? 
          product.activities.split(',').map(activity => JSON.parse(activity)).filter(Boolean) : [];
      } catch (e) {
        console.error('Error parsing activities:', e);
      }

      const transformedAssignment = {
        id: result.insertId,
        productId: product.id,
        userId: user.id,
        createdAt: new Date(),
        product: {
          id: product.id,
          name: product.name,
          description: product.description,
          isEnabled: Boolean(product.is_enabled),
          activities: activities
        },
        user: {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name
        }
      };

      res.json(transformedAssignment);
    } catch (error) {
      console.error('Error assigning product:', error);
      res.status(500).json({ error: 'Failed to assign product' });
    } finally {
      await connection.end();
    }
  });

  app.post("/api/products/:id/unassign", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;
      const { userId } = req.body;

      // Check if assignment exists first
      const [assignment] = await connection.execute(
        `SELECT 
          pa.*,
          p.name as product_name,
          u.email as user_email
         FROM product_assignments pa
         JOIN products p ON pa.product_id = p.id
         JOIN users u ON pa.user_id = u.id
         WHERE pa.product_id = ? AND pa.user_id = ?`,
        [id, userId]
      );

      if (assignment.length === 0) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      // Delete the assignment
      const [result] = await connection.execute(
        'DELETE FROM product_assignments WHERE product_id = ? AND user_id = ?',
        [id, userId]
      );

      if (result.affectedRows === 0) {
        throw new Error('Failed to delete assignment');
      }

      res.json({
        message: "Product unassigned successfully",
        details: `Unassigned ${assignment[0].product_name} from user ${assignment[0].user_email}`
      });
    } catch (error) {
      console.error('Error unassigning product:', error);
      res.status(500).json({ error: 'Failed to unassign product' });
    } finally {
      await connection.end();
    }
  });

  app.get("/api/products/assignments/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const { id } = req.params;

      // Fetch assignment with related data
      const [assignments] = await connection.execute(
        `SELECT 
          pa.*,
          p.name as product_name,
          p.description as product_description,
          p.is_enabled as product_is_enabled,
          u.email as user_email,
          u.first_name as user_first_name,
          u.last_name as user_last_name
         FROM product_assignments pa
         JOIN products p ON pa.product_id = p.id
         JOIN users u ON pa.user_id = u.id
         WHERE pa.id = ?`,
        [id]
      );

      if (!assignments || assignments.length === 0) {
        return res.status(404).json({ error: "Assignment not found" });
      }

      const assignment = assignments[0];
      const transformedAssignment = {
        id: assignment.id,
        productId: assignment.product_id,
        userId: assignment.user_id,
        createdAt: assignment.created_at,
        product: {
          id: assignment.product_id,
          name: assignment.product_name,
          description: assignment.product_description,
          isEnabled: Boolean(assignment.product_is_enabled)
        },
        user: {
          id: assignment.user_id,
          email: assignment.user_email,
          firstName: assignment.user_first_name,
          lastName: assignment.user_last_name
        }
      };

      res.json(transformedAssignment);
    } catch (error) {
      console.error('Error fetching assignment:', error);
      res.status(500).json({ error: 'Failed to fetch assignment' });
    } finally {
      await connection.end();
    }
  });

  app.get("/api/products/customer", async (req, res) => {
    try {      const allProducts = await db.query.products.findMany({
        where: eq(products.isEnabled, true),
        columns: {          id: true,
          name: true,
          description: true,
        },
        orderBy: desc(products.createdAt),
      });
      res.json(allProducts);
    } catch (error) {
      console.error('Error fetching products:', error);
      res.status(500).json({ error: 'Failed to fetch products' });
    }
  });

  app.post("/api/quote-requests", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { productId } = req.body;

    try {
      const existingRequest = await db.query.quoteRequests.findFirst({
        where: sql`${quoteRequests.userId} = ${req.user.id} AND 
                  ${quoteRequests.status} IN ('PENDING', 'IN_PROGRESS')`,
      });

      if (existingRequest) {
        return res.status(400).json({ 
          error: "You already have an active quote request. Please wait for it to be processed." 
        });
      }

      const [product] = await db
        .select()
        .from(products)
        .where(
          sql`${products.id} = ${productId} AND ${products.isEnabled} = true`
        )
        .limit(1)
        .execute();

      if (!product) {
        return res.status(404).json({ error: "Product not found or not available" });
      }

      const [quoteRequest] = await db
        .insert(quoteRequests)
        .values({
          userId: req.user.id,
          productId,
          status: "PENDING",
        })
        .returning()
        .execute();

      const customerEmailContent = formatQuoteRequestEmail(
        req.user.firstName || 'Customer',
        product.name
      );
      await sendEmail({
        to: req.user.email,
        subject: "Quote Request Confirmation",
        text: customerEmailContent.text,
        html: customerEmailContent.html
      });

      const adminUsers = await db
        .select()
        .from(users)
        .where(eq(users.isAdmin, true))
        .execute();

      for(const admin of adminUsers) {
        const adminEmailContent = formatAdminQuoteRequestEmail(
          `${req.user.firstName || 'Customer'} ${req.user.lastName || ''}`,
          req.user.email,
          product.name,
          admin.firstName || 'Admin'
        );

        await sendEmail({
          to: admin.email,
          subject: `New Quote Request - ${product.name}`,
          text: adminEmailContent.text,
          html: adminEmailContent.html
        });
      }

      res.json(quoteRequest);
    } catch (error) {
      console.error('Error creating quote request:', error);
      res.status(500).json({ error: 'Failed to create quote request' });
    }
  });

  app.get("/api/quote-requests", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      const [requests] = await connection.execute(
        `SELECT qr.*, 
          u.email as user_email,
          u.first_name as user_first_name,
          u.last_name as user_last_name
         FROM quote_requests qr
         JOIN users u ON qr.user_id = u.id
         ORDER BY qr.created_at DESC`
      );

      res.json(requests);
    } catch (error) {
      console.error('Error fetching quote requests:', error);
      res.status(500).json({ error: 'Failed to fetch quote requests' });
    } finally {
      await connection.end();
    }
  });

  app.put("/api/quote-requests/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});

    const { id } = req.params;
    const { status, notes } = req.body;

    try {
      const [quoteRequest] = await db
        .select()
        .from(quoteRequests)
        .where(eq(quoteRequests.id, parseInt(id)))
        .limit(1)
        .execute();

      if (!quoteRequest) {
        return res.status(404).json({ error: "Quote request not found" });
      }

      const updates: any = {
        status,
        notes,
        updatedAt: new Date(),
      };

      if (status === "COMPLETED" || status === "REJECTED") {
        updates.completedAt = new Date();
        updates.completedBy = req.user.id;
      }

      const [updatedRequest] = await db
        .update(quoteRequests)
        .set(updates)
        .where(eq(quoteRequests.id, parseInt(id)))
        .returning()
        .execute();

      await db.insert(notifications).values({
        userId: quoteRequest.userId,
        type: "QUOTE_STATUS_CHANGE",
        title: "Quote Request Update",
        message: `Your quote request has been ${status.toLowerCase()}${notes ? `: ${notes}` : ''}`,
        relatedId: quoteRequest.id
      }).execute();

      await logAdminAction({
        adminId: req.user.id,
        actionType: status === "COMPLETED" ? "QUOTE_REQUEST_COMPLETED" : 
                   status === "REJECTED" ? "QUOTE_REQUEST_REJECTED" : 
                   "QUOTE_REQUEST_UPDATED",
        targetUserId: quoteRequest.userId,
        details: `Updated quote request status to ${status}`,
      });

      const completeRequest = await db.query.quoteRequests.findFirst({
        where: eq(quoteRequests.id, parseInt(id)),
        with: {
          user: {
            columns: {
              firstName: true,
              lastName: true,
              email: true
            }
          },
          product: {
            columns: {
              name: true,
              description: true
            }
          },
          completedByUser: {
            columns: {
              firstName: true,
              lastName: true,
            }
          }
        }
      });

      res.json(completeRequest);
    } catch (error) {
      console.error('Error updating quote request:', error);
      res.status(500).json({ error: 'Failed to update quote request' });
    }
  });

  // REMOVED DUPLICATE ENDPOINTS - USING EARLIER DEFINITIONS INSTEAD

  // Customer referrals endpoint - moved from previous duplicate implementation
  app.get("/api/customer/referrals", async (req, res) => {
    if (!req.isAuthenticated()) {
      console.log("Referrals API: Authentication check failed");
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      console.log("Referrals API: Fetching referral stats for user:", req.user.id);
      
      // Get user with referral code
      const [userData] = await connection.execute(
        `SELECT * FROM users WHERE id = ?`,
        [req.user.id]
      );

      if (!userData || userData.length === 0) {
        console.log('No user found with ID:', req.user.id);
        return res.status(404).json({ error: "User not found" });
      }

      const currentUser = userData[0];
      
      // Check if user has PROSPER package or higher - case-insensitive
      const eligiblePackages = ['PROSPER', 'PRESTIGE', 'PINNACLE'];
      const userPackage = currentUser.selected_package ? currentUser.selected_package.toUpperCase() : '';
      
      console.log(`REFERRAL DEBUG: Checking package access for user ${req.user.id}: package="${currentUser.selected_package}" (uppercase: "${userPackage}"), eligible=${eligiblePackages.includes(userPackage)}`);
      console.log(`REFERRAL DEBUG: User data:`, JSON.stringify(currentUser));
      
      if (!eligiblePackages.includes(userPackage)) {
        console.log(`REFERRAL DEBUG: ⛔ Access denied to referral system for user ${req.user.id} with package "${userPackage}"`);
        return res.status(403).json({ 
          error: "Package upgrade required", 
          message: "You need to upgrade to PROSPER package or higher to access the referral program",
          details: {
            currentPackage: currentUser.selected_package, // Original case preserved
            requiredPackages: eligiblePackages,
            eligibleCheck: eligiblePackages.includes(userPackage)
          }
        });
      } else {
        console.log(`REFERRAL DEBUG: ✅ Access granted to referral system for user ${req.user.id} with package "${userPackage}"`);
      }
      
      console.log(`Access granted to referral system for user ${req.user.id} with package ${userPackage}`);
      
      let referralCode = currentUser.referral_code;
      
      // Generate referral code if user doesn't have one
      if (!referralCode) {
        referralCode = randomBytes(8).toString("hex");
        await connection.execute(
          `UPDATE users SET referral_code = ? WHERE id = ?`,
          [referralCode, req.user.id]
        );
        console.log('Generated new referral code:', referralCode);
      }
      
      // Check if package_premium_amounts table exists, create if it doesn't
      try {
        await connection.execute(`
          CREATE TABLE IF NOT EXISTS package_premium_amounts (
            id INT AUTO_INCREMENT PRIMARY KEY,
            package_type VARCHAR(50) NOT NULL UNIQUE,
            premium_amount DECIMAL(10,2) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `);
        
        // Check if we have data in the table
        const [checkData] = await connection.execute(
          `SELECT COUNT(*) as count FROM package_premium_amounts`
        );
        
        // If no data, insert default values
        if (checkData[0].count === 0) {
          await connection.execute(`
            INSERT INTO package_premium_amounts (package_type, premium_amount) VALUES 
            ('OPPORTUNITY', 350.00),
            ('MOMENTUM', 450.00),
            ('PROSPER', 550.00),
            ('PRESTIGE', 695.00),
            ('PINNACLE', 825.00)
          `);
          console.log('Created package_premium_amounts table with default values');
        }
      } catch (error) {
        console.error('Error setting up package_premium_amounts table:', error);
      }
      
      // Get package prices for commission calculations
      const [packagePrices] = await connection.execute(
        `SELECT package_type, premium_amount FROM package_premium_amounts`
      );
      
      const packagePricesMap = {};
      if (packagePrices && Array.isArray(packagePrices)) {
        packagePrices.forEach(pkg => {
          packagePricesMap[pkg.package_type] = pkg.premium_amount;
        });
      } else {
        // Default values if query failed
        packagePricesMap.OPPORTUNITY = 350.00;
        packagePricesMap.MOMENTUM = 450.00;
        packagePricesMap.PROSPER = 550.00;
        packagePricesMap.PRESTIGE = 695.00;
        packagePricesMap.PINNACLE = 825.00;
      }
      
      // Fetch referrals with commission details using recursive CTE
      const [allReferrals] = await connection.execute(`
        WITH RECURSIVE referral_tree AS (
          -- Base case: direct referrals (level 1)
          SELECT 
            u.id,
            u.first_name as firstName,
            u.last_name as lastName, 
            u.email,
            u.selected_package as selectedPackage,
            u.created_at as createdAt,
            u.referral_code,
            1 as level,
            pp.premium_amount
          FROM users u
          LEFT JOIN package_premium_amounts pp ON pp.package_type = u.selected_package
          WHERE u.referred_by = ?
          
          UNION ALL
          
          -- Recursive case: find nested referrals (level 2 and 3)
          SELECT 
            u.id,
            u.first_name as firstName,
            u.last_name as lastName,
            u.email,
            u.selected_package as selectedPackage,
            u.created_at as createdAt,
            u.referral_code,
            rt.level + 1 as level,
            pp.premium_amount
          FROM users u
          LEFT JOIN package_premium_amounts pp ON pp.package_type = u.selected_package
          INNER JOIN referral_tree rt ON u.referred_by = rt.referral_code
          WHERE rt.level < 3
        )
        SELECT 
          rt.*,
          (
            SELECT COUNT(*) 
            FROM users u2 
            WHERE u2.referred_by = rt.referral_code
          ) as directReferralCount
        FROM referral_tree rt
        ORDER BY rt.level, rt.createdAt DESC
      `, [referralCode]);
      
      // Process referrals by level
      const referralsByLevel = {};
      const packageStatsByLevel = {};
      
      // Initialize structure
      [1, 2, 3].forEach(level => {
        referralsByLevel[level] = [];
        packageStatsByLevel[level] = {};
      });
      
      // Calculate commission percentages by level
      const commissionPercentages = {
        1: 0.075, // 7.5%
        2: 0.05,  // 5%
        3: 0.025  // 2.5%
      };
      
      // Process all referrals
      allReferrals.forEach(referral => {
        const level = referral.level;
        const packageType = referral.selectedPackage || 'UNKNOWN';
        const baseAmount = referral.premium_amount || 0;
        const percentage = commissionPercentages[level] || 0;
        
        // Add to referralsByLevel
        referralsByLevel[level].push({
          id: referral.id,
          firstName: referral.firstName,
          lastName: referral.lastName,
          email: referral.email,
          selectedPackage: packageType,
          createdAt: referral.createdAt,
          directReferralCount: referral.directReferralCount || 0,
          commission: {
            percentage: percentage * 100,
            randValue: (baseAmount * percentage).toFixed(2),
            points: level === 1 ? 2000 : Math.floor(baseAmount * percentage * 10) // Fixed 2000 points for level 1
          }
        });
        
        // Update package stats
        if (!packageStatsByLevel[level][packageType]) {
          packageStatsByLevel[level][packageType] = {
            count: 0,
            totalReferrals: 0,
            referralsByPackage: {
              OPPORTUNITY: 0,
              MOMENTUM: 0,
              PROSPER: 0,
              PRESTIGE: 0,
              PINNACLE: 0
            },
            commission: {
              percentage: percentage * 100,
              baseAmount: baseAmount
            }
          };
        }
        
        packageStatsByLevel[level][packageType].count++;
        packageStatsByLevel[level][packageType].totalReferrals += (referral.directReferralCount || 0);
        
        // This would need additional queries to be accurate, but simplifying for now
        if (referral.directReferralCount > 0) {
          packageStatsByLevel[level][packageType].referralsByPackage[packageType]++;
        }
      });
      
      // Count total referrals (direct level 1 referrals)
      const referralCount = referralsByLevel[1].length;
      
      console.log("Sending formatted referral stats for user:", req.user.id);

      res.json({
        referralCode,
        referralCount,
        packagePrices: packagePricesMap,
        packageStatsByLevel,
        referralsByLevel
      });
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ 
        error: "Failed to fetch referral information",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      await connection.end();
    }
  });

  app.get("/api/rewards", async (req, res) => {
    const allRewards = await db.query.rewards.findMany({
      where: eq(rewards.available, true),
    });
    res.json(allRewards);
  });

  app.post("/api/rewards", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    try {
      const [reward] = await db.insert(rewards).values({
        ...req.body,
        available: true,
      }).returning().execute();

      await logAdminAction({
        adminId: req.user.id,
        actionType: "REWARD_CREATED",
        details: `Created new ${req.body.type === 'CASH' ? 'cash redemption' : ''} reward: ${reward.name} (Cost: ${reward.pointsCost} points${req.body.type === 'CASH' ? `, R${(reward.pointsCost * 0.015).toFixed(2)}` : ''})`,
      });

      res.json(reward);
    } catch (error) {
      console.error('Error creating reward:', error);
      res.status(500).json({ error: 'Failed to create reward' });
    }
  });

  app.put("/api/rewards/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { id } = req.params;
    const { name, description, pointsCost, imageUrl, available } = req.body;

    try {
      const [reward] = await db
        .update(rewards)
        .set({
          name,
          description,
          pointsCost,
          imageUrl,
          available,
        })
        .where(eq(rewards.id, parseInt(id)))
        .returning()
        .execute();

      if (!reward) {
        return res.status(404).json({ error: "Reward not found" });
      }

      await logAdminAction({
        adminId: req.user.id,
        actionType: "REWARD_UPDATED",
        details: `Updated reward: ${reward.name} (New Cost: ${reward.pointsCost} points)`,
      });

      res.json(reward);
    } catch (error) {
      console.error('Error updating reward:', error);
      res.status(500).json({ error: 'Failed to update reward' });
    }
  });

  app.delete("/api/rewards/:id", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { id } = req.params;

    try {
      const [reward] = await db
        .select()
        .from(rewards)
        .where(eq(rewards.id, parseInt(id)))
        .limit(1)
        .execute();

      if (!reward) {
        return res.status(404).json({ error: "Reward not found" });
      }

      await db
        .update(rewards)
        .set({ available: false })
        .where(eq(rewards.id, parseInt(id)))
        .execute();

      await logAdminAction({
        adminId: req.user.id,
        actionType: "REWARD_DELETED",
        details: `Deleted reward: ${reward.name}`,
      });

      res.json({ message: "Reward deleted successfully" });
    } catch (error) {
      console.error('Error deleting reward:', error);
      res.status(500).json({ error: 'Failed to delete reward' });
    }
  });

  app.post("/api/rewards/redeem", async (req, res) => {
    if (!req.user) return res.status(401).json({error: "Unauthorized"});
    const { rewardId } = req.body;

    const reward = await db.query.rewards.findFirst({
      where: eq(rewards.id, rewardId),
    });

    if (!reward) return res.status(404).json({ error: "Reward not found" });

    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user.id),
    });

    if (!user || user.points < reward.pointsCost) {
      return res.status(400).json({ error: "Insufficient points" });
    }

    try {
      await db.transaction(async (tx) => {
        await tx.insert(transactions).values({
          userId: user.id,
          points: -reward.pointsCost,
          type: reward.type === "CASH" ? "CASH_REDEMPTION" : "REDEEMED",
          description: reward.type === "CASH"
            ? `Redeemed points for R${(reward.pointsCost * 0.015).toFixed(2)}`
            : `Redeemed ${reward.name}`,
          rewardId,
        }).execute();

        await tx
          .update(users)
          .set({ points: user.points - reward.pointsCost })
          .where(eq(users.id, user.id))
          .execute();

        await logAdminAction({
          adminId: user.id,
          actionType: "POINT_ADJUSTMENT",
          targetUserId: user.id,
          details: reward.type === "CASH"
            ? `Points deducted (-${reward.pointsCost}) for cash redemption of R${(reward.pointsCost * 0.015).toFixed(2)}`
            : `Points deducted (-${reward.pointsCost}) for redeeming reward: ${reward.name}`,
        });
      });

      res.json({
        success: true,
        message: reward.type === "CASH"
          ? `Successfully redeemed R${(reward.pointsCost * 0.015).toFixed(2)}`
          : `Successfully redeemed ${reward.name}`
      });
    } catch (error) {
      console.error('Error processing reward redemption:', error);
      res.status(500).json({ error: 'Failed to process reward redemption' });
    }
  });

  app.post("/api/rewards/redeem-cash", async (req, res) => {
    if (!req.user) return res.status(401).json({error: "Unauthorized"});
    const { points } = req.body;

    if (!points || points <= 0) {
      return res.status(400).json({ error: "Invalid points amount" });
    }

    try {
      const user = await db.query.users.findFirst({
        where: eq(users.id, req.user.id),
      });

      if (!user || user.points < points) {
        return res.status(400).json({ error: "Insufficient points" });
      }

      await db.transaction(async (tx) => {
        const [transaction] = await tx.insert(transactions).values({
          userId: user.id,
          points: -points,
          type: "CASH_REDEMPTION",
          description: `Redeemed points for R${(points * 0.015).toFixed(2)}`,
          status: "PENDING",
          createdAt: new Date(),
        }).returning().execute();

        await tx
          .update(users)
          .set({
            points: sql`${users.points} - ${points}`
          })
          .where(eq(users.id, user.id))
          .execute();


      });

      res.json({
        success: true,
        message: `Successfully redeemed R${(points * 0.015).toFixed(2)}`
      });
    } catch (error) {
      console.error('Error processing cash redemption:', error);
      res.status(500).json({ error: 'Failed to process cash redemption' });
    }
  });

  app.get("/api/admin/cash-redemptions", async (req, res) => {
    console.log('Cash redemptions request:', {
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? {
        id: req.user.id,
        email: req.user.email,
        is_admin: req.user.is_admin,
        is_super_admin: req.user.is_super_admin
      } : null
    });

    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users WHERE user_id = ?',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        console.log('User not found in admin_users:', req.user.id);
        return res.status(403).json({ error: "Admin access required" });
      }

      // Fetch cash redemptions with user details
      const [redemptions] = await connection.execute(
        `SELECT 
          t.*,
          u.email as user_email,
          u.first_name as user_first_name,
          u.last_name as user_last_name,
          CASE WHEN t.processed_by IS NOT NULL THEN
            JSON_OBJECT(
              'id', p.id,
              'email', p.email,
              'firstName', p.first_name,
              'lastName', p.last_name
            )
          ELSE NULL END as processor
        FROM transactions t
        INNER JOIN users u ON t.user_id = u.id
        LEFT JOIN users p ON t.processed_by = p.id
        WHERE t.type = 'CASH_REDEMPTION'
        ORDER BY t.created_at DESC`
      );

      console.log(`Found ${redemptions.length} cash redemptions`);

      // Transform the redemptions data
      const transformedRedemptions = redemptions.map(redemption => ({
        ...redemption,
        processor: redemption.processor ? JSON.parse(redemption.processor) : null,
        status: redemption.status || 'PENDING'
      }));

      res.json(transformedRedemptions);
    } catch (error) {
      console.error('Error fetching cash redemptions:', error);
      res.status(500).json({ error: 'Failed to fetch cash redemptions' });
    } finally {
      await connection.end();
    }
  });

  app.post("/api/admin/cash-redemptions/:id/process", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    const { id } = req.params;

    try {
      const [transaction] = await db
        .update(transactions)
        .set({
          status: 'PROCESSED',
          processedAt: new Date(),
          processedBy: req.user.id
        })
        .where(eq(transactions.id, parseInt(id)))
        .returning()
        .execute();

      if (!transaction) {
        return res.status(404).json({ error: "Transaction not found" });
      }

      await logAdminAction({
        adminId: req.user.id,
        actionType: "POINT_ADJUSTMENT",
        targetUserId: transaction.userId,
        details: `Processed cash redemption of R${(Math.abs(transaction.points) * 0.015).toFixed(2)} (${Math.abs(transaction.points)} points)`,
      });

      res.json(transaction);
    } catch (error) {
      console.error('Error processing cash redemption:', error);
      res.status(500).json({ error: 'Failed to process cash redemption' });
    }
  });

  app.get("/api/notifications", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    
    const connection = await createConnection();
    try {
      console.log('Fetching notifications for user:', req.user.id);
      
      const [notifications] = await connection.execute(
        `SELECT *
         FROM notifications
         WHERE user_id = ?
         ORDER BY created_at DESC 
         LIMIT 50`,
        [req.user.id]
      );
      
      // Transform data to match client expectations
      const transformedNotifications = notifications.map(notification => ({
        id: notification.id,
        userId: notification.user_id,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        read: Boolean(notification.read),
        createdAt: notification.created_at,
        metadata: notification.metadata ? JSON.parse(notification.metadata) : null
      }));
      
      console.log(`Found ${transformedNotifications.length} notifications for user ${req.user.id}`);
      res.json(transformedNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ 
        error: "Failed to fetch notifications",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      await connection.end();
    }
  });

  app.post("/api/notifications/mark-read", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const { notificationId } = req.body;
    const connection = await createConnection();
    
    try {
      console.log('Marking notification(s) as read for user:', req.user.id);
      
      if (notificationId) {
        // Mark specific notification as read (delete it)
        const [result] = await connection.execute(
          `DELETE FROM notifications 
           WHERE id = ? AND user_id = ?`,
          [notificationId, req.user.id]
        );
        
        if (!result || result.affectedRows === 0) {
          console.log('Notification not found:', notificationId);
          return res.status(404).json({ error: "Notification not found" });
        }
        
        console.log(`Marked notification ${notificationId} as read`);
      } else {
        // Mark all notifications as read (delete all)
        const [result] = await connection.execute(
          `DELETE FROM notifications WHERE user_id = ?`,
          [req.user.id]
        );
        
        console.log(`Marked all notifications as read for user ${req.user.id}, deleted ${result.affectedRows} notifications`);
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ 
        error: "Failed to mark notification as read",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      await connection.end();
    }
  });

  app.post("/api/reset-password", async (req, res) => {
    const { email } = req.body;

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1)
        .execute();

      if (user) {
        const resetToken = randomBytes(32).toString("hex");
        const tokenExpiry = new Date(Date.now() + 3600000); 

        await db
          .update(users)
          .set({
            resetToken,
            resetTokenExpiry: tokenExpiry,
          })
          .where(eq(users.id, user.id))
          .execute();

        console.log('\n');
        console.log('🔑 PASSWORD RESET REQUEST 🔑');
        console.log('=============================');
        console.log('Email:', email);
        console.log('Reset Token:', resetToken);
        console.log('Token Expiry:', tokenExpiry);
        console.log('=============================');

        const resetLink = `${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`;
        console.log('📧 RESET PASSWORD LINK:');
        console.log('=============================');
        console.log(resetLink);
        console.log('=============================\n');

        await sendEmail({
          to: email,
          subject: "Password Reset Request",
          text: `
            You requested a password reset. Click the following link to reset your password:
            ${resetLink}

            This link will expire in 1 hour.

            If you didn't request this, please ignore this email.
          `,
          html: `
            <h1>Password Reset Request</h1>
            <p>You requested a password reset. Click the following link to reset your password:</p>
            <p><a href="${resetLink}">${resetLink}</a></p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this, please ignore this email.</p>
          `
        });
      }

      res.json({ message: "If an account exists with that email, you will receive password reset instructions." });
    } catch (error) {
      console.error('Error in password reset:', error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post("/api/reset-password/:token", async (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(
          sql`${users.resetToken} = ${token} AND ${users.resetTokenExpiry} > NOW()`
        )
        .limit(1)
        .execute();

      if (!user) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      const hashedPassword = await authCrypto.hashPassword(newPassword);

      await db
        .update(users)
        .set({
          password: hashedPassword,
          resetToken: null,
          resetTokenExpiry: null
        })
        .where(eq(users.id, user.id))
        .execute();

      res.json({ message: "Password has been reset successfully" });
    } catch (error) {
      console.error('Error in password reset:', error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  });

  // This endpoint allows users to update their profile
  app.put("/api/user-profile", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      const {
        firstName,
        lastName,
        phoneNumber,
        address,
        city,
        postalCode,
        idNumber,
        dateOfBirth,
        industry,
        occupation,
        isSouthAfrican,
        selectedPackage,
        bankName,
        accountType,
        accountNumber,
        hasCreditCard,
        password
      } = req.body;

      // Check if user exists
      const [userCheck] = await connection.execute(
        'SELECT id FROM users WHERE id = ?',
        [req.user.id]
      );
      
      if (!userCheck || userCheck.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }
      
      // Build update SQL with only the fields that are provided
      let updateFields = [];
      let updateParams = [];
      
      if (firstName !== undefined) {
        updateFields.push('first_name = ?');
        updateParams.push(firstName);
      }
      
      if (lastName !== undefined) {
        updateFields.push('last_name = ?');
        updateParams.push(lastName);
      }
      
      if (phoneNumber !== undefined) {
        updateFields.push('phone_number = ?');
        updateParams.push(phoneNumber);
      }
      
      if (address !== undefined) {
        updateFields.push('address = ?');
        updateParams.push(address);
      }
      
      if (city !== undefined) {
        updateFields.push('city = ?');
        updateParams.push(city);
      }
      
      if (postalCode !== undefined) {
        updateFields.push('postal_code = ?');
        updateParams.push(postalCode);
      }
      
      if (idNumber !== undefined) {
        updateFields.push('id_number = ?');
        updateParams.push(idNumber);
      }
      
      if (dateOfBirth !== undefined) {
        updateFields.push('date_of_birth = ?');
        updateParams.push(dateOfBirth);
      }
      
      if (industry !== undefined) {
        updateFields.push('industry = ?');
        updateParams.push(industry);
      }
      
      if (occupation !== undefined) {
        updateFields.push('occupation = ?');
        updateParams.push(occupation);
      }
      
      if (isSouthAfrican !== undefined) {
        updateFields.push('is_south_african = ?');
        updateParams.push(isSouthAfrican);
      }
      
      if (selectedPackage !== undefined) {
        updateFields.push('selected_package = ?');
        updateParams.push(selectedPackage);
      }
      
      if (bankName !== undefined) {
        updateFields.push('bank_name = ?');
        updateParams.push(bankName);
      }
      
      if (accountType !== undefined) {
        updateFields.push('account_type = ?');
        updateParams.push(accountType);
      }
      
      if (accountNumber !== undefined) {
        updateFields.push('account_number = ?');
        updateParams.push(accountNumber);
      }
      
      if (hasCreditCard !== undefined) {
        updateFields.push('has_credit_card = ?');
        updateParams.push(hasCreditCard);
      }
      
      if (password !== undefined) {
        updateFields.push('password = ?');
        const hashedPassword = await hashPassword(password);
        updateParams.push(hashedPassword);
      }
      
      // Add user id as the last parameter
      updateParams.push(req.user.id);
      
      if (updateFields.length === 0) {
        return res.status(400).json({ error: "No fields to update" });
      }
      
      const updateQuery = `
        UPDATE users
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `;
      
      const [updateResult] = await connection.execute(updateQuery, updateParams);
      
      // Get updated user data
      const [updatedUserData] = await connection.execute(
        `SELECT 
          id,
          email,
          first_name,
          last_name,
          phone_number,
          is_admin,
          is_super_admin,
          is_agent,
          is_enabled,
          points,
          referral_code,
          referred_by,
          is_south_african,
          id_number,
          date_of_birth,
          address,
          city,
          postal_code,
          industry,
          occupation,
          bank_name,
          account_type,
          account_number,
          selected_package,
          has_credit_card
        FROM users
        WHERE id = ?`,
        [req.user.id]
      );
      
      if (!updatedUserData || updatedUserData.length === 0) {
        return res.status(404).json({ error: "Failed to retrieve updated user data" });
      }
      
      console.log(`Updated user profile for user ${req.user.id}`);
      res.json(updatedUserData[0]);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ 
        error: 'Failed to update profile',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      await connection.end();
    }
  });
  // Unified API endpoint that handles both session-based and JWT token-based authentication
  app.get("/api/user", async (req, res) => {
    try {
      console.log('User request:', {
        isAuthenticated: req.isAuthenticated(),
        user: req.user ? { id: req.user.id, email: req.user.email } : null,
        hasAuthHeader: !!req.headers.authorization
      });

      // Try to get user from either JWT token or session using the helper function
      let user;
      try {
        user = await getUserFromTokenOrSession(req);
      } catch (error) {
        console.error('Error in getUserFromTokenOrSession:', error);
        return res.status(401).json({ error: "Authentication error" });
      }

      if (!user) {
        console.log('User not authenticated via session or token');
        return res.status(401).json({ error: "Not authenticated" });
      }
      
      console.log('User authenticated, returning user data');
      
      // Format the response to match what the frontend expects
      const response = {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        firstName: user.first_name,
        lastName: user.last_name,
        phone_number: user.phone_number,
        phoneNumber: user.phone_number,
        is_admin: Boolean(user.is_admin),
        is_super_admin: Boolean(user.is_super_admin),
        is_agent: Boolean(user.is_agent),
        is_social: Boolean(user.is_social),
        is_enabled: Boolean(user.is_enabled),
        isAdmin: Boolean(user.is_admin),
        isSuperAdmin: Boolean(user.is_super_admin),
        isAgent: Boolean(user.is_agent),
        isSocial: Boolean(user.is_social),
        isEnabled: Boolean(user.is_enabled),
        points: parseFloat(user.points || '0'),
        referral_code: user.referral_code,
        referralCode: user.referral_code,
        referred_by: user.referred_by,
        referredBy: user.referred_by
      };

      res.json(response);
    } catch (error) {
      console.error('Error in /api/user endpoint:', error);
      res.status(500).json({ error: 'Failed to fetch user data' });
    }
  });

  app.post("/api/admin/products/assign", async (req, res) => {
    if (!req.user?.isAdmin) return res.status(403).json({error: "Unauthorized"});
    try {
      const connection = await createConnection();
      try {
        const { userId, productId, type } = req.body;

        // First get the product activity points value
        const [activities] = await connection.execute(
          `SELECT points_value 
           FROM product_activities 
           WHERE product_id = ? AND type = ?`,
          [productId, type]
        );

        if (!activities || activities.length === 0) {
          return res.status(404).json({ error: "Product activity not found" });
        }

        const pointsValue = activities[0].points_value;

        // Begin transaction
        await connection.beginTransaction();

        // Create product assignment
        const [result] = await connection.execute(
          `INSERT INTO product_assignments (user_id, product_id, type, points_value) 
           VALUES (?, ?, ?, ?)`,
          [userId, productId, type, pointsValue]
        );

        // Create points transaction
        await connection.execute(
          `INSERT INTO transactions (user_id, points, type, description) 
           VALUES (?, ?, ?, ?)`,
          [
            userId, 
            pointsValue,
            'EARNED',
            `Points earned for product activation`
          ]
        );

        // Update user points
        await connection.execute(
          `UPDATE users 
           SET points = points + ? 
           WHERE id = ?`,
          [pointsValue, userId]
        );

        await connection.commit();

        await logAdminAction({
          adminId: req.user.id,
          actionType: "PRODUCT_ASSIGNED",
          details: `Assigned product (ID: ${productId}) to user (ID: ${userId})`
        });

        // Get updated assignment with product details
        const [assignment] = await connection.execute(
          `SELECT pa.*, p.name as product_name
           FROM product_assignments pa
           JOIN products p ON pa.product_id = p.id
           WHERE pa.id = ?`,
          [result.insertId]
        );

        res.json(assignment[0]);
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        await connection.end();
      }
    } catch (error) {
      console.error('Error assigning product:', error);
      res.status(500).json({ error: 'Failed to assign product' });
    }
  });

  // Add new route for admin dashboard stats - optimized for performance
  app.get("/api/admin/dashboard/stats", checkAdmin, async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Check admin status - use index hint
      const [adminCheck] = await connection.execute(
        'SELECT role_type FROM admin_users USE INDEX (PRIMARY) WHERE user_id = ? LIMIT 1',
        [req.user.id]
      );

      if (!adminCheck || adminCheck.length === 0) {
        return res.status(403).json({ error: "Admin access required" });
      }

      // Check if is_test column exists
      const [columns] = await connection.execute(
        `SELECT COLUMN_NAME 
         FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = DATABASE() 
         AND TABLE_NAME = 'users' 
         AND COLUMN_NAME = 'is_test'`
      );
      
      const hasIsTestColumn = columns.length > 0;
      console.log(`Dashboard stats: is_test column exists: ${hasIsTestColumn}`, columns);

      // Count test users to verify
      if (hasIsTestColumn) {
        const [testUserCount] = await connection.execute(
          `SELECT COUNT(*) as count FROM users WHERE is_test = TRUE`
        );
        console.log('Test users count:', testUserCount[0].count);
      }

      // Run all queries in parallel for better performance
      let queries = [];
      
      // Get total customers (non-admin users and optionally exclude test users)
      if (hasIsTestColumn) {
        queries.push(connection.execute(
          `SELECT COUNT(*) as count 
           FROM users u 
           LEFT JOIN admin_users au ON u.id = au.user_id 
           WHERE au.user_id IS NULL AND u.is_test = FALSE`
        ));
      } else {
        queries.push(connection.execute(
          `SELECT COUNT(*) as count 
           FROM users u 
           LEFT JOIN admin_users au ON u.id = au.user_id 
           WHERE au.user_id IS NULL`
        ));
      }
      
      // Get total points in circulation (optionally exclude test users)
      if (hasIsTestColumn) {
        queries.push(connection.execute(
          'SELECT COALESCE(SUM(points), 0) as total FROM users WHERE is_test = FALSE'
        ));
      } else {
        queries.push(connection.execute(
          'SELECT COALESCE(SUM(points), 0) as total FROM users'
        ));
      }
      
      // Get active rewards count
      queries.push(connection.execute(
        'SELECT COUNT(*) as count FROM rewards WHERE available = 1'
      ));
      
      // Get total redemptions
      queries.push(connection.execute(
        `SELECT COUNT(*) as count 
         FROM transactions
         WHERE type = 'REDEEMED'`
      ));
      
      // Get recent transactions for charts (optionally exclude test users)
      if (hasIsTestColumn) {
        queries.push(connection.execute(
          `SELECT 
            t.created_at,
            t.points,
            t.type,
            u.first_name,
            u.last_name,
            u.email
           FROM transactions t
           JOIN users u USE INDEX (PRIMARY) ON t.user_id = u.id
           WHERE u.is_test = FALSE
           ORDER BY t.created_at DESC
           LIMIT 30`
        ));
      } else {
        queries.push(connection.execute(
          `SELECT 
            t.created_at,
            t.points,
            t.type,
            u.first_name,
            u.last_name,
            u.email
           FROM transactions t
           JOIN users u USE INDEX (PRIMARY) ON t.user_id = u.id
           ORDER BY t.created_at DESC
           LIMIT 30`
        ));
      }
      
      const [
        customerCountResult, 
        pointsTotalResult, 
        rewardsCountResult, 
        redemptionsCountResult, 
        transactions
      ] = await Promise.all(queries);

      // Log results for debugging
      console.log('Dashboard stats query results:', {
        customerCount: customerCountResult[0][0].count,
        pointsTotal: pointsTotalResult[0][0].total,
        rewardsCount: rewardsCountResult[0][0].count,
        redemptionsCount: redemptionsCountResult[0][0].count,
        transactionsCount: transactions[0].length
      });

      // Transform transaction data for frontend
      const transformedTransactions = transactions[0].map((t: any) => ({
        date: new Date(t.created_at).toLocaleDateString(),
        points: Math.abs(Number(t.points)),
        type: t.type,
        user: {
          firstName: t.first_name,
          lastName: t.last_name,
          email: t.email
        }
      }));

      const response = {
        totalCustomers: Number(customerCountResult[0][0].count),
        totalPoints: Number(pointsTotalResult[0][0].total),
        activeRewards: Number(rewardsCountResult[0][0].count),
        totalRedemptions: Number(redemptionsCountResult[0][0].count),
        recentTransactions: transformedTransactions
      };

      res.json(response);

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    } finally {
      await connection.end();
    }
  });

  // Cache for admin/agent users
  const USERS_CACHE_TTL = 60 * 1000; // 1 minute
  let usersCache = {
    data: null,
    timestamp: 0
  };

  app.get("/api/admin/users", async (req, res) => {
    console.log('Admin users request:', {
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? {
        id: req.user.id,
        email: req.user.email,
        is_admin: req.user.is_admin,
        is_super_admin: req.user.is_super_admin
      } : null
    });
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check if user is admin or super admin
    if (!req.user || (!req.user.is_admin && !req.user.is_super_admin)) {
      console.log('User lacks admin privileges:', {
        id: req.user?.id,
        email: req.user?.email,
        is_admin: req.user?.is_admin,
        is_super_admin: req.user?.is_super_admin
      });
      return res.status(403).json({ error: "Admin access required" });
    }

    // Check if we have a valid cached response
    const now = Date.now();
    if (usersCache.data && (now - usersCache.timestamp < USERS_CACHE_TTL)) {
      console.log('Returning cached users data:', {
        count: usersCache.data.length,
        cacheAge: Math.round((now - usersCache.timestamp) / 1000) + 's'
      });
      return res.json(usersCache.data);
    }

    const connection = await createConnection();
    try {
      // Admin check is already done above, no need to check again

      // Run queries in parallel for better performance
      const [adminUsers, agentUsers] = await Promise.all([
        // Fetch all admin users with their roles
        connection.execute(
          `SELECT u.*, au.role_type
           FROM users u 
           INNER JOIN admin_users au ON u.id = au.user_id
           ORDER BY u.created_at DESC`
        ),
        
        // Fetch all agent users
        connection.execute(
          `SELECT * FROM users 
           WHERE is_agent = 1
           ORDER BY created_at DESC`
        )
      ]);

      console.log(`Found ${adminUsers[0].length} admin users and ${agentUsers[0].length} agent users`);

      console.log('Admin users sample:', adminUsers[0][0] || {});
      console.log('Agent users sample:', agentUsers[0][0] || {});

      // Transform admin users
      const transformedAdmins = adminUsers[0].map(admin => ({
        id: admin.id,
        email: admin.email,
        firstName: admin.first_name || '',
        lastName: admin.last_name || '',
        phoneNumber: admin.phone_number || '',
        isEnabled: Boolean(admin.is_enabled),
        createdAt: admin.created_at,
        isAdmin: true,
        isAgent: false,
        isSuperAdmin: admin.role_type === 'SUPER_ADMIN',
        adminRole: admin.role_type
      }));

      // Transform agent users
      const transformedAgents = agentUsers[0].map(agent => ({
        id: agent.id,
        email: agent.email,
        firstName: agent.first_name || '',
        lastName: agent.last_name || '',
        phoneNumber: agent.phone_number || '',
        isEnabled: Boolean(agent.is_enabled),
        createdAt: agent.created_at,
        isAdmin: false,
        isAgent: true,
        isSuperAdmin: false,
        adminRole: null
      }));

      // Combine both types of users
      const allUsers = [...transformedAdmins, ...transformedAgents];
      
      // Sort by creation date (newest first)
      allUsers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Update cache
      usersCache = {
        data: allUsers,
        timestamp: now
      };

      res.json(allUsers);
    } catch (error) {
      console.error('Error fetching admin/agent users:', error);
      
      // If there's cached data, return it even if it's stale rather than showing an error
      if (usersCache.data) {
        console.log('Returning stale cache due to error');
        return res.json(usersCache.data);
      }
      
      res.status(500).json({ error: 'Failed to fetch admin/agent users' });
    } finally {
      await connection.end();
    }
  });


  // Add this endpoint after other routes
  app.post("/api/agent/customers/create", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Verify agent status
      const [agentCheck] = await connection.execute(
        'SELECT id FROM users WHERE id = ? AND is_agent = 1',
        [req.user.id]
      );

      if (!agentCheck || agentCheck.length === 0) {
        return res.status(403).json({ error: "Agent access required" });
      }

      const { firstName, lastName, email, phoneNumber, selectedPackage } = req.body;

      // Check for existing user
      const [existingUser] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Calculate initial points based on selected package
      let initialPoints = 0;
      switch (selectedPackage) {
        case 'OPPORTUNITY': initialPoints = 2500; break;
        case 'MOMENTUM': initialPoints = 5000; break;
        case 'PROSPER': initialPoints = 7500; break;
        case 'PRESTIGE': initialPoints = 10000; break;
        case 'PINNACLE': initialPoints = 12500; break;
      }

      await connection.beginTransaction();

      try {
        // Generate a random password for the customer
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await crypto.hash(tempPassword);

        // Create user
        const [userResult] = await connection.execute(
          `INSERT INTO users (
            email, password, first_name, last_name, 
            phone_number, is_enabled, points, selected_package,
            agent_id
          ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?)`,
          [
            email,
            hashedPassword,
            firstName,
            lastName,
            phoneNumber,
            initialPoints,
            selectedPackage,
            req.user.id // Associate with the agent
          ]
        );

        const userId = userResult.insertId;

        // Record the points transaction
        if (initialPoints > 0) {
          await connection.execute(
            `INSERT INTO transactions (
              user_id, points, type, description
            ) VALUES (?, ?, ?, ?)`,
            [
              userId,
              initialPoints,
              'WELCOME_BONUS',
              `Welcome bonus points for ${selectedPackage} package`
            ]
          );
        }

        await connection.commit();

        // Send welcome email with temporary password (implement this later)
        // await sendEmail({
        //   to: email,
        //   subject: "Welcome to OPIAN Rewards",
        //   text: `Your temporary password is: ${tempPassword}`
        // });

        res.status(201).json({
          message: "Customer created successfully",
          customerId: userId
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ error: 'Failed to create customer' });
    } finally {
      await connection.end();
    }
  });

  // Add this endpoint to get agent's customers
  app.get("/api/agent/customers", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Verify agent status
      const [agentCheck] = await connection.execute(
        'SELECT id FROM users WHERE id = ? AND is_agent = 1',
        [req.user.id]
      );

      if (!agentCheck || agentCheck.length === 0) {
        return res.status(403).json({ error: "Agent access required" });
      }

      // Get customers associated with this agent
      const [customers] = await connection.execute(
        `SELECT id, first_name as firstName, last_name as lastName, 
                email, phone_number as phoneNumber, points, 
                is_enabled as isEnabled, selected_package as selectedPackage
         FROM users 
         WHERE agent_id = ?
         ORDER BY created_at DESC`,
        [req.user.id]
      );

      res.json(customers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    } finally {
      await connection.end();
    }
  });

  // Add customer creation endpoint for agents
  app.post("/api/agent/customers/create", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const connection = await createConnection();
    try {
      // Verify agent status
      const [agentCheck] = await connection.execute(
        'SELECT id FROM users WHERE id = ? AND is_agent = 1',
        [req.user.id]
      );

      if (!agentCheck || agentCheck.length === 0) {
        return res.status(403).json({ error: "Agent access required" });
      }

      const { 
        firstName, lastName, email, phoneNumber, 
        industry, occupation, address, city, 
        postalCode, selectedPackage 
      } = req.body;

      // Check for existing user
      const [existingUser] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if (existingUser.length > 0) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Calculate initial points based on selected package
      let initialPoints = 0;
      switch (selectedPackage) {
        case 'OPPORTUNITY': initialPoints = 2500; break;
        case 'MOMENTUM': initialPoints = 5000; break;
        case 'PROSPER': initialPoints = 7500; break;
        case 'PRESTIGE': initialPoints = 10000; break;
        case 'PINNACLE': initialPoints = 12500; break;
      }

      await connection.beginTransaction();

      try {
        // Generate a random password for the customer
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await crypto.hash(tempPassword);

        // Create user with all fields
        const [userResult] = await connection.execute(
          `INSERT INTO users (
            email, password, first_name, last_name, 
            phone_number, is_enabled, points, selected_package,
            industry, occupation, address, city, postal_code,
            agent_id
          ) VALUES (?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            email,
            hashedPassword,
            firstName,
            lastName,
            phoneNumber,
            initialPoints,
            selectedPackage,
            industry,
            occupation,
            address,
            city,
            postalCode,
            req.user.id // Associate with the agent
          ]
        );

        const userId = userResult.insertId;

        // Record the points transaction
        if (initialPoints > 0) {
          await connection.execute(
            `INSERT INTO transactions (
              user_id, points, type, description
            ) VALUES (?, ?, ?, ?)`,
            [
              userId,
              initialPoints,
              'WELCOME_BONUS',
              `Welcome bonus points for ${selectedPackage} package`
            ]
          );
        }

        await connection.commit();

        // Send welcome email with temporary password (implement this later)
        // await sendEmail({
        //   to: email,
        //   subject: "Welcome to OPIAN Rewards",
        //   text: `Your temporary password is: ${tempPassword}`
        // });

        res.status(201).json({
          message: "Customer created successfully",
          customerId: userId
        });
      } catch (error) {
        await connection.rollback();
        throw error;
      }
    } catch (error) {
      console.error('Error creating customer:', error);
      res.status(500).json({ error: 'Failed to create customer' });
    } finally {
      await connection.end();
    }
  });

  // Test endpoint for manually verifying email content with mandate acceptance
  app.post("/api/register-test-email-html", async (req: Request, res: Response) => {
    try {
      console.log('Received email HTML test request');
      
      // Create sample customer data with mandate_accepted set to true
      const customerData = {
        firstName: req.body.first_name || "Test",
        lastName: req.body.last_name || "Customer",
        email: req.body.email || "test@example.com",
        mobileNumber: req.body.phone_number || "27123456789",
        selectedPackage: req.body.selectedPackage || "Gold",
        signature: req.body.signature || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
        isSouthAfrican: req.body.isSouthAfrican !== undefined ? req.body.isSouthAfrican : true,
        idNumber: req.body.idNumber || "7012345678901",
        mandate_accepted: req.body.mandate_accepted !== undefined ? req.body.mandate_accepted : true // explicitly set to true for testing
      };
      
      // Generate email content
      const { text, html } = formatNewCustomerAdminEmail(customerData);
      
      // Also generate PDF to check its content
      console.log('Generating PDF for mandate acceptance test...');
      const pdfBuffer = await generateRegistrationPDF(customerData);
      
      // Return the HTML for inspection
      res.status(200).json({
        success: true,
        message: "Email content generated successfully",
        mandate_accepted: customerData.mandate_accepted,
        html: html,
        text: text,
        pdf_generated: !!pdfBuffer
      });
    } catch (error) {
      console.error('Error generating email content:', error);
      res.status(500).json({
        success: false,
        message: "Failed to generate email content",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });

  // New endpoint to test quote request emails
  app.post("/api/test-quote-email", async (req: Request, res: Response) => {
    try {
      const { customerName, customerEmail, productName, adminName } = req.body;
      
      if (!customerEmail) {
        return res.status(400).json({ success: false, message: "Customer email is required" });
      }
      
      // Test customer quote request email
      const customerQuoteEmail = formatQuoteRequestEmail(
        customerName || "Test Customer", 
        productName || "Test Product"
      );
      
      // Send customer email
      await sendEmail({
        to: customerEmail,
        subject: "Your Quote Request Confirmation",
        html: customerQuoteEmail.html,
        text: customerQuoteEmail.text,
        emailType: "QUOTE_REQUEST"
      });
      
      // Test admin quote request email
      if (adminName) {
        const adminQuoteEmail = formatAdminQuoteRequestEmail(
          customerName || "Test Customer",
          customerEmail,
          productName || "Test Product",
          adminName
        );
        
        // Send admin email
        await sendEmail({
          to: customerEmail, // Sending to the same email for testing
          subject: "New Quote Request Notification",
          html: adminQuoteEmail.html,
          text: adminQuoteEmail.text,
          emailType: "ADMIN_QUOTE_REQUEST"
        });
      }
      
      res.json({
        success: true,
        message: "Quote request test emails sent successfully",
        timestamp: new Date().toISOString(),
        recipient: customerEmail
      });
    } catch (error) {
      console.error("Failed to send test quote emails:", error);
      res.status(500).json({
        success: false,
        message: "Failed to send test quote emails",
        error: error instanceof Error ? error.message : String(error)
      });
    }
  });
  
  // Test endpoint to generate and download a PDF sample for testing
  app.get("/api/test-registration-pdf", async (req: Request, res: Response) => {
    try {
      console.log('Generating test registration PDF...');
      
      // Import the necessary function
      const { generateRegistrationPDF } = await import('./utils/emailService');
      
      // Create sample customer data for testing
      const customerData = {
        firstName: "Test",
        lastName: "Customer",
        email: "test@example.com",
        mobileNumber: "1234567890",
        selectedPackage: "PROSPER",
        idNumber: "1234567890",
        dateOfBirth: "1990-01-01",
        gender: "Male",
        isSouthAfrican: true,
        occupation: "Software Developer",
        industry: "Technology",
        address: "123 Test Street",
        city: "Test City",
        postalCode: "12345",
        hasCreditCard: true,
        bankName: "Test Bank",
        accountType: "SAVINGS",
        accountNumber: "123456789",
        accountHolderName: "Test Customer",
        branchCode: "12345",
        mandate_accepted: true,
        signature: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
      };
      
      // Generate the PDF buffer
      const pdfBuffer = await generateRegistrationPDF(customerData);
      
      // Send PDF as download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=test-registration.pdf');
      res.setHeader('Content-Length', pdfBuffer.length);
      res.send(pdfBuffer);
    } catch (error) {
      console.error('Failed to generate PDF:', error);
      res.status(500).json({ 
        success: false, 
        message: `Failed to generate PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
    }
  });

  // Admin endpoint to generate test customers moved to test-customer-routes.ts
  app.post("/api/old-endpoint-removed2", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    // Check admin status
    const connection = await createConnection();
    try {
      // Check if user is admin first
      const [userCheck] = await connection.execute(
        'SELECT is_admin, is_super_admin FROM users WHERE id = ?',
        [req.user.id]
      );
      
      console.log('User admin check for generate test customers:', { 
        userId: req.user.id,
        userCheckResult: userCheck,
        userCheckLength: userCheck ? userCheck.length : 0
      });
      
      // Verify user exists and is at least an admin
      if (!userCheck || userCheck.length === 0 || !userCheck[0].is_admin) {
        await connection.end();
        return res.status(403).json({ error: "Admin access required for this feature" });
      }
      
      // For test customer generation, we'll require super admin access
      if (!userCheck[0].is_super_admin) {
        await connection.end();
        return res.status(403).json({ error: "Super admin access required for this feature" });
      }

      const { count = 10, packageType } = req.body;
      
      // Validate input
      const numCount = Math.min(Math.max(parseInt(count, 10) || 10, 1), 100);
      
      if (isNaN(numCount)) {
        return res.status(400).json({ error: "Invalid count parameter" });
      }
      
      console.log(`Generating ${numCount} test customers${packageType ? ` with package ${packageType}` : ''}`);
      
      // Helper functions for generating test data
      function getRandomInt(min: number, max: number) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
      
      function getRandomDate() {
        const now = new Date();
        const pastDate = new Date();
        pastDate.setDate(now.getDate() - getRandomInt(1, 365)); // Random date within past year
        return pastDate;
      }
      
      function generateMobileNumber() {
        return `+27${getRandomInt(60, 89)}${getRandomInt(1000000, 9999999)}`;
      }
      
      function generateEmail(firstName: string, lastName: string) {
        const domains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
        const randomDomain = domains[Math.floor(Math.random() * domains.length)];
        
        // Clean up name parts for email
        const cleanFirst = firstName.toLowerCase().replace(/[^a-z]/g, '');
        const cleanLast = lastName.toLowerCase().replace(/[^a-z]/g, '');
        
        // Add a random number to ensure uniqueness
        const randomNum = Math.floor(Math.random() * 1000);
        
        return `${cleanFirst}.${cleanLast}${randomNum}@${randomDomain}`;
      }
      
      async function hashPassword(password: string) {
        const salt = randomBytes(16).toString("hex");
        const buf = await scryptAsync(password, salt, 64) as Buffer;
        return `${buf.toString("hex")}.${salt}`;
      }
      
      // South African cities for address generation
      const southAfricanCities = [
        'Johannesburg', 'Cape Town', 'Durban', 'Pretoria', 'Bloemfontein',
        'Port Elizabeth', 'East London', 'Kimberley', 'Polokwane', 'Nelspruit',
        'Pietermaritzburg', 'Rustenburg', 'Potchefstroom', 'George', 'Upington'
      ];
      
      // First names and last names for test customers
      const firstNames = [
        'John', 'Mary', 'James', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth',
        'David', 'Susan', 'Richard', 'Jessica', 'Joseph', 'Sarah', 'Thomas', 'Karen', 'Charles', 'Nancy',
        'Sipho', 'Thandi', 'Mandla', 'Nomsa', 'Thabo', 'Lerato', 'Mpho', 'Nosipho', 'Themba', 'Zanele'
      ];
      
      const lastNames = [
        'Smith', 'Johnson', 'Williams', 'Jones', 'Brown', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor',
        'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson',
        'Nkosi', 'Ndlovu', 'Khumalo', 'Dlamini', 'Mkhize', 'Mokoena', 'Sithole', 'Molefe', 'Tshabalala', 'Mabaso'
      ];
      
      // Package options and prices
      const packages = packageType ? [packageType] : ['OPPORTUNITY', 'MOMENTUM', 'PROSPER', 'PRESTIGE', 'PINNACLE'];
      const packagePrices: {[key: string]: number} = {
        'OPPORTUNITY': 350,
        'MOMENTUM': 450,
        'PROSPER': 550,
        'PRESTIGE': 695,
        'PINNACLE': 825
      };
      
      // Card status options
      const cardStatuses = ['PENDING', 'APPROVED', 'RECEIVED', 'ACTIVATED', 'DECLINED'];
      
      // Check if admin_logs table exists before logging the action
      const [adminLogsTable] = await connection.execute("SHOW TABLES LIKE 'admin_logs'");
      
      if (adminLogsTable && adminLogsTable.length > 0) {
        // Log action in admin_logs
        await connection.execute(
          "INSERT INTO admin_logs (admin_id, action_type, details) VALUES (?, ?, ?)",
          [req.user.id, "GENERATE_TEST_CUSTOMERS", `Generated ${numCount} test customers${packageType ? ` with package ${packageType}` : ''}`]
        );
      } else {
        console.log("admin_logs table does not exist, skipping admin log entry");
      }

      console.log(`Starting transaction to generate ${numCount} test customers...`);
      await connection.beginTransaction();
      
      try {
        // Track created users
        const createdUsers: Array<{id: number, name: string, package: string, email: string}> = [];
        
        // Generate and insert test customers
        for (let i = 0; i < numCount; i++) {
          const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
          const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
          const email = generateEmail(firstName, lastName);
          const mobileNumber = generateMobileNumber();
          const selectedPackage = packages[Math.floor(Math.random() * packages.length)];
          const premiumAmount = packagePrices[selectedPackage];
          const address = `${getRandomInt(1, 999)} ${['Main', 'Park', 'Church', 'High', 'Oak', 'Pine', 'Cedar', 'Maple'][Math.floor(Math.random() * 8)]} ${['Street', 'Road', 'Avenue', 'Boulevard', 'Lane', 'Drive'][Math.floor(Math.random() * 6)]}, ${southAfricanCities[Math.floor(Math.random() * southAfricanCities.length)]}`;
          const cardStatus = cardStatuses[Math.floor(Math.random() * cardStatuses.length)];
          const pointsBalance = getRandomInt(0, 10000);
          const createdAt = getRandomDate();
          const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${getRandomInt(1, 999)}`;
          
          // Standard password for test accounts
          const hashedPassword = await hashPassword('Password123!');
          
          // Insert user
          const [userResult] = await connection.execute(
            `INSERT INTO users (
              first_name, last_name, email, phone_number, username, password, 
              role, address, selected_package, premium_amount, 
              card_status, points, created_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              firstName, lastName, email, mobileNumber, username, hashedPassword,
              'CUSTOMER', address, selectedPackage, premiumAmount,
              cardStatus, pointsBalance, createdAt
            ]
          );

          const userId = userResult.insertId;
          createdUsers.push({
            id: userId,
            name: `${firstName} ${lastName}`,
            package: selectedPackage,
            email: email
          });
        }

        await connection.commit();
        
        res.status(200).json({ 
          success: true,
          message: "Test customers created successfully", 
          count: createdUsers.length,
          users: createdUsers
        });
      } catch (error) {
        await connection.rollback();
        console.error('Transaction failed:', error);
        res.status(500).json({ 
          error: "Error generating test customers", 
          details: error instanceof Error ? error.message : 'Unknown error' 
        });
      }
    } catch (error) {
      console.error("Error generating test customers:", error);
      res.status(500).json({ 
        error: "Error generating test customers", 
        details: error instanceof Error ? error.message : 'Unknown error' 
      });
    } finally {
      await connection.end();
    }
  });

  // Sitemap route to serve sitemap.xml for better SEO
  app.get('/sitemap.xml', async (req, res) => {
    try {
      const sitemap = await generateSitemap();
      res.header('Content-Type', 'application/xml');
      res.send(sitemap);
    } catch (error) {
      console.error('Error serving sitemap:', error);
      res.status(500).send('Error generating sitemap');
    }
  });

  // Initialize sitemap generation on server start and schedule regeneration
  scheduleSitemapGeneration(24); // Regenerate sitemap once a day
  
  return httpServer;
}