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
    if (!user || !token || socketRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      // Clean up existing connection
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      // Get the current host and protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;

      // Remove Bearer prefix if present
      const cleanToken = token.replace('Bearer ', '');

      // Create WebSocket URL with token
      const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(cleanToken)}`;

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        setIsConnected(true);
        setReconnectAttempts(0);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          queryClient.invalidateQueries({ queryKey: ['notifications'] });

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
          console.error('Failed to process notification:', error);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        socketRef.current = null;

        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }

        if (reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connectWebSocket();
          }, delay);
        }
      };

      socket.onerror = () => {
        socket.close();
      };

    } catch (error) {
      console.error('WebSocket connection error:', error);
      setIsConnected(false);
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