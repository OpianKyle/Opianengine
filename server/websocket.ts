import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { users } from '@db/schema';
import { db } from "@db";
import { notifications } from "@db/schema";
import { sessionStore } from './auth';
import { eq, desc, sql } from 'drizzle-orm';
import { parse as parseCookie } from 'cookie';

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
        console.log('WebSocket connection attempt:', {
          url: info.req.url,
          headers: {
            cookie: info.req.headers.cookie,
            'sec-websocket-protocol': info.req.headers['sec-websocket-protocol']
          }
        });

        // Check for Vite HMR connection
        if (info.req.headers['sec-websocket-protocol']?.includes('vite-hmr')) {
          console.log('Allowing Vite HMR WebSocket connection');
          return done(true);
        }

        // Apply session middleware to parse session
        await new Promise((resolve) => {
          sessionMiddleware(info.req, {} as any, () => resolve(true));
        });

        if (!info.req.headers.cookie) {
          console.log('No cookies found in WebSocket request');
          return done(false, 401, 'No session cookie found');
        }

        const cookies = parseCookie(info.req.headers.cookie);
        const sessionId = cookies['connect.sid'];

        if (!sessionId) {
          console.log('No session ID found in WebSocket cookies');
          return done(false, 401, 'No session ID found');
        }

        sessionStore.get(sessionId, async (err: any, session: any) => {
          if (err || !session) {
            console.log('Invalid session:', err);
            return done(false, 401, 'Invalid session');
          }

          const userId = session.passport?.user;
          if (!userId) {
            console.log('No user ID in session');
            return done(false, 401, 'No user ID found');
          }

          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, userId))
            .limit(1);

          if (!user) {
            console.log('User not found');
            return done(false, 401, 'User not found');
          }

          info.req.user = user;
          console.log('WebSocket connection authorized for user:', user.id);
          done(true);
        });

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
        userId: req.user?.id,
      });

      if (!req.user) {
        console.error('No user data found in WebSocket connection');
        ws.close(1008, 'Authentication required');
        return;
      }

      // Store connection with user data
      clients.set(ws, {
        userId: req.user.id,
        isAdmin: req.user.isAdmin
      });

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'CONNECTION_SUCCESS',
        message: 'Successfully connected to notification system',
        timestamp: new Date().toISOString()
      }));

      // Send unread notifications
      const unreadNotifications = await db.query.notifications.findMany({
        where: sql`${notifications.userId} = ${req.user.id} AND ${notifications.isRead} = false`,
        orderBy: desc(notifications.createdAt),
      });

      for (const notification of unreadNotifications) {
        ws.send(JSON.stringify({
          type: notification.type,
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
        console.log(`Client disconnected: User ${req.user.id}`);
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
      Array.from(clients.entries()).forEach(([ws, client]) => {
        if (client.isAdmin) {
          storeAndBroadcastNotification(client.userId, notification);
        }
      });
    },

    broadcastToAll: (notification: any) => {
      console.log('Broadcasting to all:', notification);
      Array.from(clients.entries()).forEach(([ws, client]) => {
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