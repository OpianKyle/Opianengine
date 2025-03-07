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

        console.log('WebSocket authentication attempt:', {
          hasToken: !!token,
          url: info.req.url
        });

        if (!token) {
          console.error('WebSocket authentication failed: No token provided');
          return done(false, 401, 'Authentication required');
        }

        // Verify token and get user
        const user = await verifyToken(token);
        console.log('Token verification result:', {
          hasUser: !!user,
          userId: user?.id
        });

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
      console.log('WebSocket client connected:', { userId: user.id });

      // Store user information
      clients.set(ws, {
        userId: user.id,
        isAdmin: user.isAdmin || false
      });

      // Send unread notifications on connect
      try {
        const unreadNotifications = await db.select()
          .from(notifications)
          .where(eq(notifications.userId, user.id))
          .orderBy(desc(notifications.createdAt));

        console.log('Found unread notifications:', { 
          userId: user.id, 
          count: unreadNotifications.length 
        });

        for (const notification of unreadNotifications) {
          ws.send(JSON.stringify({
            id: notification.id.toString(),
            type: notification.type,
            title: notification.title,
            description: notification.message,
            timestamp: notification.createdAt.toISOString(),
            read: notification.isRead
          }));
        }
      } catch (error) {
        console.error('Error fetching notifications:', error);
      }

      ws.on('close', () => {
        console.log('WebSocket client disconnected:', { userId: user.id });
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
        console.log('Creating points notification:', { userId, points, description });

        // Create notification with consistent type and format
        const notificationData = {
          userId,
          type: 'POINTS_AWARDED' as const,
          title: points >= 0 ? `Earned ${points} points` : `Deducted ${Math.abs(points)} points`,
          message: description,
          isRead: false,
          createdAt: new Date()
        };

        const [insertedNotification] = await db.insert(notifications)
          .values(notificationData)
          .returning();

        if (!insertedNotification) {
          console.error('Failed to create notification record');
          return;
        }

        console.log('Notification created:', {
          id: insertedNotification.id,
          type: insertedNotification.type,
          title: insertedNotification.title
        });

        const message = {
          id: insertedNotification.id.toString(),
          type: insertedNotification.type,
          title: insertedNotification.title,
          description: insertedNotification.message,
          timestamp: insertedNotification.createdAt.toISOString(),
          read: insertedNotification.isRead
        };

        // Send to all connected clients for this user
        let sent = false;
        for (const [ws, client] of Array.from(clients.entries())) {
          if (client.userId === userId && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
            sent = true;
          }
        }

        console.log('Points notification status:', {
          userId,
          sent,
          activeConnections: clients.size
        });
      } catch (error) {
        console.error('Error sending points notification:', error);
      }
    }
  };
}