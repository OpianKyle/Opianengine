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

    function handleNetworkChange() {
      if (navigator.onLine) {
        // If coming back online, trigger a soft reload
        window.location.reload();
      }
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleNetworkChange);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleNetworkChange);
    };
  }, [toast]);

  // Add a class to the body based on connection status
  useEffect(() => {
    document.body.classList.toggle('offline', !isOnline);
  }, [isOnline]);

  return null; // This component doesn't render anything
}