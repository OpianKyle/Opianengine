import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface AnimatedMetricProps {
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  icon?: LucideIcon;
  description?: React.ReactNode;
  formatter?: (value: number) => string;
  className?: string;
  isLoading?: boolean;
  duration?: number; // Animation duration in ms
  delay?: number; // Delay before animation starts in ms
  colorScheme?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
}

export default function AnimatedMetric({
  title,
  value,
  prefix = '',
  suffix = '',
  icon: Icon,
  description,
  formatter = (val) => val.toLocaleString(),
  className = '',
  isLoading = false,
  duration = 1000,
  delay = 100,
  colorScheme = 'default',
}: AnimatedMetricProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number | null>(null);
  const startTime = useRef<number | null>(null);

  // Color schemes
  const colorSchemes = {
    default: {
      card: 'bg-background border-border',
      title: 'text-foreground',
      value: 'text-foreground',
      icon: 'text-muted-foreground',
    },
    primary: {
      card: 'bg-primary/10 border-primary/20',
      title: 'text-primary-foreground',
      value: 'text-primary',
      icon: 'text-primary',
    },
    success: {
      card: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900',
      title: 'text-green-900 dark:text-green-50',
      value: 'text-green-600 dark:text-green-400',
      icon: 'text-green-500',
    },
    warning: {
      card: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-900',
      title: 'text-amber-900 dark:text-amber-50',
      value: 'text-amber-600 dark:text-amber-400',
      icon: 'text-amber-500',
    },
    danger: {
      card: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900',
      title: 'text-red-900 dark:text-red-50',
      value: 'text-red-600 dark:text-red-400',
      icon: 'text-red-500',
    },
  };

  // Animation on value change
  useEffect(() => {
    if (isVisible && !isLoading) {
      startTime.current = null;
      
      const animate = (timestamp: number) => {
        if (!startTime.current) startTime.current = timestamp;
        const elapsed = timestamp - startTime.current;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function: easeOutExpo
        const easeOutExpo = (t: number): number => {
          return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        };
        
        const easedProgress = easeOutExpo(progress);
        const currentValue = Math.floor(easedProgress * value);
        
        setDisplayValue(currentValue);
        
        if (progress < 1) {
          animationFrameId.current = requestAnimationFrame(animate);
        } else {
          setDisplayValue(value); // Ensure we end exactly at the target value
        }
      };
      
      // Add delay before starting animation
      const timeoutId = setTimeout(() => {
        animationFrameId.current = requestAnimationFrame(animate);
      }, delay);
      
      return () => {
        if (timeoutId) clearTimeout(timeoutId);
        if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      };
    }
  }, [value, isVisible, duration, delay, isLoading]);

  // Intersection Observer to trigger animation when card becomes visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => {
      if (cardRef.current) {
        observer.unobserve(cardRef.current);
      }
    };
  }, []);

  // Effect for card entrance animation
  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.style.opacity = '0';
      cardRef.current.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        if (cardRef.current) {
          cardRef.current.style.transition = `transform 0.5s ease-out ${delay}ms, opacity 0.5s ease-out ${delay}ms`;
          cardRef.current.style.opacity = '1';
          cardRef.current.style.transform = 'translateY(0)';
        }
      }, 50);
    }
  }, [delay]);

  // Effect for number pop animation when value changes
  useEffect(() => {
    if (valueRef.current && !isLoading) {
      valueRef.current.style.transform = 'scale(1.1)';
      valueRef.current.style.transition = 'transform 0.3s ease-out';
      
      const timeoutId = setTimeout(() => {
        if (valueRef.current) {
          valueRef.current.style.transform = 'scale(1)';
        }
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }, [displayValue, isLoading]);

  const colors = colorSchemes[colorScheme];

  return (
    <Card 
      ref={cardRef} 
      className={cn(
        "transition-all overflow-hidden",
        colors.card,
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={cn("text-sm font-medium", colors.title)}>
          {title}
        </CardTitle>
        {Icon && <Icon className={cn("h-4 w-4", colors.icon)} />}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <>
            <div className="h-8 w-24 animate-pulse bg-muted rounded mb-1"></div>
            {description && <div className="h-4 w-32 animate-pulse bg-muted rounded"></div>}
          </>
        ) : (
          <>
            <div 
              ref={valueRef}
              className={cn("text-2xl font-bold transition-transform", colors.value)}
            >
              {prefix}{formatter(displayValue)}{suffix}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-1">
                {description}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}