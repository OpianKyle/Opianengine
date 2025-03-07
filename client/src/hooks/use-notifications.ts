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
    if (!user || !token) {
      console.log('WebSocket setup skipped - no auth:', { hasUser: !!user, hasToken: !!token });
      return;
    }

    // Skip if already connecting or connected
    if (isConnectingRef.current || (socketRef.current?.readyState === WebSocket.OPEN)) {
      return;
    }

    try {
      isConnectingRef.current = true;

      // Get the current host and protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;

      // Ensure we have both protocol and host
      if (!protocol || !host) {
        console.error('Invalid WebSocket URL components:', { protocol, host });
        return;
      }

      const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(token)}`;

      console.log('Creating WebSocket connection:', {
        protocol,
        host,
        hasToken: !!token,
        tokenLength: token?.length,
        wsUrl: wsUrl.replace(token, '[REDACTED]')
      });

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connection established');
        setIsConnected(true);
        setReconnectAttempts(0);
        isConnectingRef.current = false;
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);

          if (data.type === 'auth_success') {
            return;
          }

          // Refresh notifications list
          queryClient.invalidateQueries({ queryKey: ['notifications'] });

          // Show toast notification for points
          if (data.type === 'POINTS_AWARDED' || data.type === 'POINTS_DEDUCTED') {
            const points = data.points || 0;
            const sign = data.type === 'POINTS_AWARDED' ? '+' : '-';
            toast({
              title: `${sign}${Math.abs(points)} Points`,
              description: data.description,
              duration: 5000,
              variant: data.type === 'POINTS_AWARDED' ? 'default' : 'destructive'
            });
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        isConnectingRef.current = false;
      };

      socket.onclose = (event) => {
        console.log('WebSocket connection closed:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });

        setIsConnected(false);
        socketRef.current = null;
        isConnectingRef.current = false;

        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        // Only attempt reconnection if:
        // 1. Not a clean closure
        // 2. Under max attempts
        // 3. Have valid user and token
        if (!event.wasClean && reconnectAttempts < maxReconnectAttempts && user && token) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`Scheduling reconnection attempt ${reconnectAttempts + 1}/${maxReconnectAttempts} in ${delay}ms`);

          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connectWebSocket();
          }, delay);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setIsConnected(false);
      isConnectingRef.current = false;
    }
  };

  // Set up WebSocket connection when user and token are available
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