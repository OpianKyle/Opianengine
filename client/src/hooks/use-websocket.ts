import { useEffect, useRef } from 'react';
import { useUser } from './use-user';

export function useWebSocket() {
  const ws = useRef<WebSocket | null>(null);
  const { user } = useUser();

  useEffect(() => {
    if (!user) {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
      return;
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected');
      // Send authentication message
      socket.send(JSON.stringify({
        type: 'auth',
        userId: user.id,
        isAdmin: user.isAdmin
      }));
    };

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('WebSocket message received:', data);
        // Handle different message types here
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
    };

    socket.onclose = (event) => {
      console.log('WebSocket disconnected:', event);
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [user]);

  return ws;
}
