import { useEffect, useRef, useState, useCallback } from "react";
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

  const connectWebSocket = useCallback(() => {
    if (!user || socketRef.current?.readyState === WebSocket.OPEN) return;

    try {
      // Get the correct WebSocket URL based on Replit's environment
      const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsHost = window.location.host || window.location.hostname;
      const wsUrl = `${wsProtocol}//${wsHost}/ws`;
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
          const notification: PointsNotification = JSON.parse(event.data);
          console.log('Received notification:', notification);

          if (notification.type === 'auth_success') {
            console.log('WebSocket authentication successful');
            return;
          }

          setNotifications(prev => [
            { ...notification, read: false, id: notification.id || Date.now().toString() },
            ...prev
          ]);

          setUnreadCount(count => count + 1);

          if (notification.type === "POINTS_ALLOCATION" && notification.points !== undefined) {
            toast({
              title: "Points Update",
              description: `${notification.points > 0 ? '+' : ''}${notification.points} points - ${notification.description}`,
              duration: 5000,
              variant: notification.points > 0 ? "default" : "destructive",
            });
          } else {
            toast({
              title: "Notification",
              description: notification.description,
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
          description: "Failed to connect to notification service. Retrying...",
          variant: "destructive",
        });
      };

      socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event);
        setIsConnected(false);

        // Only attempt to reconnect if we still have a user and no reconnection is pending
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
      });
    }
  }, [user, toast]);

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
  }, [user, connectWebSocket]);

  const markAsRead = useCallback((notificationId?: string) => {
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
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    isConnected
  };
}