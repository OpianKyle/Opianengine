import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import { setupAuth, checkAgent, verifyJwtToken } from "./auth";
import { setupWebSocketServer } from "./websocket"; 
import { createConnection } from './db';
import { sendEmail, formatPointsAssignmentEmail, formatAdminNotificationEmail, formatQuoteRequestEmail, formatAdminQuoteRequestEmail, formatRegistrationEmail } from "./utils/emailService";
import { parse } from 'csv-parse';
import { stringify } from 'csv-stringify';
import { Readable } from 'stream';
import session from 'express-session';
import MemoryStore from 'memorystore';
import referralRouter from './routes/referral';
import { NotificationService } from './services/notification-service';
import { scrypt, randomBytes } from "crypto";
import { promisify } from "util";
import { pool, db } from "@db";
import { users, products, transactions, rewards, notifications, productActivities, productAssignments, quoteRequests } from "@db/schema";
import { and, eq, desc, asc, sql, inArray } from "drizzle-orm";

// Define User interface to fix TypeScript errors
interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number?: string;
  is_agent: boolean;
  is_admin: boolean;
  is_super_admin: boolean;
  is_enabled: boolean;
  points: number;
  referral_code?: string;
  referred_by?: string;
  
  // Client-side aliases for compatibility
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  firstName?: string;
  lastName?: string;
}
import { logAdminAction } from './admin-logger';

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




  // Registration endpoint with enhanced validation and field handling
  app.post("/api/register", async (req: Request, res: Response) => {
    const connection = await createConnection();
    try {
      // Debug log for signature data
      console.log('Registration signature debug:', {
        signatureType: typeof req.body.signature,
        signatureValue: req.body.signature?.substring(0, 100),
        signatureLength: req.body.signature?.length,
        isBase64: req.body.signature?.match(/^data:image\/[^;]+;base64,/),
        mandateAccepted: req.body.acceptMandate
      });

      // Input validation
      if (!req.body.email || !req.body.password || !req.body.firstName || !req.body.lastName) {
        return res.status(400).json({ error: "Required fields missing" });
      }

      // Validate signature format
      if (!req.body.signature || typeof req.body.signature !== 'string' || !req.body.signature.startsWith('data:image/')) {
        return res.status(400).json({ error: "Valid signature image data is required" });
      }

      // Check for existing user
      const [existingUsers] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [req.body.email]
      );

      if (Array.isArray(existingUsers) && existingUsers.length > 0) {
        return res.status(400).json({ error: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await crypto.hash(req.body.password);
      const newReferralCode = `REF${randomBytes(4).toString('hex')}`;

      // Calculate initial points
      let initialPoints = 0;
      const selectedPackage = req.body.selectedPackage?.toUpperCase();
      switch (selectedPackage) {
        case 'OPPORTUNITY': initialPoints = 2500; break;
        case 'MOMENTUM': initialPoints = 5000; break;
        case 'PROSPER': initialPoints = 7500; break;
        case 'PRESTIGE': initialPoints = 10000; break;
        case 'PINNACLE': initialPoints = 12500; break;
        default: initialPoints = 2500;
      }

      await connection.beginTransaction();

      try {
        // Debug the SQL query parameters
        const queryParams = [
          req.body.email,
          hashedPassword,
          req.body.firstName,
          req.body.lastName,
          req.body.mobileNumber,
          req.body.isSouthAfrican ? 1 : 0,
          req.body.idNumber,
          req.body.dateOfBirth,
          req.body.gender,
          req.body.occupation,
          req.body.industry,
          req.body.addressLine1,
          req.body.suburb,
          req.body.postalCode,
          selectedPackage,
          req.body.bankName,
          req.body.accountType,
          req.body.accountNumber,
          req.body.accountHolderName,
          req.body.branchCode,
          req.body.hasCreditCard ? 1 : 0,
          req.body.signature,
          initialPoints,
          newReferralCode,
          req.body.referralCode || null,
          req.body.acceptMandate ? 1 : 0,
          new Date()
        ];

        console.log('Registration insert parameters:', {
          ...queryParams,
          password: '[REDACTED]',
          signatureLength: queryParams[21]?.length || 0,
          signaturePreview: queryParams[21]?.substring(0, 50) + '...'
        });

        // Insert user with explicit column names
        const [userResult] = await connection.execute(
          `INSERT INTO users (
            email, password, first_name, last_name, phone_number,
            is_south_african, id_number, date_of_birth, gender,
            occupation, industry, address, city, postal_code,
            selected_package, bank_name, account_type, account_number,
            account_holder_name, branch_code, has_credit_card,
            signature, points, referral_code, referred_by,
            mandate_accepted, mandate_accepted_at, is_enabled,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
          queryParams
        );

        const userId = (userResult as any).insertId;

        // Verify the user data was saved
        const [savedUser] = await connection.execute(
          'SELECT id, signature IS NOT NULL as has_signature, CHAR_LENGTH(signature) as signature_length, points, mandate_accepted FROM users WHERE id = ?',
          [userId]
        );

        console.log('Saved user verification:', {
          userId,
          hasSignature: !!(savedUser as any)[0]?.has_signature,
          signatureLength: (savedUser as any)[0]?.signature_length,
          points: (savedUser as any)[0]?.points,
          mandateAccepted: (savedUser as any)[0]?.mandate_accepted
        });

        // Record points transaction
        if (initialPoints > 0) {
          await connection.execute(
            `INSERT INTO transactions (
              user_id, points, type, description, status,
              created_at
            ) VALUES (?, ?, ?, ?, ?, NOW())`,
            [
              userId,
              initialPoints,
              'WELCOME_BONUS',
              `Initial points allocation for ${selectedPackage} package`,
              'PROCESSED'
            ]
          );
        }

        await connection.commit();

        res.status(201).json({
          id: userId,
          email: req.body.email,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          points: initialPoints,
          selectedPackage,
          mandateAccepted: true,
          hasSignature: true
        });

      } catch (error) {
        await connection.rollback();
        console.error('Registration transaction error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ 
        error: "Registration failed. Please try again.",
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    } finally {
      await connection.end();
    }
  });

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
          CAST(COALESCE(points, 0) as DECIMAL(10,2)) as points
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
        pointsType: typeof userData[0].points
      });

      // Ensure points is properly converted to a number
      const points = parseFloat(userData[0].points || '0');

      res.json({
        id: userData[0].id,
        email: userData[0].email,
        firstName: userData[0].first_name,
        lastName: userData[0].last_name,
        points: points
      });

    } catch (error) {
      console.error('Error fetching user points:', error);
      res.status(500).json({ error: 'Failed to fetch user points' });
    } finally {
      await connection.end();
    }
  });

  // Mount referral routes
  app.use('/api/customer', referralRouter);

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
  app.get("/api/admin/customers", async (req, res) => {
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

      // Get regular customers with transactions, assignments and product details
      const [customers] = await connection.execute(
        `SELECT 
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
          u.is_enabled,
          CAST(u.points as DECIMAL(10,2)) as points,
          u.created_at,
          u.agent_id,
          COALESCE(
            JSON_ARRAYAGG(
              JSON_OBJECT(
                'id', p.id,
                'name', p.name,
                'description', p.description,
                'activities', (
                  SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                      'id', pa.id,
                      'type', pa.type,
                      'pointsValue', pa.points_value
                    )
                  )
                  FROM product_activities pa
                  WHERE pa.product_id = p.id
                )
              )
            ),
            '[]'
          ) as assigned_products,
          COUNT(DISTINCT pa2.id) as assignment_count,
          COALESCE(tr.last_transaction, NULL) as last_transaction,
          COALESCE(tr.transaction_type, NULL) as last_transaction_type,
          COALESCE(tr.transaction_points, NULL) as last_transaction_points
         FROM users u
         LEFT JOIN product_assignments pa2 ON u.id = pa2.user_id
         LEFT JOIN products p ON pa2.product_id = p.id
         LEFT JOIN (
           SELECT 
             user_id,
             created_at as last_transaction,
             type as transaction_type,
             points as transaction_points
           FROM transactions t1
           WHERE created_at = (
             SELECT MAX(created_at)
             FROM transactions t2
             WHERE t2.user_id = t1.user_id
           )
         ) tr ON u.id = tr.user_id
         LEFT JOIN admin_users au ON u.id = au.user_id
         WHERE au.user_id IS NULL 
         AND u.is_agent = 0
         GROUP BY 
           u.id, u.email, u.first_name, u.last_name, u.phone_number,
           u.is_south_african, u.id_number, u.date_of_birth, u.gender,
           u.occupation, u.industry, u.address, u.city, u.postal_code,
           u.selected_package, u.bank_name, u.account_type, u.account_number,
           u.account_holder_name, u.branch_code, u.has_credit_card,
           u.is_enabled, u.points, u.created_at, u.agent_id,
           tr.last_transaction, tr.transaction_type, tr.transaction_points
         ORDER BY u.created_at DESC`
      );

      console.log('Raw customer data sample:', {
        firstCustomer: customers[0],
        customerFields: Object.keys(customers[0] || {}),
        points: customers[0]?.points,
        pointsType: typeof customers[0]?.points
      });

      // Transform the data
      const transformedCustomers = customers.map((customer: any) => {
        let assignedProducts = [];
        if (customer.assigned_products) {
          try {
            assignedProducts = JSON.parse(customer.assigned_products);
            assignedProducts = assignedProducts.filter(p => p && p.id && p.name).map(p => ({
              ...p,
              activities: p.activities || []
            }));
          } catch (e) {
            console.error('Error parsing assigned products for customer:', customer.id, e);
          }
        }

        // Ensure points is properly converted to a number
        const points = typeof customer.points === 'string' 
          ? parseFloat(customer.points) 
          : Number(customer.points || 0);

        console.log('Customer details transformation:', {
          customerId: customer.id,
          firstName: customer.first_name,
          lastName: customer.last_name,
          email: customer.email,
          phone: customer.phone_number,
          idNumber: customer.id_number,
          dateOfBirth: customer.date_of_birth,
          occupation: customer.occupation
        });

        return {
          id: customer.id,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          phoneNumber: customer.phone_number,
          isEnabled: Boolean(customer.is_enabled),
          points,
          createdAt: customer.created_at,
          selectedPackage: customer.selected_package,
          assignmentCount: customer.assignment_count,
          assignedProducts: assignedProducts,
          lastActivity: customer.last_transaction ? {
            date: customer.last_transaction,
            type: customer.transaction_type,
            points: customer.transaction_points
          } : null,
          idNumber: customer.id_number || '',
          dateOfBirth: customer.date_of_birth || '',
          gender: customer.gender || '',
          occupation: customer.occupation || '',
          industry: customer.industry || '',
          address: customer.address || '',
          city: customer.city || '',
          postalCode: customer.postal_code || '',
          bankName: customer.bank_name || '',
          accountType: customer.account_type || '',
          accountNumber: customer.account_number || '',
          accountHolderName: customer.account_holder_name || '',
          branchCode: customer.branch_code || '',
          hasCreditCard: Boolean(customer.has_credit_card),
          isSouthAfrican: Boolean(customer.is_south_african),
          agentId: customer.agent_id || null
        };
      });

      console.log('First transformed customer:', {
        id: transformedCustomers[0]?.id,
        firstName: transformedCustomers[0]?.firstName,
        lastName: transformedCustomers[0]?.lastName,
        points: transformedCustomers[0]?.points,
        pointsType: typeof transformedCustomers[0]?.points,
        profile: {
          idNumber: transformedCustomers[0]?.idNumber,
          dateOfBirth: transformedCustomers[0]?.dateOfBirth,
          occupation: transformedCustomers[0]?.occupation,
          bankDetails: {
            bankName: transformedCustomers[0]?.bankName,
            accountType: transformedCustomers[0]?.accountType
          }
        }
      });

      res.json(transformedCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
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
      // Get customers associated with this agent
      const [customers] = await connection.execute(
        `SELECT id, first_name as firstName, last_name as lastName, 
                email, phone_number as phoneNumber, points, 
                is_enabled as isEnabled, selected_package as selectedPackage
         FROM users 
         WHERE agent_id = ?
         ORDER BY created_at DESC`,
        [req.session?.passport?.user]
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
  app.post("/api/agent/customers/create", checkAgent, async (req, res) => {
    const connection = await createConnection();
    try {
      const { 
        firstName, lastName, email, phoneNumber, 
        industry, occupation, address, city, 
        postalCode, selectedPackage,
        idNumber, dateOfBirth, gender,
        isSouthAfrican
      } = req.body;

      // Check for existing user
      const [existingUser] = await connection.execute(
        'SELECT id FROM users WHERE email = ?',
        [email]
      );

      if ((existingUser as any[]).length > 0) {
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

        res.status(201).json({
          message: "Customer created successfully",
          customerId: userId,
          temporaryPassword: tempPassword // Include the temporary password in the response
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

  app.get("/api/customer/referral", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const connection = await createConnection();
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
          ) as direct_referral_count,
          (
            SELECT JSON_ARRAYAGG(
              JSON_OBJECT(
                'package', u3.selected_package,
                'count', COUNT(*)
              )
            )
            FROM users u3
            WHERE u3.referred_by = rt.referral_code
            GROUP BY u3.selected_package
          ) as referral_package_stats
        FROM referral_tree rt
        ORDER BY rt.level, rt.created_at DESC`,
        [referralCode]
      );

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
          referral.level === 1 ? 0.075 : // 15% for level 1
          referral.level === 2 ? 0.05 : // 10% for level 2
          referral.level === 3 ? 0.025 : // 5% for level 3
          0;
        
        const packageAmount = referral.package_amount || 0;
        const randValue = packageAmount * commissionPercentage;
        const points = Math.floor(randValue * 100);

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

    const connection = await createConnection();
    try {
      // Only select users who are either admins or agents
      const [users] = await connection.execute(
        `SELECT u.*, 
         CASE WHEN au.role_type = 'SUPER_ADMIN' THEN 1 ELSE 0 END as is_super_admin,
         CASE WHEN au.role_type IS NOT NULL THEN 1 ELSE 0 END as is_admin
         FROM users u
         LEFT JOIN admin_users au ON u.id = au.user_id
         WHERE au.role_type IS NOT NULL OR u.is_agent = 1
         ORDER BY u.created_at DESC`
      );

      console.log('Raw users from database:', users.map((u: any) => ({
        id: u.id,
        email: u.email,
        is_admin: Boolean(u.is_admin),
        is_super_admin: Boolean(u.is_super_admin),
        is_agent: Boolean(u.is_agent)
      })));

      const transformedUsers = users.map((user: any) => {
        const { password, ...safeUser } = user;
        return {
          ...safeUser,
          id: user.id,
          firstName: user.first_name,
          lastName: user.last_name,
          phoneNumber: user.phone_number,
          isAdmin: Boolean(user.is_admin),
          isAgent: Boolean(user.is_agent),
          isSuperAdmin: Boolean(user.is_super_admin),
          isEnabled: Boolean(user.is_enabled),
          createdAt: user.created_at
        };
      });

      console.log('Fetched admin/agent users:', transformedUsers.map(u => ({
        id: u.id,
        email: u.email,
        isAdmin: u.isAdmin,
        isSuperAdmin: u.isSuperAdmin,
        isAgent: u.isAgent
      })));

      res.json(transformedUsers);
    } catch (error) {
      console.error('Error fetching users:', error);
      res.status(500).json({ error: 'Failed to fetch users' });
    } finally {
      await connection.end();
    }
  });

  app.put("/api/user", async (req, res) => {
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

  app.put("/api/admin/users/:id/toggle-status", async (req, res) => {
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

  app.get("/api/admin/customers", async (req, res) => {
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

      // Fetch users with their product assignments and activities
      const [customers] = await connection.execute(
        `SELECT 
          u.*,
          JSON_ARRAYAGG(
            JSON_OBJECT(
              'id', pa.id,
              'product', JSON_OBJECT(
                'id', p.id,
                'name', p.name,
                'description', p.description,
                'activities', (
                  SELECT JSON_ARRAYAGG(
                    JSON_OBJECT(
                      'id', act.id,
                      'type', act.type,
                      'pointsValue', act.points_value
                    )
                  )
                  FROM product_activities act
                  WHERE act.product_id = p.id
                )
              )
            )
          ) as product_assignments
        FROM users u
        LEFT JOIN product_assignments pa ON u.id = pa.user_id
        LEFT JOIN products p ON pa.product_id = p.id
        GROUP BY u.id
        ORDER BY u.created_at DESC`
      );

      // Transform the data
      const transformedCustomers = customers.map(customer => {
        let productAssignments = [];
        try {
          productAssignments = customer.product_assignments ? 
            JSON.parse(customer.product_assignments.replace(/null/g, '[]')) : [];
        } catch (e) {
          console.error('Error parsing product assignments:', e);
        }

        return {
          id: customer.id,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          phoneNumber: customer.phone_number,
          isEnabled: Boolean(customer.is_enabled),
          points: customer.points || 0,
          createdAt: customer.created_at,
          productAssignments: productAssignments.filter(pa => pa.id) // Filter out null assignments
        };
      });

      console.log('Fetched customers with product activities:', 
        transformedCustomers.map(c => ({
          id: c.id,
          assignmentsCount: c.productAssignments.length,
          sampleActivities: c.productAssignments[0]?.product.activities?.length || 0
        }))
      );

      res.json(transformedCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
    } finally {
      await connection.end();
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

  app.get("/api/customer/points", async (req, res) => {
    if (!req.user) return res.status(401).json({error: "Unauthorized"});
    const user = await db.query.users.findFirst({
      where: eq(users.id, req.user.id),
    });
    res.json(user);
  });

  // Add the customer transactions endpoint
  app.get("/api/customer/transactions", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      console.log('Fetching transactions for user:', req.user.id);

      const transactions = await db.execute(
        `SELECT 
          t.*,
          DATE_FORMAT(t.created_at, '%Y-%m-%dT%H:%i:%s.000Z') as created_at
        FROM transactions t
        WHERE t.user_id = ?
        ORDER BY t.created_at DESC`,
        [req.user.id]
      );

      // Transform the data to match the expected format
      const formattedTransactions = transactions[0].map((t: any) => ({
        id: t.id,
        points: t.points,
        description: t.description,
        type: t.type,
        createdAt: t.created_at
      }));

      res.json(formattedTransactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      res.status(500).json({ error: 'Failed to fetch transactions' });
    }
  });

  app.get("/api/customer/referral", async (req, res) => {
    if (!req.user) return res.status(401).json({error: "Unauthorized"});

    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1)
        .execute();

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      let currentReferralCode = user.referral_code;
      if (!currentReferralCode) {
        currentReferralCode = randomBytes(8).toString("hex");
        await db
          .update(users)
          .set({ referral_code: currentReferralCode })
          .where(eq(users.id, req.user.id))
          .execute();
      }

      const referrals = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.referred_by, currentReferralCode))
        .orderBy(desc(users.createdAt))
        .execute();

      res.json({
        referralCode: currentReferralCode,
        referralCount: referrals.length,
        referrals,
      });
    } catch (error) {
      console.error('Error fetching referral info:', error);
      res.status(500).json({ error: 'Failed to fetch referral information' });
    }
  });

  app.get("/api/customer/referrals", async (req, res) => {
    if (!req.user) return res.status(401).json({error: "Unauthorized"});

    try {
      console.log("Fetching referral stats for user:", req.user.id);

      const [currentUser] = await db
        .select()
        .from(users)
        .where(eq(users.id, req.user.id))
        .limit(1)
        .execute();

      if (!currentUser) {
        return res.status(404).json({ error: "User not found" });
      }

      const level1Referrals = await db
        .select({
          id: users.id,
          firstName: users.firstName,
          lastName: users.lastName,
          email: users.email,
          createdAt: users.createdAt,
          referral_code: users.referral_code
        })
        .from(users)
        .where(eq(users.referred_by, currentUser.referral_code))
        .execute();

      const level2Count = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          inArray(
            users.referred_by,
            level1Referrals.map(r => r.referral_code)
          )
        )
        .execute();

      const level2Referrals = await db
        .select({ referral_code: users.referral_code })
        .from(users)
        .where(
          inArray(
            users.referred_by,
            level1Referrals.map(r => r.referral_code)
          )
        )
        .execute();

      const level3Count = await db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(
          inArray(
            users.referred_by,
            level2Referrals.map(r => r.referral_code)
          )
        )
        .execute();

      const referralsWithCounts = await Promise.all(
        level1Referrals.map(async (referral) => {
          const referralCount = await db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.referred_by, referral.referral_code))
            .execute();

          return {
            ...referral,
            referralCount: Number(referralCount[0]?.count || 0),
          };
        })
      );

      console.log("Sending referral stats:", {
        referralCode: currentUser.referral_code,
        level1Count: level1Referrals.length,
        level2Count: Number(level2Count[0]?.count || 0),
        level3Count: Number(level3Count[0]?.count || 0),
      });

      res.json({
        referralCode: currentUser.referral_code,
        level1Count: level1Referrals.length,
        level2Count: Number(level2Count[0]?.count || 0),
        level3Count: Number(level3Count[0]?.count || 0),
        referrals: referralsWithCounts,
      });
    } catch (error) {
      console.error("Error fetching referral stats:", error);
      res.status(500).json({ error: "Failed to fetch referral stats" });
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

  app.get("/api/notifications", async (req, res) => {    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try {
      const userNotifications = await db.query.notifications.findMany({
        where: eq(notifications.userId, req.user.id),
        orderBy: desc(notifications.createdAt),
        limit: 50 
      });

      res.json(userNotifications);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  });

  app.post("/api/notifications/mark-read", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { notificationId } = req.body;

    try {
      if (notificationId) {
        const [deletedNotification] = await db
          .delete(notifications)
          .where(
            and(
              eq(notifications.id, parseInt(notificationId)),
              eq(notifications.userId, req.user.id)
            )
          )
          .returning()
          .execute();

        if (!deletedNotification) {
          return res.status(404).json({ error:"Notification not found" });
        }
      } else {
        await db
          .delete(notifications)
          .where(eq(notifications.userId, req.user.id))
          .execute();
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ error: 'Failed to mark notification as read' });
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

  app.put("/api/user", async (req, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    try{
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
        hasCreditCard
        
      } = req.body;

      const updates: any = {
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
        hasCreditCard
      };

      if (password) {
        const hashedPassword = await crypto.hash(password);
        updates.password = hashedPassword;
      }

      const [updatedUser] = await db
        .update(users)
        .set(updates)
        .where(eq(users.id, req.user.id))
        .returning()
        .execute();

      if (!updatedUser) {
        return res.status(404).json({ error: "User not found" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ 
        error: 'Failed to update profile',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      });
    }
  });
  // Unified API endpoint that handles both session-based and JWT token-based authentication
  app.get("/api/user", (req, res) => {
    console.log('User request:', {
      isAuthenticated: req.isAuthenticated(),
      user: req.user ? { id: req.user.id, email: req.user.email } : null,
      hasAuthHeader: !!req.headers.authorization
    });

    // First check session authentication
    if (req.isAuthenticated()) {
      // Get complete user details from database if authenticated via session
      const connection = createConnection()
        .then(conn => {
          conn.execute(
            `SELECT 
              u.id,
              u.email,
              u.first_name,
              u.last_name,
              u.phone_number,
              u.is_admin,
              u.is_super_admin,
              u.is_agent,
              u.is_enabled,
              u.points,
              u.referral_code,
              u.referred_by,
              u.created_at,
              u.is_south_african,
              u.id_number,
              u.date_of_birth,
              u.address,
              u.city,
              u.postal_code,
              u.industry,
              u.occupation,
              u.bank_name,
              u.account_type,
              u.account_number,
              u.account_holder_name,
              u.branch_code,
              u.selected_package,
              u.gender,
              u.has_credit_card,
              u.signature
            FROM users u
            WHERE u.id = ?`,
            [req.user.id]
          )
          .then(([users]: any) => {
            if (users && users.length > 0) {
              const user = users[0];
              // Format dates properly
              if (user.created_at) {
                user.created_at = new Date(user.created_at).toISOString();
              }
              if (user.date_of_birth) {
                user.date_of_birth = new Date(user.date_of_birth).toISOString().split('T')[0];
              }
              res.json(user);
            } else {
              res.status(404).json({ error: "User not found" });
            }
            return conn;
          })
          .catch(error => {
            console.error('Error fetching user details:', error);
            res.status(500).json({ error: 'Failed to fetch user details' });
            return conn;
          })
          .then(conn => conn.end());
        })
        .catch(error => {
          console.error('DB connection error:', error);
          res.status(500).json({ error: 'Database connection error' });
        });
      
      return;
    }
    
    // Then try JWT token authentication
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      try {
        const decoded = verifyJwtToken(token);
        if (decoded) {
          return res.json(decoded);
        }
      } catch (err) {
        console.error('JWT verification error:', err);
      }
    }
    
    // If neither authentication method succeeded
    return res.status(401).json({ error: "Unauthorized" });
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

  // Add new route for admin dashboard stats
  app.get("/api/admin/dashboard/stats", async (req, res) => {
    console.log('Admin dashboard stats request:', {
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

      // Get total customers (non-admin users)
      const [customerCount] = await connection.execute(
        `SELECT COUNT(*) as count 
         FROM users u 
         LEFT JOIN admin_users au ON u.id = au.user_id 
         WHERE au.user_id IS NULL`
      );

      // Get total points in circulation
      const [pointsTotal] = await connection.execute(
        'SELECT COALESCE(SUM(points), 0) as total FROM users'
      );

      // Get active rewards count
      const [rewardsCount] = await connection.execute(
        'SELECT COUNT(*) as count FROM rewards WHERE available = 1'
      );

      // Get total redemptions
      const [redemptionsCount] = await connection.execute(
        `SELECT COUNT(*) as count 
         FROM transactions 
         WHERE type = 'REDEEMED'`
      );

      // Get recent transactions for charts
      const [transactions] = await connection.execute(
        `SELECT 
          t.*,
          u.first_name,
          u.last_name,
          u.email
         FROM transactions t
         JOIN users u ON t.user_id = u.id
         ORDER BY t.created_at DESC
         LIMIT 50`
      );

      // Transform transaction data for frontend
      const transformedTransactions = transactions.map((t: any) => ({
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
        totalCustomers: Number(customerCount[0].count),
        totalPoints: Number(pointsTotal[0].total),
        activeRewards: Number(rewardsCount[0].count),
        totalRedemptions: Number(redemptionsCount[0].count),
        recentTransactions: transformedTransactions
      };

      console.log('Sending dashboard stats:', response);
      res.json(response);

    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
    } finally {
      await connection.end();
    }
  });

  app.get("/api/admin/users", async (req, res) => {
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

      // Fetch all admin users
      const [admins] = await connection.execute(
        `SELECT u.*, au.role_type
         FROM users u 
         INNER JOIN admin_users au ON u.id = au.user_id
         ORDER BY u.created_at DESC`
      );

      console.log(`Found ${admins.length} admin users`);

      // Transform boolean fields
      const transformedAdmins = admins.map(admin => ({
        id: admin.id,
        email: admin.email,
        firstName: admin.first_name,
        lastName: admin.last_name,
        phoneNumber: admin.phone_number,
        isEnabled: Boolean(admin.is_enabled),
        createdAt: admin.created_at,
        is_admin: true,
        is_super_admin: admin.role_type === 'SUPER_ADMIN'
      }));

      res.json(transformedAdmins);
    } catch (error) {
      console.error('Error fetching admin users:', error);
      res.status(500).json({ error: 'Failed to fetch admin users' });
    } finally {
      await connection.end();
    }
  });

  app.get("/api/admin/customers", async (req, res) => {
    console.log('Admin customers request:', {
      isAuthenticated: req.isAuthenticated(),
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

      // First, get all customers (non-admin users)
      const [customers] = await connection.execute(
        `SELECT DISTINCT u.*
         FROM users u
         LEFT JOIN admin_users au ON u.id = au.user_id
         WHERE au.user_id IS NULL
         ORDER BY u.created_at DESC`
      );

      // Then, for each customer, get their assigned products and activities
      const transformedCustomers = await Promise.all(customers.map(async (customer) => {
        // Get assigned products with their activities
        const [assignments] = await connection.execute(
          `SELECT 
            p.id as product_id,
            p.name as product_name,
            p.description as product_description,
            p.is_enabled as product_is_enabled,
            pa.id as assignment_id,
            GROUP_CONCAT(
              JSON_OBJECT(
                'id', pact.id,
                'type', pact.type,
                'pointsValue', pact.points_value
              )
            ) as activities
           FROM product_assignments pa
           JOIN products p ON pa.product_id = p.id
           LEFT JOIN product_activities pact ON p.id = pact.product_id
           WHERE pa.user_id = ?
           GROUP BY p.id, pa.id`,
          [customer.id]
        );

        // Get referral count
        const [referrals] = await connection.execute(
          'SELECT COUNT(*) as count FROM users WHERE referred_by = ?',
          [customer.referral_code]
        );

        // Transform assignments into the expected format
        const productAssignments = assignments.map(assignment => ({
          id: assignment.assignment_id,
          product: {
            id: assignment.product_id,
            name: assignment.product_name,
            description: assignment.product_description,
            isEnabled: Boolean(assignment.product_is_enabled),
            activities: assignment.activities ? 
              assignment.activities.split(',').map(activity => {
                try {
                  return JSON.parse(activity);
                } catch (e) {
                  console.error('Error parsing activity:', e);
                  return null;
                }
              }).filter(Boolean) : []
          }
        }));

        return {
          id: customer.id,
          email: customer.email,
          firstName: customer.first_name,
          lastName: customer.last_name,
          phoneNumber: customer.phone_number,
          isEnabled: Boolean(customer.is_enabled),
          isSouthAfrican: Boolean(customer.is_south_african),
          hasCreditCard: Boolean(customer.has_credit_card),
          points: Number(customer.points || 0),
          createdAt: customer.created_at,
          selectedPackage: customer.selected_package,
          industry: customer.industry,
          occupation: customer.occupation,
          address: customer.address,
          city: customer.city,
          postalCode: customer.postal_code,
          bankName: customer.bank_name,
          accountType: customer.account_type,
          accountNumber: customer.account_number,
          accountHolderName: customer.account_holder_name,
          branchCode: customer.branch_code,
          referralCode: customer.referral_code,
          referredBy: customer.referred_by,
          productAssignments: productAssignments,
          referralCount: Number(referrals[0].count || 0)
        };
      }));

      console.log(`Found ${transformedCustomers.length} customers`);
      res.json(transformedCustomers);
    } catch (error) {
      console.error('Error fetching customers:', error);
      res.status(500).json({ error: 'Failed to fetch customers' });
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

  return httpServer;
}