import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { type User } from '@db/schema';
import { verifyToken } from './auth';
import { NotificationService } from './services/notification-service';

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

      // Add client to notification service
      NotificationService.addClient(user.id, ws);

      // Send unread notifications
      const unreadNotifications = await NotificationService.getUnreadNotifications(user.id);
      console.log('Sending unread notifications:', {
        userId: user.id,
        count: unreadNotifications.length
      });

      for (const notification of unreadNotifications) {
        ws.send(JSON.stringify({
          id: notification.id.toString(),
          type: notification.type,
          title: notification.title,
          message: notification.message,
          metadata: notification.metadata,
          timestamp: notification.createdAt.toISOString(),
          read: notification.isRead
        }));
      }

      ws.on('close', () => {
        console.log('WebSocket client disconnected:', { userId: user.id });
        NotificationService.removeClient(user.id, ws);
      });

    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(1011, 'Internal Server Error');
    }
  });

  return {
    notifyPointsUpdate: NotificationService.notifyPointsUpdate.bind(NotificationService)
  };
}