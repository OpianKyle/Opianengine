import { useEffect, useRef, useCallback } from "react";
import { useUser } from "./use-user";
import { useToast } from "./use-toast";

interface PointsNotification {
  type: string;
  points?: number;
  description: string;
  timestamp: string;
}

export function useNotifications() {
  const { user } = useUser();
  const { toast } = useToast();
  const socketRef = useRef<WebSocket>();

  const connectWebSocket = useCallback(() => {
    if (!user) return;

    try {
      // Get the base URL from the current window location
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      console.log('Attempting to connect to WebSocket:', wsUrl);

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connection established');
        // Send authentication message
        socket.send(JSON.stringify({
          type: 'auth',
          userId: user.id,
          isAdmin: user.isAdmin
        }));
      };

      socket.onmessage = (event) => {
        try {
          const notification: PointsNotification = JSON.parse(event.data);

          if (notification.type === "POINTS_ALLOCATION" && notification.points !== undefined) {
            toast({
              title: "Points Update",
              description: `${notification.points > 0 ? '+' : ''}${notification.points} points - ${notification.description}`,
              duration: 5000,
              variant: notification.points > 0 ? "default" : "destructive",
            });
          } else if (notification.type === "ADMIN_NOTIFICATION") {
            toast({
              title: "Admin Notification",
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
        // Schedule a reconnection attempt
        setTimeout(connectWebSocket, 5000);
      };

      socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event.code, event.reason);
        // Only attempt to reconnect if the closure wasn't intentional
        if (event.code !== 1000) {
          setTimeout(connectWebSocket, 5000);
        }
      };

      return () => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.close(1000, 'Intentional closure');
        }
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
      return undefined;
    }
  }, [user, toast]);

  useEffect(() => {
    const cleanup = connectWebSocket();
    return () => {
      cleanup?.();
      if (socketRef.current) {
        socketRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [connectWebSocket]);
}