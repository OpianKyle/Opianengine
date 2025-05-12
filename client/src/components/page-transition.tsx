import { motion } from "framer-motion";
import { ReactNode } from "react";

// Page transition variants
const pageVariants = {
  initial: {
    opacity: 0,
    y: 20,
  },
  in: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: [0.43, 0.13, 0.23, 0.96], // Custom easing for more playful feel
    },
  },
  out: {
    opacity: 0,
    y: -20,
    transition: {
      duration: 0.3,
      ease: [0.43, 0.13, 0.23, 0.96],
    },
  },
};

// Staggered children variants for sections within pages
export const sectionVariants = {
  initial: { 
    opacity: 0, 
    y: 30
  },
  animate: (i: number) => ({ 
    opacity: 1, 
    y: 0,
    transition: { 
      duration: 0.5, 
      ease: "easeOut",
      delay: i * 0.1, // Stagger based on index
    }
  }),
};

// Scale and fade variants for interactive elements
export const scaleUpVariants = {
  initial: { 
    scale: 0.95, 
    opacity: 0 
  },
  animate: { 
    scale: 1, 
    opacity: 1,
    transition: { 
      type: "spring", 
      stiffness: 350, 
      damping: 25 
    }
  },
  hover: { 
    scale: 1.05,
    transition: { 
      duration: 0.2 
    }
  },
  tap: { 
    scale: 0.98 
  },
};

// Slide in from direction variants
export const slideInVariants = (direction: "left" | "right" | "up" | "down" = "up") => {
  const directionOffset = () => {
    switch(direction) {
      case "left": return { x: -50, y: 0 };
      case "right": return { x: 50, y: 0 };
      case "up": return { x: 0, y: -50 };
      case "down": return { x: 0, y: 50 };
      default: return { x: 0, y: 50 };
    }
  };
  
  return {
    initial: { 
      opacity: 0, 
      ...directionOffset() 
    },
    animate: { 
      opacity: 1, 
      x: 0, 
      y: 0,
      transition: { 
        duration: 0.5, 
        ease: "easeOut" 
      }
    },
  };
};

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

export default function PageTransition({ children, className = "" }: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="in"
      exit="out"
      variants={pageVariants}
    >
      {children}
    </motion.div>
  );
}