// Load environment variables first (must be before other imports)
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get the current file's directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from the root directory
const result = dotenv.config({
  path: path.resolve(__dirname, '..', '.env')
});

// Check if dotenv loaded successfully
if (result.error) {
  console.error('Error loading .env file:', result.error);
  process.exit(1);
}

// Validate critical environment variables
if (!process.env.SESSION_SECRET) {
  console.error('Fatal: SESSION_SECRET environment variable is missing');
  process.exit(1);
}

console.log('Environment validated:', {
  sessionSecret: process.env.SESSION_SECRET?.substring(0, 10) + '...',
  dbHost: process.env.DB_HOST,
  hasDbUrl: !!process.env.DATABASE_URL,
  envPath: path.resolve(__dirname, '..', '.env')
});

// Rest of imports
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic } from "./vite";
import cors from "cors";
import fileUpload from 'express-fileupload';
import { setupAuth } from "./auth";
import { db } from "@db";
import mysql from 'mysql2/promise';
import agentRouter from './routes/agent';
import adminRouter from './routes/admin';
import adminSubscriptionRouter from './routes/admin-subscription';
import migrationRouter from './routes/migration';
import subscriptionRouter from './routes/subscription';
import paymentRouter from './routes/payment';
import session from 'express-session';
import passport from 'passport';
import { MemoryStore } from 'express-session';
import { createServer } from 'http';

const app = express();
const server = createServer(app);

// Configure CORS properly
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));

// Enable JSON and URL-encoded body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configure file upload middleware
app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
}));

// Session configuration with enhanced security
// Create a memory store with a cleanup interval
const memoryStoreOptions = { 
  // Type assertion to allow checkPeriod option
  checkPeriod: 86400000 // prune expired entries every 24h
} as any;
const sessionStore = new MemoryStore(memoryStoreOptions);

console.log('Configuring session with secret length:', process.env.SESSION_SECRET?.length);

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET!,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 86400000, // 24 hours
    secure: false, // Set to false to work in all environments (including HTTP)
    httpOnly: true,
    sameSite: 'lax'
  },
  name: 'connect.sid'
});

// Initialize session and passport
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Add comprehensive session debug middleware
app.use((req: any, res, next) => {
  console.log('Session debug:', {
    hasSession: !!req.session,
    sessionID: req.sessionID,
    isAuthenticated: req.isAuthenticated(),
    user: req.user ? {
      id: req.user.id,
      email: req.user.email
    } : null,
    cookies: req.headers.cookie
  });
  next();
});

(async () => {
  try {
    console.log('Starting server initialization...');
    
    // Detect current domain for Replit environment
    // This is used for callback URLs in Paystack and other external services
    if (!process.env.CURRENT_DOMAIN) {
      let currentDomain = '';
      
      // First check for REPLIT_DOMAINS (most reliable)
      if (process.env.REPLIT_DOMAINS) {
        currentDomain = `https://${process.env.REPLIT_DOMAINS}`;
        console.log(`Using REPLIT_DOMAINS for callback URL: ${currentDomain}`);
      }
      // Then check for REPLIT_DEV_DOMAIN (fallback)
      else if (process.env.REPLIT_DEV_DOMAIN) {
        currentDomain = `https://${process.env.REPLIT_DEV_DOMAIN}`;
        console.log(`Using REPLIT_DEV_DOMAIN for callback URL: ${currentDomain}`);
      } 
      // Default to production domain
      else {
        currentDomain = 'https://opian.replit.app';
        console.log(`No Replit domain found, using production URL: ${currentDomain}`);
      }
      
      // Set it as an environment variable for use throughout the application
      process.env.CURRENT_DOMAIN = currentDomain;
      console.log(`Set current domain: ${currentDomain}`);
    }
    
    // Start the server early to meet the port opening deadline
    // Use port 5000 for Replit workflow compatibility, regardless of environment variable
    const SERVER_PORT = 5000;
    server.listen(Number(SERVER_PORT), '0.0.0.0', () => {
      console.log(`Server running on port ${SERVER_PORT} at ${new Date().toISOString()}`);
      console.log(`Server URL: http://0.0.0.0:${SERVER_PORT}`);
    });
    
    // Test database connection (now happening after server starts)
    console.log('Testing database connection...');
    try {
      const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: parseInt(process.env.DB_PORT || '3306'),
        ssl: {
          rejectUnauthorized: false
        }
      });

      console.log('Database connection successful');
      await connection.end();
    } catch (dbError) {
      console.error('Database connection test failed:', dbError);
      // Don't throw error - continue initialization
      console.warn('Continuing startup despite database connection issue');
    }

    // Setup authentication
    console.log('Setting up authentication...');
    setupAuth(app);
    console.log('Authentication setup complete');

    // Register routes
    app.use('/api/agent', agentRouter);
    app.use('/api/admin', adminRouter);
    app.use(adminSubscriptionRouter);
    app.use('/api/migration', migrationRouter);
    app.use(subscriptionRouter);
    app.use('/api/payment', paymentRouter);
    registerRoutes(app, sessionMiddleware);
    console.log('Routes registered');

    // Setup appropriate server based on environment
    if (process.env.NODE_ENV !== "production") {
      console.log('Setting up Vite development server...');
      await setupVite(app, server);
      console.log('Vite setup complete');
    } else {
      console.log('Setting up static file serving...');
      serveStatic(app);
      console.log('Static serving setup complete');
    }

    // Server is already started above
    console.log('Server initialization complete');
  } catch (error: any) {
    console.error('Server startup error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
})();