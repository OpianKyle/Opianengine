import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { type User } from '@db/schema';
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

        // Apply session middleware to get session data
        await new Promise((resolve) => {
          sessionMiddleware(info.req, {} as any, resolve);
        });

        console.log('WebSocket connection attempt:', {
          hasSession: !!info.req.session,
          sessionID: info.req.sessionID,
          hasPassport: !!info.req.session?.passport,
          cookies: info.req.headers.cookie,
          headers: info.req.headers
        });

        // Check for authenticated session
        if (info.req.session?.passport?.user) {
          info.req.user = info.req.session.passport.user;
          console.log('WebSocket authenticated via passport:', {
            userId: info.req.user.id,
            email: info.req.user.email,
            method: 'passport'
          });
          return done(true);
        }

        // Fallback to session user if available
        if (info.req.session?.user) {
          info.req.user = info.req.session.user;
          console.log('WebSocket authenticated via session:', {
            userId: info.req.user.id,
            email: info.req.user.email,
            method: 'session'
          });
          return done(true);
        }

        console.error('WebSocket authentication failed: No valid session');
        return done(false, 401, 'Authentication required');

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
        email: user.email,
        timestamp: new Date().toISOString()
      });

      // Add client to notification service
      NotificationService.addClient(user.id, ws);

      // Send unread notifications
      try {
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