import { useEffect, useRef, useState } from "react";
import { useUser } from "./use-user";
import { useToast } from "./use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

interface BaseNotification {
  id: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  metadata?: string;
}

type NotificationType = 
  | 'POINTS_AWARDED'
  | 'POINTS_DEDUCTED'
  | 'ADMIN_MESSAGE'
  | 'SYSTEM_UPDATE'
  | 'QUOTE_STATUS_CHANGE'
  | 'CUSTOMER_ASSIGNED'
  | 'CUSTOMER_REMOVED'
  | 'PRODUCT_ASSIGNED'
  | 'PRODUCT_REMOVED';

interface Notification extends BaseNotification {
  type: NotificationType;
}

export function useNotifications() {
  const { user, token } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const socketRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const maxReconnectAttempts = 5;

  // Fetch notifications from API
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!user || !token) return [];

      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/json'
        }
      });

      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    enabled: !!user && !!token
  });

  const connectWebSocket = () => {
    if (!user || !token || socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('Skipping WebSocket connection:', {
        hasUser: !!user,
        hasToken: !!token,
        isConnected: socketRef.current?.readyState === WebSocket.OPEN
      });
      return;
    }

    try {
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      // Get the current host and protocol
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      console.log('WebSocket connection details:', { protocol, host });

      if (!host) {
        console.error('Invalid host');
        return;
      }

      // Clean and encode the token
      const cleanToken = token.replace('Bearer ', '');
      const wsUrl = `${protocol}//${host}/ws?token=${encodeURIComponent(cleanToken)}`;
      console.log('Connecting to WebSocket:', wsUrl);

      const socket = new WebSocket(wsUrl);
      socketRef.current = socket;

      socket.onopen = () => {
        console.log('WebSocket connection established');
        setIsConnected(true);
        setReconnectAttempts(0);
      };

      socket.onmessage = (event) => {
        try {
          const notification = JSON.parse(event.data) as Notification;
          console.log('Received notification:', notification);

          // Refresh notifications list
          queryClient.invalidateQueries({ queryKey: ['notifications'] });

          // Show toast notification
          const toastConfig = {
            title: notification.title,
            description: notification.message,
            duration: 5000
          };

          switch (notification.type) {
            case 'POINTS_AWARDED':
              toast({ ...toastConfig, variant: 'default' });
              break;
            case 'POINTS_DEDUCTED':
              toast({ ...toastConfig, variant: 'destructive' });
              break;
            case 'QUOTE_STATUS_CHANGE':
            case 'CUSTOMER_ASSIGNED':
            case 'PRODUCT_ASSIGNED':
              toast({ ...toastConfig, variant: 'default' });
              break;
            case 'CUSTOMER_REMOVED':
            case 'PRODUCT_REMOVED':
              toast({ ...toastConfig, variant: 'destructive' });
              break;
            default:
              toast(toastConfig);
          }
        } catch (error) {
          console.error('Failed to process notification:', error);
        }
      };

      socket.onclose = (event) => {
        console.log('WebSocket connection closed:', event);
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

      socket.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setIsConnected(false);
    }
  };

  const markAsRead = useMutation({
    mutationFn: async (notificationId?: string) => {
      if (!token) throw new Error('No authentication token');

      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
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
      queryClient.setQueryData(['notifications'], (oldData: Notification[] | undefined) => {
        if (!oldData) return [];
        return oldData.map(n =>
          (notificationId ? n.id === notificationId : true)
            ? { ...n, read: true }
            : n
        );
      });
    }
  });

  useEffect(() => {
    if (user?.id && token) {
      console.log('Initializing WebSocket connection');
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

  return {
    notifications,
    isConnected,
    markAsRead,
    unreadCount: notifications.filter(n => !n.read).length
  };
}