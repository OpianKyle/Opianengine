// Load environment variables first (must be before other imports)
import 'dotenv/config';

// Validate critical environment variables
if (!process.env.SESSION_SECRET) {
  console.error('Fatal: SESSION_SECRET environment variable is missing');
  process.exit(1);
}

console.log('Environment validated:', {
  sessionSecret: process.env.SESSION_SECRET?.substring(0, 10) + '...',
  dbHost: process.env.DB_HOST,
  hasDbUrl: !!process.env.DATABASE_URL
});

// Rest of imports
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import cors from "cors";
import fileUpload from 'express-fileupload';
import { setupAuth } from "./auth.js";
import { db } from "@db";
import mysql from 'mysql2/promise';
import agentRouter from './routes/agent.js';
import adminRouter from './routes/admin.js';
import session from 'express-session';
import passport from 'passport';
import { MemoryStore } from 'express-session';
import { createServer } from 'http';

const app = express();
const server = createServer(app);

// Update CORS configuration
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
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
const sessionStore = new MemoryStore({
  checkPeriod: 86400000 // prune expired entries every 24h
});

console.log('Configuring session with secret length:', process.env.SESSION_SECRET?.length);

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET!,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 86400000, // 24 hours
    secure: false, // Set to false as we're handling HTTPS at the proxy level
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
    console.log('Starting database initialization...');

    // Test database connection
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
      throw dbError;
    }

    // Setup authentication
    console.log('Setting up authentication...');
    setupAuth(app);
    console.log('Authentication setup complete');

    // Register routes
    app.use('/api/agent', agentRouter);
    app.use('/api/admin', adminRouter);
    registerRoutes(app);
    console.log('Routes registered');

    // Setup appropriate server based on environment
    if (process.env.NODE_ENV !== "production") {
      console.log('Setting up Vite development server...');
      await setupVite(app, server);
      console.log('Vite setup complete');
    } else {
      console.log('Setting up static file serving...');
      serveStatic(app);
      console.log('Static serving complete');
    }

    // Start the server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT} at ${new Date().toISOString()}`);
      console.log(`Server URL: http://0.0.0.0:${PORT}`);
    });
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