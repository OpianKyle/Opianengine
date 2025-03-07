import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { type User } from '@db/schema';
import { db } from "@db";
import { notifications } from "@db/schema";
import { verifyToken } from './auth';
import { eq, desc } from 'drizzle-orm';

// Store active connections with user information
const clients = new Map<WebSocket, {
  userId: number;
  isAdmin: boolean;
}>();

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
    verifyClient: async (info: any, done) => {
      try {
        // Skip Vite HMR connections
        if (info.req.headers['sec-websocket-protocol']?.includes('vite-hmr')) {
          return done(true);
        }

        // Extract token from query string
        const url = new URL(info.req.url, `http://${info.req.headers.host}`);
        const token = url.searchParams.get('token');

        if (!token) {
          console.error('WebSocket authentication failed: No token provided');
          return done(false, 401, 'Authentication required');
        }

        // Verify token and get user
        const user = await verifyToken(token);
        if (!user) {
          console.error('WebSocket authentication failed: Invalid token');
          return done(false, 401, 'Invalid token');
        }

        info.req.user = user;
        return done(true);
      } catch (error) {
        console.error('WebSocket authentication error:', error);
        return done(false, 500, 'Internal Server Error');
      }
    }
  });

  wss.on('connection', async (ws: WebSocket, req: any) => {
    try {
      const user = req.user as User;

      // Store user information
      clients.set(ws, {
        userId: user.id,
        isAdmin: user.isAdmin || false
      });

      // Fetch and send unread notifications
      const unreadNotifications = await db
        .select()
        .from(notifications)
        .where(eq(notifications.userId, user.id))
        .orderBy(desc(notifications.createdAt));

      for (const notification of unreadNotifications) {
        ws.send(JSON.stringify({
          type: notification.type,
          points: notification.type === 'POINTS_AWARDED' ? 
            parseInt(notification.title.match(/-?\d+/)?.[0] || '0') : undefined,
          description: notification.message,
          timestamp: notification.createdAt.toISOString(),
          id: notification.id.toString()
        }));
      }

      ws.on('close', () => {
        clients.delete(ws);
      });

    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(1011, 'Internal Server Error');
    }
  });

  return {
    notifyPointsUpdate: async (userId: number, points: number, description: string) => {
      try {
        // Insert notification using MariaDB syntax
        const result = await db.insert(notifications).values({
          userId,
          type: points >= 0 ? 'POINTS_AWARDED' : 'POINTS_DEDUCTED' as const,
          title: `${points >= 0 ? '+' : ''}${points} points`,
          message: description,
          isRead: false,
          createdAt: new Date()
        });

        // Get the last inserted ID
        const [notification] = await db
          .select()
          .from(notifications)
          .where(eq(notifications.id, result.insertId))
          .limit(1);

        if (!notification) {
          console.error('Failed to retrieve inserted notification');
          return;
        }

        const message = {
          type: notification.type,
          points: Math.abs(points),
          description: notification.message,
          timestamp: notification.createdAt.toISOString(),
          id: notification.id.toString()
        };

        // Send to all connected clients for this user
        for (const [ws, client] of clients) {
          if (client.userId === userId && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
          }
        }
      } catch (error) {
        console.error('Error sending points notification:', error);
      }
    }
  };
}