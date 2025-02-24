import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { type User } from '@db/schema';
import { db } from "@db";
import { notifications } from "@db/schema";
import { verifyToken, verifySession } from './auth';
import { eq, desc, sql } from 'drizzle-orm';

// Store active connections with user information
const clients = new Map<WebSocket, {
  userId: number;
  isAdmin: boolean;
}>();

export function setupWebSocketServer(server: Server, sessionMiddleware: any) {
  const wss = new WebSocketServer({ 
    server,
    path: '/notifications-ws',
    verifyClient: async (info: any, done) => {
      try {
        // Check for Vite HMR connection
        if (info.req.headers['sec-websocket-protocol']?.includes('vite-hmr')) {
          console.log('Allowing Vite HMR WebSocket connection');
          return done(true);
        }

        // Apply session middleware to parse session
        await new Promise((resolve) => {
          sessionMiddleware(info.req, {} as any, () => resolve(true));
        });

        // Try to verify session
        try {
          const user = await verifySession(info.req);
          if (user) {
            console.log('WebSocket connection authorized via session for user:', user.id);
            info.req.user = user;
            return done(true);
          }
        } catch (error) {
          console.error('Session verification failed:', error);
        }

        console.log('WebSocket connection rejected: No valid session');
        return done(false, 401, 'Authentication required');

      } catch (error) {
        console.error('WebSocket verification error:', error);
        return done(false, 500, 'Internal Server Error');
      }
    }
  });

  wss.on('connection', async (ws: WebSocket, req: any) => {
    try {
      console.log('New WebSocket connection established:', {
        url: req.url,
        userId: req.user?.id
      });

      if (!req.user) {
        console.error('No user data found in WebSocket connection');
        ws.close(1008, 'Authentication required');
        return;
      }

      // Initialize user data from verified token/session
      const userData = {
        userId: req.user.id,
        isAdmin: req.user.isAdmin || false
      };
      clients.set(ws, userData);

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'CONNECTION_SUCCESS',
        message: 'Successfully connected to notification system',
        timestamp: new Date().toISOString(),
        id: Date.now().toString()
      }));

      // Send unread notifications immediately
      const unreadNotifications = await db.query.notifications.findMany({
        where: sql`${notifications.userId} = ${userData.userId} AND ${notifications.isRead} = false`,
        orderBy: desc(notifications.createdAt),
      });

      console.log(`Sending ${unreadNotifications.length} unread notifications to user ${userData.userId}`);

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

      ws.on('error', (error) => {
        console.error('WebSocket connection error:', error);
        clients.delete(ws);
      });

      ws.on('close', () => {
        console.log(`Client disconnected: User ${userData.userId}`);
        clients.delete(ws);
      });

    } catch (error) {
      console.error('Error handling WebSocket connection:', error);
      ws.close(1011, 'Internal Server Error');
    }
  });

  return {
    broadcastToUser: (userId: number, notification: any) => {
      console.log(`Broadcasting to user ${userId}:`, notification);
      storeAndBroadcastNotification(userId, notification);
    },

    broadcastToAdmins: (notification: any) => {
      console.log('Broadcasting to admins:', notification);
      Array.from(clients.entries()).forEach(([_ws, client]) => {
        if (client.isAdmin) {
          storeAndBroadcastNotification(client.userId, notification);
        }
      });
    },

    broadcastToAll: (notification: any) => {
      console.log('Broadcasting to all:', notification);
      Array.from(clients.entries()).forEach(([_ws, client]) => {
        storeAndBroadcastNotification(client.userId, notification);
      });
    }
  };
}

const storeAndBroadcastNotification = async (userId: number, notificationData: any) => {
  console.log(`Storing and broadcasting notification for user ${userId}:`, notificationData);

  try {
    // Store notification in database
    const [notification] = await db.insert(notifications)
      .values({
        userId,
        type: notificationData.type === "POINTS_ALLOCATION" ? "POINTS_AWARDED" : "SYSTEM_UPDATE",
        title: notificationData.type === "POINTS_ALLOCATION" ? 
          `${notificationData.points > 0 ? "+" : ""}${notificationData.points} points` : 
          "System Update",
        message: notificationData.description,
        isRead: false,
        createdAt: new Date()
      })
      .returning();

    console.log('Notification stored:', notification.id);

    const enrichedNotification = {
      ...notificationData,
      id: notification.id.toString(),
      timestamp: notification.createdAt.toISOString()
    };

    // Broadcast to connected clients
    Array.from(clients.entries()).forEach(([ws, client]) => {
      if (client.userId === userId && ws.readyState === WebSocket.OPEN) {
        console.log(`Sending notification to user ${userId}`);
        ws.send(JSON.stringify(enrichedNotification));
      }
    });
  } catch (error) {
    console.error('Error storing notification:', error);
  }
};