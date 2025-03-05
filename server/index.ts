import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import fileUpload from 'express-fileupload';
import { setupAuth } from "./auth";
import { db } from "@db";
import { users } from "@db/schema";
import mysql from 'mysql2/promise';
import agentRouter from './routes/agent';
import session from 'express-session';
import passport from 'passport';
import { MemoryStore } from 'express-session';

console.log('Starting server initialization...', new Date().toISOString());
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT || 5000,
  hasSessionSecret: !!process.env.SESSION_SECRET,
  hasDbUrl: !!process.env.DATABASE_URL
});

const app = express();

// Configure CORS with specific options
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));

console.log('CORS middleware configured');

// trust first proxy for secure cookies
app.set('trust proxy', 1);

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure file upload middleware
app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
}));

console.log('Basic middleware setup complete');

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`Incoming ${req.method} request to ${req.path}`, {
    headers: req.headers,
    sessionID: req.sessionID,
    isAuthenticated: req.isAuthenticated?.()
  });

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} completed with status ${res.statusCode} in ${duration}ms`);
  });
  next();
});

// Update session configuration
app.use(session({
  secret: process.env.SESSION_SECRET!,
  cookie: {
    maxAge: 86400000,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  },
  store: new MemoryStore({
    checkPeriod: 86400000
  }),
  resave: true,
  saveUninitialized: false,
  name: 'session'
}));

// Initialize passport after session
app.use(passport.initialize());
app.use(passport.session());

// Add session debug middleware
app.use((req, res, next) => {
  console.log('Session debug:', {
    hasSession: !!req.session,
    sessionID: req.sessionID,
    isAuthenticated: req.isAuthenticated?.(),
    user: req.user ? { id: req.user.id, isAgent: req.user.is_agent } : null
  });
  next();
});


(async () => {
  try {
    console.log('Starting database initialization...');

    // Test MariaDB connection only
    try {
      const connection = await mysql.createConnection({
        host: 'dedi1350.jnb1.host-h.net',
        user: 'admin',
        password: '8E33U976qa800F',
        database: 'opianrewards',
        port: 3306,
        ssl: {
          rejectUnauthorized: false
        }
      });

      console.log('MariaDB connection successful');
      await connection.end();
    } catch (mariaDbError) {
      console.error('MariaDB connection test failed:', mariaDbError);
      throw mariaDbError; // Critical error, can't continue without database
    }

    // Setup authentication (before routes)
    console.log('Setting up authentication...');
    setupAuth(app);
    console.log('Authentication setup complete');

    // Register routes
    app.use('/api/agent', agentRouter);
    const server = registerRoutes(app);
    console.log('Routes registered');

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Global error handler caught:', err);
      const status = err.status || err.statusCode || 500;
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
  } catch (error) {
    console.error('Server startup error:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
})();