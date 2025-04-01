import { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from './use-websocket';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

export interface Notification {
  id: number;
  user_id: number;
  message: string;
  type: string;
  read: boolean;
  created_at: string;
  data?: any;
}

export function useNotifications() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const { addMessageHandler, isConnected } = useWebSocket();
  
  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/notifications', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch notifications');
      }
      
      const data = await response.json();
      setNotifications(data);
      setUnreadCount(data.filter((n: Notification) => !n.read).length);
      setError(null);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  // Mark notification as read
  const markAsRead = useCallback(async (notificationId?: number) => {
    if (!user) return;
    
    try {
      const url = notificationId
        ? `/api/notifications/${notificationId}/read`
        : '/api/notifications/read-all';
      
      const response = await fetch(url, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mark notification as read');
      }
      
      // Update local state accordingly
      if (notificationId) {
        setNotifications(prev => 
          prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      } else {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive'
      });
    }
  }, [user, toast]);
  
  // Handle WebSocket notifications
  useEffect(() => {
    // Register handler for new notifications
    const removeHandler = addMessageHandler('NOTIFICATION', (data) => {
      console.log('New notification received:', data);
      
      // Add the new notification to state
      if (data.notification) {
        setNotifications(prev => [data.notification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        // Show toast for new notification
        toast({
          title: data.notification.type,
          description: data.notification.message,
          duration: 5000,
        });
      }
    });
    
    return () => {
      removeHandler();
    };
  }, [addMessageHandler, toast]);
  
  // Fetch notifications on mount and when WebSocket connects/reconnects
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user, fetchNotifications, isConnected]);
  
  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    markAsRead,
    refreshNotifications: fetchNotifications
  };
}