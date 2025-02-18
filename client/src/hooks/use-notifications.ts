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

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected');
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
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
      setIsConnected(false);

      // Only attempt to reconnect if we still have a user and the component is mounted
      if (user && !reconnectTimeoutRef.current) {
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectTimeoutRef.current = null;
          connectWebSocket();
        }, 5000);
      }
    };
  }, [user, toast]);

  // Connect when component mounts or user changes
  useEffect(() => {
    if (user) {
      connectWebSocket();
    }

    // Cleanup function
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }

      if (socketRef.current) {
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