import { useEffect, useState } from 'react';
import { useToast } from "@/hooks/use-toast";

export function NetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const { toast } = useToast();

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      toast({
        title: "Back online",
        description: "Your connection has been restored",
        variant: "default",
      });
    }

    function handleOffline() {
      setIsOnline(false);
      toast({
        title: "Connection lost",
        description: "Please check your internet connection",
        variant: "destructive",
      });
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  return null; // This component doesn't render anything
}
