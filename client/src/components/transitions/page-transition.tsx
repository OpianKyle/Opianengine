import React, { ReactNode } from "react";
import { motion } from "framer-motion";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  effect?: "fade" | "slide" | "scale" | "flip" | "bounce";
}

// Fade & Slide effect
const fadeSlideVariants = {
  initial: {
    opacity: 0,
    y: 100, // More extreme starting position
    scale: 0.95, // Add scaling for more dramatic effect
  },
  in: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 1.2, // Longer duration to make it more noticeable
      ease: [0.43, 0.13, 0.23, 0.96], // Custom easing for more playful feel
    },
  },
  out: {
    opacity: 0,
    y: -80, // More extreme exit
    scale: 0.9,
    transition: {
      duration: 0.8, // Longer exit too
      ease: [0.43, 0.13, 0.23, 0.96],
    },
  },
};

// Scale effect with extreme rotation and scaling
const scaleVariants = {
  initial: {
    opacity: 0,
    scale: 0.5, // Much smaller initial scale
    rotate: -10, // More extreme rotation
    x: -30,    // Add some horizontal movement too
  },
  in: {
    opacity: 1,
    scale: 1,
    rotate: 0,
    x: 0,
    transition: {
      duration: 1.5, // Much longer animation
      ease: [0.175, 0.885, 0.32, 1.275], // Custom easing (back)
    },
  },
  out: {
    opacity: 0,
    scale: 0.8,
    rotate: 5, // More extreme exit rotation
    x: 30,    // Exit to the other side
    transition: {
      duration: 0.8,
      ease: [0.6, -0.05, 0.01, 0.99],
    },
  },
};

// 3D flip effect with much more dramatic rotation
const flipVariants = {
  initial: {
    opacity: 0,
    rotateX: 90, // Full 90 degree flip
    rotateY: 45, // Add Y rotation for more 3D effect
    perspective: 1000,
    y: 80, // Coming from much further down
    scale: 0.7, // Also add scaling
  },
  in: {
    opacity: 1,
    rotateX: 0,
    rotateY: 0,
    y: 0,
    scale: 1,
    transition: {
      duration: 1.6, // Much longer for dramatic effect
      ease: [0.19, 1.0, 0.22, 1.0], // Custom easing
    },
  },
  out: {
    opacity: 0,
    rotateX: -45, // More extreme exit
    rotateY: -20, 
    y: -60,
    scale: 0.8,
    transition: {
      duration: 0.8,
      ease: [0.19, 1.0, 0.22, 1.0],
    },
  },
};

// Bounce effect
const bounceVariants = {
  initial: {
    opacity: 0,
    y: 50,
  },
  in: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 15,
      mass: 1.2,
    },
  },
  out: {
    opacity: 0,
    y: -50,
    transition: {
      duration: 0.4,
      ease: [0.43, 0.13, 0.23, 0.96],
    },
  },
};

export function PageTransition({ children, className = "", effect = "fade" }: PageTransitionProps) {
  // Select animation variants based on effect prop
  const getVariants = () => {
    switch (effect) {
      case "scale": return scaleVariants;
      case "flip": return flipVariants;
      case "bounce": return bounceVariants;
      case "slide":
      case "fade":
      default: return fadeSlideVariants;
    }
  };
  
  return (
    <motion.div
      className={className}
      initial="initial"
      animate="in"
      exit="out"
      variants={getVariants()}
    >
      {children}
    </motion.div>
  );
}

// Section transition for individual sections within a page
interface SectionTransitionProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  direction?: "up" | "down" | "left" | "right";
  effect?: "fade" | "slide" | "scale" | "flip" | "bounce" | "reveal";
  staggerChildren?: boolean;
}

export function SectionTransition({ 
  children, 
  className = "", 
  delay = 0, 
  direction = "up",
  effect = "slide",
  staggerChildren = false
}: SectionTransitionProps) {
  
  const getInitialPosition = () => {
    const distance = 50; // Increased for more dramatic effect
    switch (direction) {
      case "up": return { y: distance, x: 0 };
      case "down": return { y: -distance, x: 0 };
      case "left": return { x: distance, y: 0 };
      case "right": return { x: -distance, y: 0 };
      default: return { y: distance, x: 0 };
    }
  };
  
  // Scale effect with slight rotation
  const scaleEffect = {
    initial: {
      opacity: 0,
      scale: 0.85,
      rotate: -2,
    },
    animate: {
      opacity: 1,
      scale: 1,
      rotate: 0,
      transition: {
        duration: 0.6,
        ease: [0.175, 0.885, 0.32, 1.275], // Custom easing (back)
        delay: delay,
      },
    },
  };
  
  // Bounce effect
  const bounceEffect = {
    initial: {
      opacity: 0,
      y: 60,
    },
    animate: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring",
        stiffness: 300,
        damping: 15,
        mass: 1.2,
        delay: delay,
      },
    },
  };
  
  // Reveal effect (slide + mask)
  const revealEffect = {
    initial: {
      opacity: 1,
      clipPath: "inset(0 100% 0 0)",
    },
    animate: {
      opacity: 1,
      clipPath: "inset(0 0% 0 0)",
      transition: {
        duration: 0.8,
        ease: [0.19, 1.0, 0.22, 1.0],
        delay: delay,
      },
    },
  };
  
  // 3D flip effect
  const flipEffect = {
    initial: {
      opacity: 0,
      rotateY: 45,
      perspective: 1000,
    },
    animate: {
      opacity: 1,
      rotateY: 0,
      transition: {
        duration: 0.7,
        ease: [0.19, 1.0, 0.22, 1.0],
        delay: delay,
      },
    },
  };
  
  // Standard slide effect
  const slideEffect = {
    initial: {
      opacity: 0,
      ...getInitialPosition(),
    },
    animate: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 0.7,
        ease: [0.43, 0.13, 0.23, 0.96],
        delay: delay,
      },
    },
  };
  
  // Get the effect based on the prop
  const getEffect = () => {
    switch (effect) {
      case "scale": return scaleEffect;
      case "bounce": return bounceEffect;
      case "reveal": return revealEffect;
      case "flip": return flipEffect;
      case "fade":
      case "slide":
      default: return slideEffect;
    }
  };
  
  // Container animation for staggered children
  const containerAnimation = {
    initial: {}, // Required for Variants type
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: delay,
      }
    }
  };

  return (
    <motion.div
      className={className}
      initial="initial"
      whileInView="animate"
      viewport={{ once: false, margin: "-20px", amount: 0.1 }}
      variants={staggerChildren ? containerAnimation : getEffect()}
    >
      {staggerChildren ? 
        React.Children.map(children, (child, i) => (
          <motion.div
            variants={getEffect()}
            custom={i}
            key={i}
          >
            {child}
          </motion.div>
        )) : 
        children
      }
    </motion.div>
  );
}