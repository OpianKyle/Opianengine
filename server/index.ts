import dotenv from "dotenv";
dotenv.config();

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
import session from 'express-session';
import passport from 'passport';
import { MemoryStore } from 'express-session';
import { createServer } from 'http';

console.log('Starting server initialization...', new Date().toISOString());

const app = express();
const server = createServer(app);

// Update CORS configuration for proper cookie handling
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

// Session configuration with enhanced security and debugging
const sessionStore = new MemoryStore({
  checkPeriod: 86400000 // prune expired entries every 24h
});

// Verify session secret is set
if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required');
}

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  cookie: { 
    maxAge: 86400000, // 24 hours
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax'
  },
  name: 'connect.sid'
});

// Initialize session before passport
app.use(sessionMiddleware);

// Initialize passport and restore authentication state from session
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

    // Test MariaDB connection using DB_ environment variables
    try {
      // Log database configuration (excluding sensitive data)
      console.log('Database configuration:', {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER
      });

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

      console.log('MariaDB connection successful');
      await connection.end();
    } catch (mariaDbError) {
      console.error('MariaDB connection test failed:', mariaDbError);
      throw mariaDbError;
    }

    // Setup authentication before routes
    console.log('Setting up authentication...');
    setupAuth(app);
    console.log('Authentication setup complete');

    // Register routes
    app.use('/api/agent', agentRouter);
    app.use('/api/admin', adminRouter);
    registerRoutes(app);
    console.log('Routes registered');

    // Global error handler
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Global error handler caught:', err);
      const status = (err as any).status || (err as any).statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ error: message });
    });

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