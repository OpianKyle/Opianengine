import React, { ReactNode, useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
  
  // Define a more dramatic page transition
  const pageVariants = {
    initial: {
      opacity: 0,
      y: 20,
      scale: 0.98
    },
    animate: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: {
        duration: 0.5,
        ease: [0.19, 1.0, 0.22, 1.0]
      }
    },
    exit: {
      opacity: 0,
      y: -20,
      scale: 0.98,
      transition: {
        duration: 0.4
      }
    }
  };
  
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div 
        key={location} 
        className="w-full min-h-screen"
        initial="initial"
        animate="animate"
        exit="exit"
        variants={pageVariants}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}