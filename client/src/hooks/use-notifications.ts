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

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('WebSocket connected');
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
        } else {
          // Handle other notification types
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
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
      // Attempt to reconnect after a delay
      setTimeout(connectWebSocket, 5000);
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [user, toast]);

  useEffect(() => {
    const cleanup = connectWebSocket();
    return () => {
      cleanup?.();
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [connectWebSocket]);
}