import { useEffect, useRef, useState } from "react";
import { useUser } from "./use-user";
import { useToast } from "./use-toast";

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
  const [notifications, setNotifications] = useState<PointsNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const connectWebSocket = () => {
    if (!user || socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('Skipping WebSocket connection - no user or already connected');
      return;
    }

    try {
      // Construct WebSocket URL with specific path to avoid Vite HMR conflicts
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/notifications-ws`;
      console.log('Attempting WebSocket connection to:', wsUrl);

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connected, sending auth data');
        setIsConnected(true);
        socket.send(JSON.stringify({
          type: 'auth',
          userId: user.id,
          isAdmin: user.isAdmin
        }));
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

          // Create notification object
          const notification: PointsNotification = {
            ...data,
            read: false,
            id: data.id || Date.now().toString()
          };

          // Update notifications state, preventing duplicates
          setNotifications(prev => {
            if (prev.some(n => n.id === notification.id)) {
              return prev;
            }
            return [notification, ...prev];
          });

          setUnreadCount(count => count + 1);

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
              description: data.description,
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

        // Attempt to reconnect if we have a user and no pending reconnection
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
    if (notificationId) {
      setNotifications(prev => 
        prev.map(notif => 
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount(count => Math.max(0, count - 1));
    } else {
      // Mark all as read
      setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
      setUnreadCount(0);
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    isConnected
  };
}