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
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;

  // Fetch notifications from API
  const { data: notifications = [] } = useQuery<PointsNotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!user) return [];
      const response = await fetch('/api/notifications', {
        credentials: 'include',
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` })
        }
      });
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    enabled: !!user
  });

  // WebSocket connection setup
  useEffect(() => {
    if (!user || !token) {
      console.log('WebSocket connection skipped:', {
        hasUser: !!user,
        hasToken: !!token,
        userId: user?.id
      });
      return;
    }

    const connectWebSocket = () => {
      try {
        // Close any existing connection
        if (socketRef.current) {
          console.log('Closing existing WebSocket connection');
          socketRef.current.close();
          socketRef.current = null;
        }

        // Get the complete URL information
        const currentUrl = new URL(window.location.href);
        console.log('WebSocket URL setup:', {
          href: currentUrl.href,
          host: currentUrl.host,
          protocol: currentUrl.protocol,
          tokenPresent: !!token
        });

        // Construct WebSocket URL
        const wsProtocol = currentUrl.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = new URL(`${wsProtocol}//${currentUrl.host}/ws`);
        wsUrl.searchParams.append('token', token);

        console.log('Attempting WebSocket connection:', wsUrl.toString());

        const socket = new WebSocket(wsUrl.toString());
        socketRef.current = socket;

        socket.onopen = () => {
          console.log('WebSocket connection established');
          setIsConnected(true);
          setReconnectAttempts(0);
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
              return;
            }

            // Refresh notifications list
            queryClient.invalidateQueries({ queryKey: ['notifications'] });

            // Show toast notification for points
            if (data.type === 'POINTS_AWARDED' || data.type === 'POINTS_DEDUCTED') {
              const points = data.points || 0;
              const sign = data.type === 'POINTS_AWARDED' ? '+' : '-';
              toast({
                title: `${sign}${Math.abs(points)} Points`,
                description: data.description,
                duration: 5000,
                variant: data.type === 'POINTS_AWARDED' ? 'default' : 'destructive'
              });
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
          }
        };

        socket.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
        };

        socket.onclose = (event) => {
          console.log('WebSocket connection closed:', {
            code: event.code,
            reason: event.reason,
            wasClean: event.wasClean
          });
          setIsConnected(false);
          socketRef.current = null;

          // Attempt reconnection if not max attempts
          if (reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000);
            console.log(`Attempting reconnection in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
            setTimeout(() => {
              setReconnectAttempts(prev => prev + 1);
              connectWebSocket();
            }, delay);
          } else {
            console.log('Max reconnection attempts reached');
            toast({
              title: "Connection Lost",
              description: "Unable to reconnect to notification service. Please refresh the page.",
              variant: "destructive",
              duration: 0,
            });
          }
        };
      } catch (error) {
        console.error('Error setting up WebSocket:', error);
        setIsConnected(false);
      }
    };

    connectWebSocket();

    return () => {
      if (socketRef.current) {
        console.log('Cleaning up WebSocket connection');
        socketRef.current.close();
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [user, token, reconnectAttempts, queryClient, toast]);

  // Mark notifications as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId?: string) => {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
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
    markAsRead
  };
}