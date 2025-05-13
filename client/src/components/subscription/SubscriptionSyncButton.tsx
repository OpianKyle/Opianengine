import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2, CheckCircle2 } from 'lucide-react';
import { post } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface SubscriptionSyncButtonProps {
  onSyncComplete?: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

export function SubscriptionSyncButton({
  onSyncComplete,
  variant = 'outline',
  size = 'default',
  className = ''
}: SubscriptionSyncButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const { toast } = useToast();
  const { refreshUser } = useAuth();

  const handleSync = async () => {
    try {
      setIsLoading(true);
      setIsComplete(false);
      
      // Call the API to sync subscription data from Paystack
      await post('/api/subscription/sync', {});
      
      // Refresh user data to get updated subscription status
      await refreshUser();
      
      setIsComplete(true);
      toast({
        title: 'Subscription Synced',
        description: 'Your subscription information has been successfully updated',
      });
      
      if (onSyncComplete) {
        onSyncComplete();
      }
      
      // Reset complete state after a delay
      setTimeout(() => {
        setIsComplete(false);
      }, 3000);
    } catch (error: any) {
      console.error('Subscription sync error:', error);
      
      toast({
        title: 'Sync Error',
        description: error.message || 'Failed to sync subscription information',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant={variant} 
      size={size}
      className={className}
      onClick={handleSync}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> 
          Syncing...
        </>
      ) : isComplete ? (
        <>
          <CheckCircle2 className="mr-2 h-4 w-4 text-green-500" /> 
          Synced
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 h-4 w-4" /> 
          Sync Subscription
        </>
      )}
    </Button>
  );
}