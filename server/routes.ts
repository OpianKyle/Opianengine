import express, { type Express, type Request, type Response, type NextFunction, type RequestHandler } from "express";
import { createServer, type Server } from "http";
import passport from "passport";
import path from "path";
import { fileURLToPath } from 'url';
import { setupAuth } from "./auth";
import { setupWebSocketServer } from "./websocket"; 
import { createConnection } from './db';
import { ResultSetHeader, RowDataPacket, OkPacket } from 'mysql2/promise';
import session from 'express-session';
import MemoryStore from 'memorystore';
import referralRouter from './routes/referral';
import { sendEmail, formatRegistrationEmail } from "./utils/emailService";

// ES Module path resolution
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Type definitions
type QueryResult = RowDataPacket[] | RowDataPacket[][] | OkPacket | OkPacket[] | ResultSetHeader;

declare global {
  namespace Express {
    interface User {
      id: number;
      email: string;
      firstName: string;
      lastName: string;
      points: number;
      selectedPackage?: string;
      mandateAccepted?: boolean;
      is_admin?: boolean;
      is_super_admin?: boolean; 
      is_agent?: boolean;
    }
  }
}

interface SessionData {
  points?: number;
  userId?: number;
}

interface ExtendedRequest extends Request {
  session: session.Session & Partial<SessionData>;
}

// Initialize session store and middleware
const MemoryStoreSession = MemoryStore(session);
const sessionStore = new MemoryStoreSession({ checkPeriod: 86400000 });

const sessionMiddleware = session({
  cookie: { maxAge: 86400000, secure: false, sameSite: 'lax' },
  store: sessionStore,
  resave: false,
  saveUninitialized: false,
  secret: process.env.SESSION_SECRET || 'development-secret'
});

// Main export function to register routes
export function registerRoutes(app: Express): Server {
  console.log('Starting route registration...');

  // Set up core middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(sessionMiddleware);
  app.use(passport.initialize());
  app.use(passport.session());

  // Setup authentication
  setupAuth(app);

  // Mount API routes
  app.use('/api/customer', referralRouter);

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup WebSocket server with session support
  setupWebSocketServer(httpServer, sessionMiddleware);

  // Global error handler
  const errorHandler: RequestHandler = (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('Global error handler caught:', err);
    const status = (err as any).status || (err as any).statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ error: message });
  };

  app.use(errorHandler);

  // Static files and catch-all route
  const clientDistPath = path.resolve(__dirname, '../client/dist');
  console.log('Static files directory:', clientDistPath);

  app.use(express.static(clientDistPath));

  // Catch-all route for client-side routing
  app.get('*', (req: Request, res: Response) => {
    if (req.url.startsWith('/api/')) {
      return res.status(404).json({ error: 'API endpoint not found' });
    }

    const indexPath = path.join(clientDistPath, 'index.html');
    console.log('Serving index.html from:', indexPath);

    res.sendFile(indexPath, (err) => {
      if (err) {
        console.error('Error serving index.html:', err);
        res.status(500).send('Error loading page');
      }
    });
  });

  console.log('Route registration complete');
  return httpServer;
}