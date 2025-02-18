import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import cors from "cors";
import fileUpload from 'express-fileupload';
import { setupWebSocketServer } from './websocket';
import { setupAuth } from './auth';

const app = express();

// Basic CORS setup
app.use(cors({
  origin: 'http://localhost:5000',
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Configure file upload middleware
app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB max file size
  },
}));

(async () => {
  try {
    // Set up authentication first
    await setupAuth(app);

    // Register routes after auth setup
    const server = registerRoutes(app);

    // Set up WebSocket server
    const wsServer = setupWebSocketServer(server);
    app.set('wsServer', wsServer);

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      console.error('Error:', err);
      res.status(500).json({ error: "Internal server error" });
    });

    if (app.get("env") === "development") {
      await setupVite(app, server);
    } else {
      serveStatic(app);
    }

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, "0.0.0.0", () => {
      log(`Server running on port ${PORT} in ${app.get("env")} mode`);
    });
  } catch (error) {
    console.error('Server initialization error:', error);
    process.exit(1);
  }
})();