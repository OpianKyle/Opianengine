import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { useUser } from './use-user';

const TIMEOUT_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export function useSessionTimeout() {
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [, navigate] = useLocation();
  const { user, logout } = useUser();

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (user) {
      timeoutRef.current = setTimeout(() => {
        logout();
        navigate('/');
      }, TIMEOUT_DURATION);
    }
  };

  useEffect(() => {
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];

    const handleActivity = () => {
      resetTimeout();
    };

    // Set up event listeners
    events.forEach(event => {
      document.addEventListener(event, handleActivity);
    });

    // Initialize timeout
    resetTimeout();

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [user]);
}
