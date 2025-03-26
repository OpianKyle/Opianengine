import dotenv from "dotenv";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env file with explicit path
dotenv.config({ 
  path: path.resolve(__dirname, '..', '.env'),
  debug: process.env.NODE_ENV !== 'production'
});

// Debug log environment variables (excluding sensitive data)
console.log('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV,
  hasSessionSecret: !!process.env.SESSION_SECRET,
  hasJwtSecret: !!process.env.JWT_SECRET,
  // Database variables
  hasDbHost: !!process.env.DB_HOST || !!process.env.PGHOST,
  hasDbUser: !!process.env.DB_USER || !!process.env.PGUSER,
  hasDbName: !!process.env.DB_NAME || !!process.env.PGDATABASE,
  hasDbPort: !!process.env.DB_PORT || !!process.env.PGPORT,
  hasDatabaseUrl: !!process.env.DATABASE_URL
});

// Import remaining dependencies
import { z } from "zod";
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

// Essential environment variables validation
const requiredEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  SESSION_SECRET: z.string().min(1, "SESSION_SECRET is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
}).strict();

// Database configuration validation with fallbacks for PostgreSQL variables
const dbSchema = z.object({
  DATABASE_URL: z.string().optional(),
  // MariaDB variables
  DB_HOST: z.string().optional(),
  DB_USER: z.string().optional(),
  DB_PASSWORD: z.string().optional(),
  DB_NAME: z.string().optional(),
  DB_PORT: z.string().transform(val => parseInt(val, 10)).optional(),
  // PostgreSQL variables
  PGHOST: z.string().optional(),
  PGUSER: z.string().optional(),
  PGPASSWORD: z.string().optional(),
  PGDATABASE: z.string().optional(),
  PGPORT: z.string().transform(val => parseInt(val, 10)).optional(),
}).refine(data => {
  // Check for DATABASE_URL first
  if (data.DATABASE_URL) return true;

  // Then check for either MariaDB or PostgreSQL variables
  const hasMariaDB = !!(data.DB_HOST && data.DB_USER && data.DB_PASSWORD && data.DB_NAME);
  const hasPostgres = !!(data.PGHOST && data.PGUSER && data.PGPASSWORD && data.PGDATABASE);

  return hasMariaDB || hasPostgres;
}, {
  message: "Either DATABASE_URL or a complete set of database connection variables must be provided"
});

// Validate required environment variables first
try {
  const env = requiredEnvSchema.parse(process.env);
  console.log('Required environment variables validated successfully');
} catch (error) {
  console.error('Required environment variables validation failed:', error);
  process.exit(1);
}

// Then validate database configuration
try {
  const dbConfig = dbSchema.parse(process.env);
  console.log('Database configuration validated successfully:', {
    hasDbUrl: !!dbConfig.DATABASE_URL,
    hasMariaDB: !!(dbConfig.DB_HOST && dbConfig.DB_USER && dbConfig.DB_NAME),
    hasPostgres: !!(dbConfig.PGHOST && dbConfig.PGUSER && dbConfig.PGDATABASE)
  });
} catch (error) {
  console.error('Database configuration validation failed:', error);
  process.exit(1);
}

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

// Configure middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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

const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET!,
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
    console.log('Starting server initialization...');

    // Test database connection
    try {
      let connectionConfig: mysql.ConnectionOptions;

      if (process.env.DATABASE_URL) {
        // Parse DATABASE_URL
        const url = new URL(process.env.DATABASE_URL);
        connectionConfig = {
          host: url.hostname,
          user: url.username,
          password: url.password,
          database: url.pathname.slice(1),
          port: parseInt(url.port || '3306'),
          ssl: {
            rejectUnauthorized: false
          }
        };
      } else if (process.env.DB_HOST) {
        // Use MariaDB variables
        connectionConfig = {
          host: process.env.DB_HOST,
          user: process.env.DB_USER!,
          password: process.env.DB_PASSWORD!,
          database: process.env.DB_NAME!,
          port: parseInt(process.env.DB_PORT || '3306'),
          ssl: {
            rejectUnauthorized: false
          }
        };
      } else {
        // Use PostgreSQL variables
        connectionConfig = {
          host: process.env.PGHOST!,
          user: process.env.PGUSER!,
          password: process.env.PGPASSWORD!,
          database: process.env.PGDATABASE!,
          port: parseInt(process.env.PGPORT || '5432'),
          ssl: {
            rejectUnauthorized: false
          }
        };
      }

      // Log sanitized database configuration
      console.log('Database configuration:', {
        host: connectionConfig.host,
        port: connectionConfig.port,
        database: connectionConfig.database,
        user: connectionConfig.user
      });

      const connection = await mysql.createConnection(connectionConfig);
      console.log('Database connection successful');
      await connection.end();
    } catch (dbError) {
      console.error('Database connection test failed:', dbError);
      throw dbError;
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
    server.listen(PORT, () => {
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