import React, { ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation } from 'wouter';

interface TransitionProviderProps {
  children: ReactNode;
  transitionEffect?: "fade" | "slide" | "scale" | "flip" | "bounce";
}

export function TransitionProvider({ 
  children, 
  transitionEffect = "fade" 
}: TransitionProviderProps) {
  const [location] = useLocation();
  
  // Define dramatic page transition
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