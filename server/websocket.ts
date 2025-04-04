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

        // Apply session middleware to get session data - handled with a timeout
        try {
          await Promise.race([
            new Promise((resolve) => {
              sessionMiddleware(info.req, {} as any, resolve);
            }),
            new Promise((_, reject) => setTimeout(() => {
              reject(new Error('Session middleware timeout'));
            }, 5000)) // 5 seconds timeout
          ]);
        } catch (e) {
          console.error('Session middleware error or timeout:', e);
          // Continue anyway and check for auth headers 
        }

        console.log('WebSocket connection attempt:', {
          hasSession: !!info.req.session,
          sessionID: info.req.sessionID || 'none',
          hasPassport: !!info.req.session?.passport,
        });

        // Check for authenticated session
        if (info.req.session?.passport?.user) {
          info.req.user = info.req.session.passport.user;
          console.log('WebSocket authenticated via passport');
          return done(true);
        }

        // Fallback to session user if available
        if (info.req.session?.user) {
          info.req.user = info.req.session.user;
          console.log('WebSocket authenticated via session');
          return done(true);
        }

        // Allow connection without authentication for client error handling
        // The actual user validation will happen on the connection event
        console.log('Allowing WebSocket connection without authentication');
        return done(true);

      } catch (error) {
        console.error('WebSocket authentication error:', error);
        // Allow connection anyway but it will be limited
        return done(true);
      }
    }
  });

  wss.on('connection', async (ws: WebSocket, req: any) => {
    try {
      // Check if we have a user in the request
      if (!req.user) {
        console.log('WebSocket client connected without authentication');
        
        // Send an error message to the client
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Authentication required'
        }));
        
        // Set a timeout to close the connection after sending the error
        setTimeout(() => {
          ws.close(1008, 'Authentication required');
        }, 1000);
        
        return;
      }
      
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
        if (user && user.id) {
          console.log('WebSocket client disconnected:', { 
            userId: user.id,
            timestamp: new Date().toISOString()
          });
          NotificationService.removeClient(user.id, ws);
        } else {
          console.log('Unauthenticated WebSocket client disconnected');
        }
      });

      // Handle client errors
      ws.on('error', (error) => {
        if (user && user.id) {
          console.error('WebSocket client error:', {
            userId: user.id,
            error: error.message
          });
        } else {
          console.error('Unauthenticated WebSocket client error:', error.message);
        }
      });

    } catch (error) {
      console.error('WebSocket connection error:', error);
      ws.close(1011, 'Internal Server Error');
    }
  });

  return wss;
}