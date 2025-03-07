import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { type User } from '@db/schema';
import { verifyToken } from './auth';
import { NotificationService } from './services/notification-service';

export function setupWebSocketServer(server: Server, sessionMiddleware: any) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
    verifyClient: async (info: any, done) => {
      try {
        // Skip Vite HMR connections
        if (info.req.headers['sec-websocket-protocol']?.includes('vite-hmr')) {
          console.log('Allowing Vite HMR connection');
          return done(true);
        }

        // Apply session middleware
        await new Promise((resolve) => {
          sessionMiddleware(info.req, {} as any, resolve);
        });

        // Check for authenticated session
        if (info.req.session?.passport?.user) {
          info.req.user = info.req.session.passport.user;
          console.log('WebSocket authenticated via session:', {
            userId: info.req.user.id,
            isAuthenticated: true,
            method: 'session'
          });
          return done(true);
        }

        console.log('Session authentication failed, trying token auth:', {
          hasSession: !!info.req.session,
          hasPassport: !!info.req.session?.passport,
          headers: info.req.headers
        });

        // Token-based authentication as fallback
        const url = new URL(info.req.url, `http://${info.req.headers.host}`);
        const token = url.searchParams.get('token');

        if (!token) {
          console.error('WebSocket authentication failed: No authentication method available');
          return done(false, 401, 'Authentication required');
        }

        const user = await verifyToken(token);
        if (!user) {
          console.error('WebSocket token authentication failed: Invalid token');
          return done(false, 401, 'Invalid token');
        }

        info.req.user = user;
        console.log('WebSocket authenticated via token:', {
          userId: user.id,
          isAuthenticated: true,
          method: 'token'
        });

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
      console.log('WebSocket client connected:', {
        userId: user.id,
        timestamp: new Date().toISOString()
      });

      // Add client to notification service
      NotificationService.addClient(user.id, ws);

      // Send unread notifications
      try {
        const unreadNotifications = await NotificationService.getUnreadNotifications(user.id);
        console.log('Sending unread notifications:', {
          userId: user.id,
          count: unreadNotifications.length,
          notifications: unreadNotifications
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
      } catch (error) {
        console.error('Error sending unread notifications:', error);
      }

      // Handle client disconnection
      ws.on('close', () => {
        console.log('WebSocket client disconnected:', { 
          userId: user.id,
          timestamp: new Date().toISOString()
        });
        NotificationService.removeClient(user.id, ws);
      });

      // Handle client errors
      ws.on('error', (error) => {
        console.error('WebSocket client error:', {
          userId: user.id,
          error: error.message
        });
      });

    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(1011, 'Internal Server Error');
    }
  });

  return wss;
}