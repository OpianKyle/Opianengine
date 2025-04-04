// Import only essential environment variables - full validation in env.ts
import { SESSION_SECRET } from './env.js';

// Rest of imports
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes.js";
import { setupVite, serveStatic } from "./vite.js";
import cors from "cors";
import fileUpload from 'express-fileupload';
import { setupAuth } from "./auth.js";
import { db } from "@db";
import agentRouter from './routes/agent';
import adminRouter from './routes/admin';
import migrationRouter from './routes/migration';
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

// Session configuration with minimal settings for faster startup
const sessionStore = new MemoryStore();

const sessionMiddleware = session({
  secret: SESSION_SECRET,
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

// Initialize session and passport right away
app.use(sessionMiddleware);
app.use(passport.initialize());
app.use(passport.session());

// Start the server immediately
const PORT = parseInt(process.env.PORT || '5000');

// Setup authentication (no logging)
setupAuth(app);

// Register routes (minimal routes first for faster startup)
app.use('/api/user', (req, res) => {
  if (!req.isAuthenticated() && !req.headers.authorization) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  // If user is authenticated through session or token
  if (req.user) {
    return res.json(req.user);
  } else {
    return res.status(401).json({ error: 'Unauthorized' });
  }
});

// More route registration in background
setTimeout(() => {
  app.use('/api/agent', agentRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/migration', migrationRouter);
  registerRoutes(app, sessionMiddleware);
}, 1000);

// Start server immediately, then setup Vite/static in background
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  
  // Setup Vite/static in background
  setTimeout(async () => {
    try {
      if (process.env.NODE_ENV !== "production") {
        await setupVite(app, server);
      } else {
        serveStatic(app);
      }
      console.log('Server fully initialized');
    } catch (err) {
      console.error('Error in delayed initialization:', err);
    }
  }, 500);
});;