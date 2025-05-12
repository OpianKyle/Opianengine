import React, { ReactNode, useState, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'wouter';

interface TransitionProviderProps {
  children: ReactNode;
  transitionEffect?: "fade" | "slide" | "scale" | "flip" | "bounce";
}

// Tracks the current route for analytics and transitions
export function useRouteTransition() {
  const [location] = useLocation();
  const [previousLocation, setPreviousLocation] = useState<string | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  
  useEffect(() => {
    // When location changes, mark as transitioning
    setIsTransitioning(true);
    
    // Short timeout to match animation duration
    const timer = setTimeout(() => {
      setPreviousLocation(location);
      setIsTransitioning(false);
    }, 500); // Should match the longest exit animation duration
    
    return () => clearTimeout(timer);
  }, [location]);
  
  return {
    location,
    previousLocation,
    isTransitioning
  };
}

export function TransitionProvider({ 
  children, 
  transitionEffect = "fade" 
}: TransitionProviderProps) {
  const [location] = useLocation();
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <div key={location} className="w-full min-h-screen">
        {children}
      </div>
    </AnimatePresence>
  );
}