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
    path: '/ws'
  });

  wss.on('connection', async (ws: WebSocket) => {
    try {
      let authenticated = false;

      // Set up message handler for authentication
      ws.on('message', async (message: string) => {
        try {
          if (authenticated) {
            return; // Skip if already authenticated
          }

          const data = JSON.parse(message);
          if (data.type === 'authenticate' && data.token) {
            const user = await verifyToken(data.token);
            if (!user) {
              ws.close(1008, 'Authentication failed');
              return;
            }

            // Store user information
            const userData = {
              userId: user.id,
              isAdmin: user.isAdmin || false
            };
            clients.set(ws, userData);
            authenticated = true;

            console.log('WebSocket client authenticated:', {
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
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
          ws.close(1011, 'Internal Server Error');
        }
      });

      // Set authentication timeout
      const authTimeout = setTimeout(() => {
        if (!authenticated) {
          ws.close(1008, 'Authentication timeout');
        }
      }, 5000);

      ws.on('close', () => {
        clearTimeout(authTimeout);
        const userData = clients.get(ws);
        if (userData) {
          console.log(`WebSocket client disconnected: User ${userData.userId}`);
          clients.delete(ws);
        }
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
        const [notification] = await db.insert(notifications).values({
          userId,
          type: points >= 0 ? 'POINTS_AWARDED' : 'POINTS_DEDUCTED',
          title: `${points >= 0 ? '+' : ''}${points} points`,
          message: description,
          isRead: false,
          createdAt: new Date()
        }).returning();

        const message = {
          type: points >= 0 ? 'POINTS_AWARDED' : 'POINTS_DEDUCTED',
          points: Math.abs(points),
          description,
          timestamp: notification.createdAt.toISOString(),
          id: notification.id.toString()
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