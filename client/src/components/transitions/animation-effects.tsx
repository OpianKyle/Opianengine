import React, { ReactNode } from "react";
import { motion } from "framer-motion";

// Bounce animation when hovering
interface BounceProps {
  children: ReactNode;
  className?: string;
  scale?: number;
}

export function Bounce({ children, className = "", scale = 1.05 }: BounceProps) {
  return (
    <motion.div
      className={className}
      whileHover={{ scale, transition: { type: "spring", stiffness: 400 } }}
    >
      {children}
    </motion.div>
  );
}

// Pulse animation for attention-grabbing elements
interface PulseProps {
  children: ReactNode;
  className?: string;
  duration?: number;
}

export function Pulse({ children, className = "", duration = 2 }: PulseProps) {
  return (
    <motion.div
      className={className}
      animate={{ 
        scale: [1, 1.03, 1],
        opacity: [0.9, 1, 0.9],
      }}
      transition={{
        duration,
        ease: "easeInOut",
        repeat: Infinity,
      }}
    >
      {children}
    </motion.div>
  );
}

// Floating animation for subtle movement
interface FloatProps {
  children: ReactNode;
  className?: string;
  distance?: number;
  duration?: number;
}

export function Float({ 
  children, 
  className = "", 
  distance = 10, 
  duration = 3 
}: FloatProps) {
  return (
    <motion.div
      className={className}
      animate={{ 
        y: [`-${distance}px`, `${distance}px`, `-${distance}px`],
      }}
      transition={{
        duration,
        ease: "easeInOut",
        repeat: Infinity,
      }}
    >
      {children}
    </motion.div>
  );
}

// Staggered children animation
interface StaggerProps {
  children: ReactNode[];
  className?: string;
  delay?: number;
  staggerDelay?: number;
  direction?: "up" | "down" | "left" | "right";
}

export function StaggerChildren({ 
  children, 
  className = "", 
  delay = 0,
  staggerDelay = 0.1,
  direction = "up"
}: StaggerProps) {
  
  const getInitialPosition = () => {
    switch (direction) {
      case "up": return { y: 20, x: 0 };
      case "down": return { y: -20, x: 0 };
      case "left": return { x: 20, y: 0 };
      case "right": return { x: -20, y: 0 };
      default: return { y: 20, x: 0 };
    }
  };
  
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: delay,
      },
    },
  };
  
  const itemVariants = {
    hidden: { 
      opacity: 0,
      ...getInitialPosition(),
    },
    show: { 
      opacity: 1, 
      x: 0,
      y: 0,
      transition: {
        duration: 0.5,
      },
    },
  };
  
  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-50px" }}
    >
      {React.Children.map(children, (child, index) => (
        <motion.div key={index} variants={itemVariants}>
          {child}
        </motion.div>
      ))}
    </motion.div>
  );
}