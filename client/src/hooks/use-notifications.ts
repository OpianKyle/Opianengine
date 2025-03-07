import { useEffect, useRef, useState } from "react";
import { useUser } from "./use-user";
import { useToast } from "./use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface PointsNotification {
  id: string;
  type: 'POINTS_AWARDED' | 'POINTS_DEDUCTED' | 'SYSTEM_UPDATE';
  points?: number;
  description: string;
  timestamp: string;
  read: boolean;
}

export function useNotifications() {
  const { user, token } = useUser();
  const { toast } = useToast();
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;
  const isConnectingRef = useRef(false);

  // Fetch notifications from API
  const { data: notifications = [] } = useQuery<PointsNotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!user || !token) return [];

      const response = await fetch('/api/notifications', {
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    enabled: !!user && !!token
  });

  const connectWebSocket = () => {
    if (!user || !token || isConnectingRef.current) {
      console.log('[WebSocket] Connection attempt skipped:', { 
        hasUser: !!user, 
        hasToken: !!token, 
        isConnecting: isConnectingRef.current 
      });
      return;
    }

    try {
      isConnectingRef.current = true;

      // Close existing connection if any
      if (socketRef.current) {
        console.log('[WebSocket] Closing existing connection');
        socketRef.current.close();
        socketRef.current = null;
      }

      // Create WebSocket connection
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host || window.location.hostname;

      if (!host) {
        console.error('[WebSocket] Invalid host');
        return;
      }

      const wsUrl = `${protocol}//${host}/ws`;
      console.log('[WebSocket] Attempting connection:', { wsUrl, protocol, host });

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('[WebSocket] Connection opened, authenticating...');
        socket.send(JSON.stringify({ 
          type: 'authenticate', 
          token: token.replace('Bearer ', '') 
        }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[WebSocket] Received message:', data);

          if (data.type === 'auth_success') {
            console.log('[WebSocket] Authentication successful');
            setIsConnected(true);
            setReconnectAttempts(0);
            isConnectingRef.current = false;
            return;
          }

          // Refresh notifications list
          queryClient.invalidateQueries({ queryKey: ['notifications'] });

          // Show toast notification for points
          if (data.type === 'POINTS_AWARDED' || data.type === 'POINTS_DEDUCTED') {
            const points = data.points || 0;
            toast({
              title: data.type === 'POINTS_AWARDED' ? `+${points} Points` : `-${points} Points`,
              description: data.description,
              duration: 5000,
              variant: data.type === 'POINTS_AWARDED' ? 'default' : 'destructive'
            });
          }
        } catch (error) {
          console.error('[WebSocket] Error processing message:', error);
        }
      };

      socket.onclose = (event) => {
        console.log('[WebSocket] Connection closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });

        setIsConnected(false);
        socketRef.current = null;
        isConnectingRef.current = false;

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        if (reconnectAttempts < maxReconnectAttempts && user && token) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`[WebSocket] Scheduling reconnect attempt ${reconnectAttempts + 1}/${maxReconnectAttempts} in ${delay}ms`);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connectWebSocket();
          }, delay);
        }
      };

      socket.onerror = (error) => {
        console.error('[WebSocket] Error:', error);
        socket.close();
      };

    } catch (error) {
      console.error('[WebSocket] Error creating connection:', error);
      setIsConnected(false);
      isConnectingRef.current = false;
    }
  };

  useEffect(() => {
    if (user && token) {
      connectWebSocket();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
      isConnectingRef.current = false;
      setIsConnected(false);
    };
  }, [user?.id, token]);

  const markAsRead = useMutation({
    mutationFn: async (notificationId?: string) => {
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notificationId })
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }
    },
    onSuccess: (_, notificationId) => {
      queryClient.setQueryData(['notifications'], (oldData: PointsNotification[] | undefined) => {
        if (!oldData) return [];
        return oldData.map(n =>
          (notificationId ? n.id === notificationId : true)
            ? { ...n, read: true }
            : n
        );
      });
    }
  });

  return {
    notifications,
    isConnected,
    markAsRead,
    unreadCount: notifications.filter(n => !n.read).length
  };
}