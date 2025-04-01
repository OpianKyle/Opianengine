import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './use-auth';

interface WebSocketOptions {
  reconnectOnClose?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

type MessageHandler = (data: any) => void;

export function useWebSocket(options: WebSocketOptions = {}) {
  const { 
    reconnectOnClose = true, 
    reconnectInterval = 5000, 
    maxReconnectAttempts = 5 
  } = options;
  
  const { user } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [error, setError] = useState<Error | null>(null);
  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const messageHandlers = useRef<Map<string, Set<MessageHandler>>>(new Map());
  
  // Connect to WebSocket
  const connect = useCallback(() => {
    if (!user?.id) return;
    
    try {
      // Close existing connection first
      if (ws.current && ws.current.readyState !== WebSocket.CLOSED) {
        ws.current.close();
      }
      
      // Create new connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/api/ws?userId=${user.id}`;
      
      console.log('Connecting to WebSocket at:', wsUrl);
      const socket = new WebSocket(wsUrl);
      
      socket.onopen = () => {
        console.log('WebSocket connection established');
        setIsConnected(true);
        setError(null);
        reconnectCount.current = 0;
        // Store in window for cleanup
        (window as any).__webSocketInstance = socket;
      };
      
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);
          setLastMessage(data);
          
          // If the message has a type, trigger type-specific handlers
          if (data.type && messageHandlers.current.has(data.type)) {
            const handlers = messageHandlers.current.get(data.type);
            if (handlers) {
              handlers.forEach(handler => handler(data));
            }
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };
      
      socket.onerror = (event) => {
        console.error('WebSocket error:', event);
        setError(new Error('WebSocket connection error'));
      };
      
      socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        setIsConnected(false);
        
        // Try to reconnect if enabled
        if (reconnectOnClose && reconnectCount.current < maxReconnectAttempts) {
          console.log(`Reconnecting in ${reconnectInterval}ms...`);
          reconnectCount.current++;
          setTimeout(connect, reconnectInterval);
        }
      };
      
      ws.current = socket;
    } catch (err) {
      console.error('WebSocket connection failed:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    }
  }, [user?.id, reconnectOnClose, reconnectInterval, maxReconnectAttempts]);
  
  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
    setIsConnected(false);
  }, []);
  
  // Add message handler for specific message types
  const addMessageHandler = useCallback((type: string, handler: MessageHandler) => {
    if (!messageHandlers.current.has(type)) {
      messageHandlers.current.set(type, new Set());
    }
    messageHandlers.current.get(type)?.add(handler);
    
    // Return function to remove handler
    return () => {
      const handlers = messageHandlers.current.get(type);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          messageHandlers.current.delete(type);
        }
      }
    };
  }, []);
  
  // Connect when user ID changes or component mounts
  useEffect(() => {
    if (user?.id) {
      connect();
    }
    return disconnect;
  }, [user?.id, connect, disconnect]);
  
  return {
    isConnected,
    lastMessage,
    error,
    connect,
    disconnect,
    addMessageHandler
  };
}