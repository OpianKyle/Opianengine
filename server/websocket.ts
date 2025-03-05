import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { verifyToken } from './auth';
import { createConnection } from './db';

// Store active connections with user information
const clients = new Map<WebSocket, {
  userId: number;
  isAdmin: boolean;
}>();

export function setupWebSocketServer(server: Server, sessionMiddleware: any) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
    verifyClient: async (info: any, done) => {
      try {
        // Log connection attempt details
        console.log('WebSocket connection attempt:', {
          url: info.req.url,
          headers: {
            protocol: info.req.headers['sec-websocket-protocol'],
            upgrade: info.req.headers.upgrade,
            connection: info.req.headers.connection
          }
        });

        // Check for Vite HMR connection
        if (info.req.headers['sec-websocket-protocol']?.includes('vite-hmr')) {
          console.log('Allowing Vite HMR WebSocket connection');
          return done(true);
        }

        // Extract and verify token
        const url = new URL(info.req.url, `http://${info.req.headers.host}`);
        const token = url.searchParams.get('token');

        console.log('Token verification:', {
          hasToken: !!token,
          tokenLength: token?.length,
          urlPath: url.pathname,
          urlParams: Array.from(url.searchParams.keys())
        });

        if (!token) {
          console.log('WebSocket connection rejected: No token provided');
          return done(false, 401, 'Authentication required');
        }

        // Verify token
        try {
          const user = await verifyToken(token);
          if (user) {
            console.log('WebSocket authenticated for user:', {
              userId: user.id,
              isAdmin: user.isAdmin
            });
            info.req.user = user;
            return done(true);
          }
        } catch (error) {
          console.error('Token verification failed:', error);
          return done(false, 401, 'Invalid token');
        }

        return done(false, 401, 'Authentication failed');
      } catch (error) {
        console.error('WebSocket verification error:', error);
        return done(false, 500, 'Internal Server Error');
      }
    }
  });

  wss.on('connection', async (ws: WebSocket, req: any) => {
    try {
      if (!req.user) {
        console.log('Rejecting WebSocket connection: No user in request');
        ws.close(1008, 'Authentication required');
        return;
      }

      // Store user information
      const userData = {
        userId: req.user.id,
        isAdmin: req.user.isAdmin || false
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

      // Send unread notifications using MariaDB connection
      const connection = await createConnection();
      try {
        const [unreadNotifications] = await connection.execute(
          `SELECT id, type, title, message, created_at as createdAt, is_read as isRead
           FROM notifications 
           WHERE user_id = ? AND is_read = 0
           ORDER BY created_at DESC`,
          [userData.userId]
        );

        console.log(`Sending ${(unreadNotifications as any[]).length} unread notifications to user ${userData.userId}`);

        for (const notification of unreadNotifications as any[]) {
          ws.send(JSON.stringify({
            type: notification.type,
            points: notification.type === 'POINTS_AWARDED' ? 
              parseInt(notification.title.match(/-?\d+/)?.[0] || '0') : undefined,
            description: notification.message,
            timestamp: notification.createdAt.toISOString(),
            id: notification.id.toString()
          }));
        }
      } finally {
        await connection.end();
      }

      ws.on('close', () => {
        console.log(`WebSocket client disconnected: User ${userData.userId}`);
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
        const connection = await createConnection();
        try {
          // Store notification in database
          const [result] = await connection.execute(
            `INSERT INTO notifications (
              user_id, type, title, message, is_read, created_at
            ) VALUES (?, ?, ?, ?, false, NOW())`,
            [
              userId,
              points >= 0 ? 'POINTS_AWARDED' : 'POINTS_DEDUCTED',
              `${points >= 0 ? '+' : ''}${points} points`,
              description
            ]
          );

          const notificationId = (result as any).insertId;
          const [notificationRows] = await connection.execute(
            'SELECT created_at FROM notifications WHERE id = ?',
            [notificationId]
          );
          const notification = (notificationRows as any[])[0];

          const message = {
            type: points >= 0 ? 'POINTS_AWARDED' : 'POINTS_DEDUCTED',
            points: Math.abs(points),
            description,
            timestamp: notification.created_at.toISOString(),
            id: notificationId.toString()
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
        } finally {
          await connection.end();
        }
      } catch (error) {
        console.error('Error sending points notification:', error);
      }
    }
  };
}