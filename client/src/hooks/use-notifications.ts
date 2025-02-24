import { useEffect, useRef, useState } from "react";
import { useUser } from "./use-user";
import { useToast } from "./use-toast";
import { useQuery } from "@tanstack/react-query";

interface PointsNotification {
  id: string;
  type: string;
  points?: number;
  description: string;
  timestamp: string;
  read?: boolean;
}

export function useNotifications() {
  const { user } = useUser();
  const { toast } = useToast();
  const socketRef = useRef<WebSocket | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);
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
    if (!user || socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('Skipping WebSocket connection - no user or already connected', {
        hasUser: !!user,
        socketState: socketRef.current?.readyState
      });
      return;
    }

    try {
      // Close existing connection if any
      if (socketRef.current) {
        socketRef.current.close();
      }

      // Get the current hostname from the browser
      const currentHost = window.location.host;
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';

      // Construct WebSocket URL with explicit path
      const wsUrl = `${wsProtocol}//${currentHost}/notifications-ws`;
      console.log('Attempting WebSocket connection to:', wsUrl);

      const socket = new WebSocket(wsUrl);

      socket.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsConnected(true);
        setReconnectAttempts(0);
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('Received WebSocket message:', data);

          if (data.type === 'CONNECTION_SUCCESS') {
            console.log('WebSocket authentication successful');
            return;
          }

          if (data.type === "POINTS_ALLOCATION" || data.type === "POINTS_AWARDED") {
            const points = data.points ?? 0;
            const sign = points >= 0 ? '+' : '';
            toast({
              title: `${sign}${points} Points ${data.type === "POINTS_ALLOCATION" ? "Allocated" : "Awarded"}`,
              description: data.description,
              duration: 5000,
              variant: points >= 0 ? "default" : "destructive",
            });
          } else {
            toast({
              title: "Notification",
              description: data.description || data.message,
              duration: 5000,
            });
          }
        } catch (error) {
          console.error('Error processing notification:', error);
        }
      };

      socket.onerror = (error) => {
        console.error('WebSocket connection error:', error);
        setIsConnected(false);
      };

      socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event);
        setIsConnected(false);

        // Clear existing timeout if any
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        if (user && reconnectAttempts < maxReconnectAttempts) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
          console.log(`Scheduling reconnection attempt ${reconnectAttempts + 1}/${maxReconnectAttempts} in ${delay}ms`);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connectWebSocket();
          }, delay);
        } else if (reconnectAttempts >= maxReconnectAttempts) {
          toast({
            title: "Connection Error",
            description: "Unable to establish connection to notification service. Please refresh the page.",
            variant: "destructive",
            duration: 0,
          });
        }
      };

      socketRef.current = socket;

    } catch (error) {
      console.error('Error creating WebSocket connection:', error);
      setIsConnected(false);
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
        socketRef.current.close();
        socketRef.current = null;
      }

      setIsConnected(false);
    };
  }, [user]);

  return {
    notifications: notifications?.map(notification => ({
      ...notification,
      formattedPoints: notification.points !== undefined ? 
        `${notification.points > 0 ? '+' : ''}${notification.points}` : undefined
    })) || [],
    unreadCount,
    isConnected
  };
}