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
    // Remove verifyClient and handle auth in connection
  });

  wss.on('connection', async (ws: WebSocket, req: any) => {
    try {
      // Check for Vite HMR connection
      if (req.headers['sec-websocket-protocol']?.includes('vite-hmr')) {
        console.log('Allowing Vite HMR WebSocket connection');
        return;
      }

      // Get session cookie or token from URL
      const url = new URL(req.url, `http://${req.headers.host}`);
      const token = url.searchParams.get('token') || req.headers.cookie?.match(/connect\.sid=([^;]+)/)?.[1];

      console.log('WebSocket connection attempt:', {
        url: req.url,
        hasToken: !!token,
        headers: {
          cookie: req.headers.cookie,
          protocol: req.headers['sec-websocket-protocol'],
        }
      });

      if (!token) {
        console.log('WebSocket connection rejected: No token/session');
        ws.close(1008, 'Authentication required');
        return;
      }

      // Verify token/session
      let user;
      try {
        user = await verifyToken(token);
      } catch (error) {
        console.error('Token/Session verification failed:', error);
        ws.close(1008, 'Invalid authentication');
        return;
      }

      if (!user) {
        console.log('WebSocket connection rejected: Invalid user');
        ws.close(1008, 'Invalid user');
        return;
      }

      // Store user information
      const userData = {
        userId: user.id,
        isAdmin: user.isAdmin || false
      };
      clients.set(ws, userData);

      console.log('WebSocket client connected:', {
        userId: userData.userId,
        isAdmin: userData.isAdmin,
        totalConnections: clients.size
      });

      // Send connection confirmation
      ws.send(JSON.stringify({
        type: 'auth_success',
        message: 'Connected to notification system',
        timestamp: new Date().toISOString()
      }));

      // Send unread notifications
      const unreadNotifications = await db.query.notifications.findMany({
        where: eq(notifications.userId, userData.userId),
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

      ws.on('close', () => {
        console.log(`WebSocket client disconnected: User ${userData.userId}`);
        clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error(`WebSocket error for user ${userData.userId}:`, error);
        clients.delete(ws);
      });

    } catch (error) {
      console.error('Error handling WebSocket connection:', error);
      ws.close(1011, 'Internal Server Error');
    }
  });

  return {
    notifyPointsUpdate: async (userId: number, points: number, description: string) => {
      try {
        // Store notification
        await db.insert(notifications).values({
          userId,
          type: points >= 0 ? 'POINTS_AWARDED' : 'POINTS_DEDUCTED',
          title: `${points >= 0 ? '+' : ''}${points} points`,
          message: description,
          isRead: false,
          createdAt: new Date()
        });

        const message = {
          type: points >= 0 ? 'POINTS_AWARDED' : 'POINTS_DEDUCTED',
          points: Math.abs(points),
          description,
          timestamp: new Date().toISOString()
        };

        console.log('Sending points notification:', {
          userId,
          points,
          type: message.type,
          activeConnections: Array.from(clients.values())
            .filter(client => client.userId === userId).length
        });

        // Send to connected user
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