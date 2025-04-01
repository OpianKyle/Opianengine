import { useEffect, useRef, useCallback } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useAuth } from '@/hooks/use-auth';

interface SessionTimeoutOptions {
  timeoutMinutes?: number;
  warningBeforeMinutes?: number;
  onWarning?: () => void;
  ignoredPaths?: string[];
}

/**
 * Hook to handle session timeout
 * Logs user out after specified period of inactivity
 */
export function useSessionTimeout({
  timeoutMinutes = 30,
  warningBeforeMinutes = 5,
  onWarning,
  ignoredPaths = ['/auth', '/register']
}: SessionTimeoutOptions = {}) {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const timeoutRef = useRef<number | null>(null);
  const warningTimeoutRef = useRef<number | null>(null);
  
  // Convert minutes to milliseconds
  const timeoutMs = timeoutMinutes * 60 * 1000;
  const warningMs = (timeoutMinutes - warningBeforeMinutes) * 60 * 1000;
  
  // Check if current path should ignore session timeout
  const shouldIgnoreTimeout = ignoredPaths.some(path => location.startsWith(path));

  // Function to reset timers
  const resetTimer = useCallback(() => {
    if (shouldIgnoreTimeout || !user) return;
    
    // Clear any existing timeouts
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    
    if (warningTimeoutRef.current) {
      window.clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    
    // Set warning timer
    warningTimeoutRef.current = window.setTimeout(() => {
      if (onWarning) onWarning();
    }, warningMs);
    
    // Set logout timer
    timeoutRef.current = window.setTimeout(() => {
      console.log('Session timed out after inactivity');
      logoutMutation.mutate();
    }, timeoutMs);
  }, [timeoutMs, warningMs, onWarning, user, logoutMutation, shouldIgnoreTimeout]);
  
  // Setup event listeners for user activity
  useEffect(() => {
    if (shouldIgnoreTimeout || !user) return;
    
    const activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart'];
    
    // Reset timer on user activity
    const handleActivity = () => {
      resetTimer();
    };
    
    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleActivity);
    });
    
    // Initial timer setup
    resetTimer();
    
    // Cleanup
    return () => {
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      
      if (timeoutRef.current) {
        window.clearTimeout(timeoutRef.current);
      }
      
      if (warningTimeoutRef.current) {
        window.clearTimeout(warningTimeoutRef.current);
      }
    };
  }, [resetTimer, user, shouldIgnoreTimeout]);
  
  // Reset timer when user or location changes
  useEffect(() => {
    resetTimer();
  }, [user, location, resetTimer]);
  
  return {
    resetTimer,
  };
}