import { useEffect, useRef, useState } from "react";
import { useUser } from "./use-user";
import { useToast } from "./use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface PointsNotification {
  type: string;
  points?: number;
  description: string;
  timestamp: string;
  read?: boolean;
  id: string;
}

export function useNotifications() {
  const { user } = useUser();
  const { toast } = useToast();
  const socketRef = useRef<WebSocket | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();

  // Fetch notifications from API
  const { data: notifications = [] } = useQuery<PointsNotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!user) return [];
      const response = await fetch('/api/notifications', {
        credentials: 'include' // Important: include credentials for session cookie
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      return data.map((notification: any) => ({
        id: notification.id.toString(),
        type: notification.type,
        points: notification.type === 'POINTS_AWARDED' ? 
          parseInt(notification.title.replace(/[^-\d]/g, '')) : undefined,
        description: notification.message,
        timestamp: notification.createdAt,
        read: notification.isRead
      }));
    },
    enabled: !!user,
    staleTime: 0, // Always fetch fresh data
    retry: 3
  });

  // Update unread count whenever notifications change
  useEffect(() => {
    if (notifications) {
      setUnreadCount(notifications.filter(n => !n.read).length);
    }
  }, [notifications]);

  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId?: string) => {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId })
      });
      if (!response.ok) throw new Error('Failed to mark notifications as read');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    }
  });

  const connectWebSocket = () => {
    if (!user || socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('Skipping WebSocket connection - no user or already connected');
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/notifications-ws`;
      console.log('Attempting WebSocket connection to:', wsUrl);

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connected, sending auth data');
        setIsConnected(true);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);

          if (data.type === 'auth_success') {
            console.log('WebSocket authentication successful');
            toast({
              title: "Connected",
              description: "Successfully connected to notification service",
              duration: 3000,
            });
            return;
          }

          if (data.type === 'error') {
            console.error('WebSocket error message:', data.message);
            toast({
              title: "Error",
              description: data.message,
              variant: "destructive",
              duration: 5000,
            });
            return;
          }

          // Refresh notifications after receiving a new one
          queryClient.invalidateQueries({ queryKey: ['notifications'] });

          // Show toast for different notification types
          if (data.type === "POINTS_ALLOCATION" && data.points !== undefined) {
            toast({
              title: "Points Update",
              description: `${data.points > 0 ? '+' : ''}${data.points} points - ${data.description}`,
              duration: 5000,
              variant: data.points > 0 ? "default" : "destructive",
            });
          } else {
            toast({
              title: "Notification",
              description: data.message || data.description,
              duration: 5000,
            });
          }
        } catch (error) {
          console.error('Error processing notification:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
        toast({
          title: "Connection Error",
          description: "Failed to connect to notification service",
          variant: "destructive",
          duration: 5000,
        });
      };

      socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event);
        setIsConnected(false);
        socketRef.current = null;

        if (user && !reconnectTimeoutRef.current) {
          console.log('Scheduling reconnection attempt...');
          reconnectTimeoutRef.current = setTimeout(() => {
            console.log('Attempting to reconnect...');
            reconnectTimeoutRef.current = null;
            connectWebSocket();
          }, 5000);
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setIsConnected(false);
      toast({
        title: "Connection Error",
        description: "Failed to establish connection to notification service",
        variant: "destructive",
        duration: 5000,
      });
    }
  };

  useEffect(() => {
    if (user) {
      console.log('User authenticated, initiating WebSocket connection');
      connectWebSocket();
    }

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (socketRef.current) {
        console.log('Cleaning up WebSocket connection');
        const socket = socketRef.current;
        socketRef.current = null;
        socket.close();
      }

      setIsConnected(false);
    };
  }, [user]);

  const markAsRead = (notificationId?: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  return {
    notifications: notifications || [],
    unreadCount,
    markAsRead,
    isConnected
  };
}