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
  | 'PRODUCT_REMOVED'
  | 'PRODUCT_ACTIVITY'
  | 'REWARD_REDEMPTION'
  | 'REFERRAL_COMMISSION';

interface Notification extends BaseNotification {
  type: NotificationType;
}

export function useNotifications() {
  const { user } = useUser();
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
      if (!user) return [];

      const response = await fetch('/api/notifications', {
        credentials: 'include' // Important: include credentials
      });

      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    enabled: !!user
  });

  const connectWebSocket = () => {
    if (!user || socketRef.current?.readyState === WebSocket.OPEN) {
      console.log('Skipping WebSocket connection:', {
        hasUser: !!user,
        isConnected: socketRef.current?.readyState === WebSocket.OPEN
      });
      return;
    }

    try {
      // Close existing connection if any
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }

      // Construct WebSocket URL using current window location
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/ws`;

      console.log('Connecting to WebSocket:', {
        protocol,
        host,
        wsUrl,
        userId: user.id
      });

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

          // Update notifications cache
          queryClient.setQueryData(['notifications'], (old: Notification[] = []) => {
            return [notification, ...old];
          });

          // Show toast notification
          const toastConfig = {
            title: notification.title,
            description: notification.message,
            duration: 5000
          };

          switch (notification.type) {
            case 'POINTS_AWARDED':
            case 'PRODUCT_ACTIVITY':
            case 'REWARD_REDEMPTION':
            case 'REFERRAL_COMMISSION':
              toast({ ...toastConfig, variant: 'default' });
              break;
            case 'POINTS_DEDUCTED':
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
          console.log(`Attempting reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
          reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connectWebSocket();
          }, delay);
        } else {
          console.log('Max reconnection attempts reached');
          toast({
            title: 'Connection Lost',
            description: 'Unable to receive real-time notifications. Please refresh the page.',
            variant: 'destructive'
          });
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

  // Mutation for marking notifications as read
  const markAsRead = useMutation({
    mutationFn: async (notificationId?: string) => {
      const response = await fetch('/api/notifications/mark-read', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
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
    if (user?.id) {
      console.log('Initializing WebSocket connection:', {
        userId: user.id
      });
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
  }, [user?.id]);

  return {
    notifications,
    isConnected,
    markAsRead,
    unreadCount: notifications.filter(n => !n.read).length
  };
}