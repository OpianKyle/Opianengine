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
  const eventSourceRef = useRef<EventSource | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Fetch notifications from API
  const { data: notifications = [] } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      if (!user) return [];

      const response = await fetch('/api/notifications', {
        credentials: 'include'
      });

      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    enabled: !!user
  });

  // Setup SSE connection
  useEffect(() => {
    if (!user?.id || eventSourceRef.current) return;

    const eventSource = new EventSource('/api/notifications/stream');
    eventSourceRef.current = eventSource;

    eventSource.onopen = () => {
      console.log('SSE connection established');
      setIsConnected(true);
    };

    eventSource.addEventListener('connected', (event) => {
      const data = JSON.parse(event.data);
      console.log('SSE connected:', data);
    });

    eventSource.addEventListener('notification', (event) => {
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
    });

    eventSource.onerror = (error) => {
      console.error('SSE error:', error);
      setIsConnected(false);
      eventSource.close();
      eventSourceRef.current = null;
    };

    return () => {
      eventSource.close();
      eventSourceRef.current = null;
      setIsConnected(false);
    };
  }, [user?.id, queryClient, toast]);

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

  return {
    notifications,
    isConnected,
    markAsRead,
    unreadCount: notifications.filter(n => !n.read).length
  };
}