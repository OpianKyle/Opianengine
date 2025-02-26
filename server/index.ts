import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import fileUpload from 'express-fileupload';
import { setupAuth } from "./auth";
import { db } from "@db";
import { users } from "@db/schema";
import mysql from 'mysql2/promise';

// Check required environment variables
const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

console.log('Starting server initialization...', new Date().toISOString());

const app = express();

// Configure CORS with specific options
app.use(cors({
  origin: true, // Allow any origin in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));

console.log('CORS middleware configured');

app.set('trust proxy', 1); // trust first proxy

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
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });
  next();
});

(async () => {
  try {
    console.log('Starting database initialization...');

    // Test MariaDB connection
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
    }

    // Test PostgreSQL connection
    try {
      await db.select().from(users).limit(1);
      console.log('PostgreSQL connection successful');
    } catch (dbError) {
      console.error('PostgreSQL connection test failed:', dbError);
    }

    // Setup authentication (before routes)
    console.log('Setting up authentication...');
    setupAuth(app);
    console.log('Authentication setup complete');

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
    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT} at ${new Date().toISOString()}`);
    });
  } catch (error) {
    console.error('Server startup error:', error);
    // Log additional details about the error
    if (error instanceof Error) {
      console.error('Error name:', error.name);
      console.error('Error message:', error.message);
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
})();