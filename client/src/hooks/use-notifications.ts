import { useEffect, useRef, useState } from "react";
import { useUser } from "./use-user";
import { useToast } from "./use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface BaseNotification {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  read: boolean;
}

interface PointsNotification extends BaseNotification {
  type: 'POINTS_AWARDED';
}

interface SystemNotification extends BaseNotification {
  type: 'QUOTE_STATUS_CHANGE' | 'ADMIN_MESSAGE' | 'SYSTEM_UPDATE';
}

type Notification = PointsNotification | SystemNotification;

export function useNotifications() {
  const { user, token } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;

  // Fetch notifications from API
  const { data: notifications = [] } = useQuery<Notification[]>({
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
    if (!user || !token || socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('WebSocket connection skipped:', {
        hasUser: !!user,
        hasToken: !!token,
        hasActiveConnection: socketRef.current?.readyState === WebSocket.OPEN
      });
      return;
    }

    try {
      console.log('Initializing WebSocket connection');

      // Clean up existing connection
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      // Create WebSocket URL with authentication token
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const cleanToken = token.replace('Bearer ', '');
      const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(cleanToken)}`;

      console.log('Connecting to WebSocket:', { wsUrl });
      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connection established');
        setIsConnected(true);
        setReconnectAttempts(0);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data) as Notification;
          console.log('Received WebSocket message:', data);

          // Refresh notifications list
          queryClient.invalidateQueries({ queryKey: ['notifications'] });

          // Show toast for points notifications
          if (data.type === 'POINTS_AWARDED') {
            toast({
              title: data.title,
              description: data.description,
              duration: 5000,
              variant: data.title.toLowerCase().includes('deducted') ? 'destructive' : 'default'
            });
          }
        } catch (error) {
          console.error('Failed to process WebSocket message:', error);
        }
      };

      socket.onclose = (event) => {
        console.log('WebSocket connection closed:', {
          code: event.code,
          reason: event.reason
        });

        setIsConnected(false);
        socketRef.current = null;

        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        // Attempt reconnection if not at max attempts
        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`Scheduling reconnection attempt ${reconnectAttempts + 1}/${maxReconnectAttempts} in ${delay}ms`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connectWebSocket();
          }, delay);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        socket.close();
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    if (user?.id && token) {
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
      queryClient.setQueryData(['notifications'], (oldData: Notification[] | undefined) => {
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
