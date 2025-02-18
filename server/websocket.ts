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
    path: '/ws'
  });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('New WebSocket connection attempt');

    // The user data will be set after authentication
    let userData: { userId: number; isAdmin: boolean; } | null = null;

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message.toString());

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
            message: 'Successfully connected to notification system'
          }));
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
        ws.send(JSON.stringify({
          type: 'error',
          message: 'Invalid message format'
        }));
      }
    });

    ws.on('close', () => {
      if (userData) {
        clients.delete(ws);
        console.log(`Client disconnected: User ${userData.userId}`);
      }
    });
  });

  return {
    broadcastToUser: (userId: number, notification: any) => {
      for (const [ws, client] of clients.entries()) {
        if (client.userId === userId && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(notification));
        }
      }
    },

    broadcastToAdmins: (notification: any) => {
      for (const [ws, client] of clients.entries()) {
        if (client.isAdmin && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(notification));
        }
      }
    },

    broadcastToAll: (notification: any) => {
      for (const [ws, _] of clients.entries()) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(notification));
        }
      }
    }
  };
}