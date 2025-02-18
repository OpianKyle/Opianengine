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
  const { user, token } = useUser();
  const { toast } = useToast();
  const socketRef = useRef<WebSocket | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const queryClient = useQueryClient();
  const maxReconnectAttempts = 5;
  const [reconnectAttempts, setReconnectAttempts] = useState(0);

  // Fetch notifications from API
  const { data: notifications = [] } = useQuery<PointsNotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!user) return [];
      const response = await fetch('/api/notifications', {
        credentials: 'include'
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      const data = await response.json();
      return data.map((notification: any) => ({
        id: notification.id.toString(),
        type: notification.type,
        points: notification.type === 'POINTS_AWARDED' ? 
          parseInt(notification.title.match(/-?\d+/)?.[0] || '0') : undefined,
        description: notification.message,
        timestamp: notification.createdAt,
        read: notification.isRead
      }));
    },
    enabled: !!user,
    staleTime: 0,
    retry: 3
  });

  useEffect(() => {
    if (notifications) {
      setUnreadCount(notifications.filter(n => !n.read).length);
    }
  }, [notifications]);

  const connectWebSocket = () => {
    if (!user || !token || socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('Skipping WebSocket connection - no user/token or already connected', {
        hasUser: !!user,
        hasToken: !!token,
        socketState: socketRef.current?.readyState
      });
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/notifications-ws?token=${encodeURIComponent(token)}`;
      console.log('Attempting WebSocket connection to:', wsUrl);

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        setReconnectAttempts(0);  // Reset reconnection attempts on successful connection
        toast({
          title: "Connected",
          description: "Successfully connected to notification service",
          duration: 3000,
        });
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);

          if (data.type === 'auth_success') {
            console.log('WebSocket authentication successful');
            return;
          }

          // Refresh notifications after receiving a new one
          queryClient.invalidateQueries({ queryKey: ['notifications'] });

          // Show toast for different notification types
          if (data.type === "POINTS_ALLOCATION") {
            const points = data.points ?? 0;
            const sign = points >= 0 ? '+' : '';
            toast({
              title: `${sign}${points} Points Allocated`,
              description: data.description,
              duration: 0, // Keep until user dismisses
              variant: points >= 0 ? "default" : "destructive",
            });
          } else if (data.type === "POINTS_AWARDED") {
            const points = data.points ?? 0;
            const sign = points >= 0 ? '+' : '';
            toast({
              title: `${sign}${points} Points Awarded`,
              description: data.description,
              duration: 0, // Keep until user dismisses
              variant: points >= 0 ? "default" : "destructive",
            });
          } else {
            toast({
              title: "Notification",
              description: data.message || data.description,
              duration: 0, // Keep until user dismisses
            });
          }
        } catch (error) {
          console.error('Error processing notification:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };

      socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event);
        setIsConnected(false);
        socketRef.current = null;

        // Only attempt to reconnect if we have a user and haven't exceeded max attempts
        if (user && !reconnectTimeoutRef.current && reconnectAttempts < maxReconnectAttempts) {
          console.log(`Scheduling reconnection attempt ${reconnectAttempts + 1}/${maxReconnectAttempts}...`);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            reconnectTimeoutRef.current = null;
            connectWebSocket();
          }, Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)); // Exponential backoff with 30s max
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          toast({
            title: "Connection Error",
            description: "Unable to establish connection to notification service. Please refresh the page.",
            variant: "destructive",
            duration: 0, // Keep toast until user dismisses
          });
        }
      };
    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setIsConnected(false);
    }
  };

  useEffect(() => {
    if (user && token) {
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
  }, [user, token]);

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

  const markAsRead = (notificationId?: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  return {
    notifications: notifications?.map(notification => ({
      ...notification,
      formattedPoints: notification.points !== undefined ? 
        `${notification.points > 0 ? '+' : ''}${notification.points}` : undefined
    })) || [],
    unreadCount,
    markAsRead,
    isConnected
  };
}