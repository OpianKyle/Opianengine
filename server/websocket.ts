import { WebSocketServer, WebSocket } from 'ws';
import { Server } from 'http';
import { type User } from '@db/schema';

// Store active connections with user information
const clients = new Map<WebSocket, {
  userId: number;
  isAdmin: boolean;
}>();

export function setupWebSocketServer(server: Server) {
  console.log('Setting up WebSocket server...');

  const wss = new WebSocketServer({ 
    server,
    path: '/ws',
    clientTracking: true
  });

  wss.on('connection', (ws: WebSocket, req) => {
    console.log('New WebSocket connection attempt from:', req.socket.remoteAddress);

    // The user data will be set after authentication
    let userData: { userId: number; isAdmin: boolean; } | null = null;

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received message:', data);

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

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.on('close', () => {
      if (userData) {
        clients.delete(ws);
        console.log(`Client disconnected: User ${userData.userId}`);
      }
    });
  });

  // Log any server-level errors
  wss.on('error', (error) => {
    console.error('WebSocket server error:', error);
  });

  console.log('WebSocket server setup complete');

  return {
    broadcastToUser: (userId: number, notification: any) => {
      console.log(`Broadcasting to user ${userId}:`, notification);
      for (const [ws, client] of clients.entries()) {
        if (client.userId === userId && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(notification));
        }
      }
    },

    broadcastToAdmins: (notification: any) => {
      console.log('Broadcasting to admins:', notification);
      for (const [ws, client] of clients.entries()) {
        if (client.isAdmin && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(notification));
        }
      }
    },

    broadcastToAll: (notification: any) => {
      console.log('Broadcasting to all clients:', notification);
      for (const [ws, _] of clients.entries()) {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(notification));
        }
      }
    }
  };
}