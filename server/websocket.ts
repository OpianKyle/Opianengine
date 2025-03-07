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
    console.log('[WebSocket] New connection received');
    let authenticated = false;

    // Set up message handler for authentication
    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('[WebSocket] Received message:', { type: data.type, hasToken: !!data.token });

        if (data.type === 'authenticate' && data.token) {
          if (authenticated) {
            console.log('[WebSocket] Client already authenticated');
            return;
          }

          console.log('[WebSocket] Verifying token');
          const user = await verifyToken(data.token);

          if (!user) {
            console.log('[WebSocket] Authentication failed - invalid token');
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

          console.log('[WebSocket] Client authenticated:', {
            userId: userData.userId,
            isAdmin: userData.isAdmin,
            totalConnections: clients.size
          });

          // Send connection confirmation
          ws.send(JSON.stringify({
            type: 'auth_success',
            timestamp: new Date().toISOString()
          }));

          try {
            // Send unread notifications
            const unreadNotifications = await db.select().from(notifications)
              .where(eq(notifications.userId, userData.userId))
              .orderBy(desc(notifications.createdAt));

            console.log('[WebSocket] Sending unread notifications:', {
              userId: userData.userId,
              count: unreadNotifications.length
            });

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
          } catch (error) {
            console.error('[WebSocket] Error sending notifications:', error);
          }
        }
      } catch (error) {
        console.error('[WebSocket] Error processing message:', error);
      }
    });

    // Set authentication timeout
    const authTimeout = setTimeout(() => {
      if (!authenticated) {
        console.log('[WebSocket] Authentication timeout - closing connection');
        ws.close(1008, 'Authentication timeout');
      }
    }, 5000);

    ws.on('close', () => {
      clearTimeout(authTimeout);
      const userData = clients.get(ws);
      if (userData) {
        console.log('[WebSocket] Client disconnected:', { userId: userData.userId });
        clients.delete(ws);
      }
    });

    ws.on('error', (error) => {
      console.error('[WebSocket] Error:', error);
      ws.close(1011, 'Internal Server Error');
    });
  });

  return {
    notifyPointsUpdate: async (userId: number, points: number, description: string) => {
      try {
        // Create notification record
        await db.insert(notifications).values({
          message: description,
          type: points >= 0 ? 'POINTS_AWARDED' : 'POINTS_DEDUCTED' as const,
          title: `${points >= 0 ? '+' : ''}${points} points`,
          userId: userId,
          isRead: false,
          createdAt: new Date()
        });

        // Get the last inserted ID
        const [idResult] = await db.select({ id: notifications.id })
          .from(notifications)
          .orderBy(desc(notifications.id))
          .limit(1);

        if (!idResult) {
          console.error('[WebSocket] Failed to retrieve notification ID');
          return;
        }

        const message = {
          type: points >= 0 ? 'POINTS_AWARDED' : 'POINTS_DEDUCTED',
          points: Math.abs(points),
          description,
          timestamp: new Date().toISOString(),
          id: idResult.id.toString()
        };

        console.log('[WebSocket] Sending points notification:', {
          userId,
          points,
          type: message.type
        });

        // Send to all connected clients for this user
        let sent = false;
        for (const [ws, client] of Array.from(clients.entries())) {
          if (client.userId === userId && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify(message));
            sent = true;
          }
        }

        console.log('[WebSocket] Notification status:', {
          userId,
          sent,
          activeConnections: clients.size
        });
      } catch (error) {
        console.error('[WebSocket] Error sending points notification:', error);
      }
    }
  };
}