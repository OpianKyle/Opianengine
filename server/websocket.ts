import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { type User } from '@db/schema';

// Store active connections with user information
const clients = new Map<WebSocket, {
  userId: number;
  isAdmin: boolean;
}>();

export function setupWebSocketServer(server: Server) {
  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
    // Ignore Vite HMR connections
    verifyClient: (info: any) => {
      const protocol = info.req.headers['sec-websocket-protocol'];
      return protocol !== 'vite-hmr';
    }
  });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('New WebSocket connection attempt');

    // The user data will be set after authentication
    let userData: { userId: number; isAdmin: boolean; } | null = null;

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received WebSocket message:', data);

        // Handle authentication message
        if (data.type === 'auth') {
          userData = {
            userId: data.userId,
            isAdmin: data.isAdmin
          };
          clients.set(ws, userData);
          console.log(`Client authenticated: User ${userData.userId} (Admin: ${userData.isAdmin})`);

          // Send confirmation
          ws.send(JSON.stringify({
            type: 'auth_success',
            message: 'Successfully connected to notification system',
            timestamp: new Date().toISOString(),
            id: Date.now().toString()
          }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format',
          timestamp: new Date().toISOString(),
          id: Date.now().toString()
        }));
      }
    });

    ws.on('close', () => {
      if (userData) {
        clients.delete(ws);
        console.log(`Client disconnected: User ${userData.userId}`);
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket connection error:', error);
      if (userData) {
        clients.delete(ws);
      }
    });
  });

  return {
    broadcastToUser: (userId: number, notification: any) => {
      const enrichedNotification = {
        ...notification,
        timestamp: new Date().toISOString(),
        id: Date.now().toString()
      };

      Array.from(clients.entries()).forEach(([ws, client]) => {
        if (client.userId === userId && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(enrichedNotification));
        }
      });
    },

    broadcastToAdmins: (notification: any) => {
      const enrichedNotification = {
        ...notification,
        timestamp: new Date().toISOString(),
        id: Date.now().toString()
      };

      Array.from(clients.entries()).forEach(([ws, client]) => {
        if (client.isAdmin && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(enrichedNotification));
        }
      });
    },

    broadcastToAll: (notification: any) => {
      const enrichedNotification = {
        ...notification,
        timestamp: new Date().toISOString(),
        id: Date.now().toString()
      };

      Array.from(clients.entries()).forEach(([ws, _client]) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(enrichedNotification));
        }
      });
    }
  };
}