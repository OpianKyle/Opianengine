import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import fileUpload from 'express-fileupload';
import { setupAuth } from "./auth";
import { db } from "@db";
import { users } from "@db/schema";

// Check required environment variables
const requiredEnvVars = ['DATABASE_URL', 'SESSION_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars.join(', '));
  process.exit(1);
}

const app = express();

// Configure CORS with specific options
app.use(cors({
  origin: true, // Allow any origin in development
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['set-cookie']
}));

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
    log('Starting server initialization...');

    // Initialize database connection
    log('Initializing database connection...');

    // Test database connection with a simple query
    try {
      await db.select().from(users).limit(1);
      log('Database connection successful');
    } catch (dbError) {
      console.error('Database connection test failed:', dbError);
      process.exit(1);
    }

    // Setup authentication (before routes)
    setupAuth(app);
    log('Authentication setup complete');

    const server = registerRoutes(app);
    log('Routes registered');

    // Global error handler
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Global error handler caught:', err);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      res.status(status).json({ error: message });
    });

    // Setup appropriate server based on environment
    if (process.env.NODE_ENV !== "production") {
      log('Setting up Vite development server...');
      await setupVite(app, server);
      log('Vite setup complete');
    } else {
      log('Setting up static file serving...');
      serveStatic(app);
      log('Static serving setup complete');
    }

    // Start the server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      log(`Server running on port ${PORT}`);
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