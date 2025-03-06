import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import fileUpload from 'express-fileupload';
import { setupAuth } from "./auth";
import { db, pool } from "@db";
import session from 'express-session';
import passport from 'passport';
import { MemoryStore } from 'express-session';

console.log('Starting server initialization...', new Date().toISOString());
console.log('Environment:', {
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT || 5000,
  hasSessionSecret: !!process.env.SESSION_SECRET,
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
    timestamp: new Date().toISOString(),
    headers: req.headers,
    sessionID: req.sessionID,
    isAuthenticated: req.isAuthenticated?.()
  });

  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.path} completed with status ${res.statusCode} in ${duration}ms`, {
      timestamp: new Date().toISOString()
    });
  });
  next();
});

(async () => {
  try {
    console.log('Starting database initialization...', new Date().toISOString());

    // Test MariaDB connection pool
    try {
      console.log('Testing database connection pool...');
      const connection = await pool.getConnection();
      console.log('Successfully acquired connection from pool');

      const [result] = await connection.execute('SELECT 1 as test');
      console.log('Database connection test successful:', result);

      connection.release();
      console.log('Connection released back to pool');
    } catch (dbError) {
      console.error('Database connection test failed:', dbError);
      throw dbError;
    }

    // Setup session with clear logging
    console.log('Configuring session middleware...', new Date().toISOString());
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
    console.log('Initializing authentication...', new Date().toISOString());
    app.use(passport.initialize());
    app.use(passport.session());

    // Setup authentication
    console.log('Setting up authentication...', new Date().toISOString());
    setupAuth(app);
    console.log('Authentication setup complete');

    // Add session debug middleware
    app.use((req, res, next) => {
      console.log('Session debug:', {
        timestamp: new Date().toISOString(),
        hasSession: !!req.session,
        sessionID: req.sessionID,
        isAuthenticated: req.isAuthenticated?.(),
        user: req.user ? { id: (req.user as any).id, isAgent: (req.user as any).is_agent } : null
      });
      next();
    });

    // Register routes
    console.log('Starting route registration...', new Date().toISOString());
    const server = registerRoutes(app);
    console.log('Routes registered successfully');

    // Global error handler
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Global error handler caught:', err);
      const status = (err as any).status || (err as any).statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ error: message });
    });

    // Setup appropriate server based on environment
    if (process.env.NODE_ENV !== "production") {
      console.log('Setting up Vite development server...', new Date().toISOString());
      await setupVite(app, server);
      console.log('Vite setup complete');
    } else {
      console.log('Setting up static file serving...', new Date().toISOString());
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
      timestamp: new Date().toISOString(),
      name: error.name,
      message: error.message,
      stack: error.stack
    });
    process.exit(1);
  }
})();