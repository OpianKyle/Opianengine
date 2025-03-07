import { useEffect, useRef, useState, useCallback } from 'react';
import { useToast } from './use-toast';
import { useAuth } from './use-auth';

type WebSocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

export function useWebSocket(path: string = '/ws') {
  const ws = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<WebSocketStatus>('disconnected');
  const { toast } = useToast();
  const { user } = useAuth();
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  const connect = useCallback(() => {
    // Only attempt connection if user is authenticated
    if (!user) {
      setStatus('disconnected');
      return;
    }

    try {
      // Clean up any existing connection
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }

      // Get the current host from window.location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;

      // Ensure we have both protocol and host before creating WebSocket
      if (!protocol || !host) {
        console.error('Invalid WebSocket URL components:', { protocol, host });
        setStatus('error');
        return;
      }

      const wsUrl = `${protocol}//${host}${path}`;
      console.log('Connecting WebSocket to:', wsUrl);

      const socket = new WebSocket(wsUrl);
      ws.current = socket;
      setStatus('connecting');

      socket.onopen = () => {
        console.log('WebSocket connected');
        setStatus('connected');
        reconnectAttempts.current = 0;
      };

      socket.onclose = () => {
        console.log('WebSocket disconnected');
        setStatus('disconnected');
        ws.current = null;

        // Only attempt reconnection if still authenticated
        if (user && reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          setTimeout(connect, delay);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setStatus('error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      setStatus('error');
    }
  }, [path, toast, user]);

  useEffect(() => {
    connect();

    return () => {
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, [connect, user]);

  const send = useCallback((data: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(data));
    } else {
      console.warn('WebSocket is not connected');
    }
  }, []);

  return {
    status,
    send,
    socket: ws.current,
  };
}