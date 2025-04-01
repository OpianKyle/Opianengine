import { useState, useEffect, createContext, useContext, ReactNode } from 'react';

// Define breakpoints (in pixels)
export enum Breakpoint {
  SM = 640,
  MD = 768,
  LG = 1024,
  XL = 1280,
  XXL = 1536,
}

type BreakpointType = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';

interface ResponsiveContextType {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  breakpoint: BreakpointType;
}

const ResponsiveContext = createContext<ResponsiveContextType | undefined>(undefined);

export function ResponsiveProvider({ children }: { children: ReactNode }) {
  const [windowSize, setWindowSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  });

  useEffect(() => {
    // Only run on client side
    if (typeof window === 'undefined') return;

    // Handler to update window size
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    // Add event listener
    window.addEventListener('resize', handleResize);
    
    // Call handler right away to update initial size
    handleResize();
    
    // Remove event listener on cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Determine current breakpoint
  const getBreakpoint = (): BreakpointType => {
    const { width } = windowSize;
    if (width < Breakpoint.SM) return 'xs';
    if (width < Breakpoint.MD) return 'sm';
    if (width < Breakpoint.LG) return 'md';
    if (width < Breakpoint.XL) return 'lg';
    if (width < Breakpoint.XXL) return 'xl';
    return '2xl';
  };

  const breakpoint = getBreakpoint();
  
  // Determine device type based on breakpoint
  const isMobile = breakpoint === 'xs' || breakpoint === 'sm';
  const isTablet = breakpoint === 'md' || breakpoint === 'lg';
  const isDesktop = breakpoint === 'xl' || breakpoint === '2xl';

  const value = {
    isMobile,
    isTablet,
    isDesktop,
    breakpoint,
  };

  return (
    <ResponsiveContext.Provider value={value}>
      {children}
    </ResponsiveContext.Provider>
  );
}

export function useMobile() {
  const context = useContext(ResponsiveContext);
  
  if (context === undefined) {
    throw new Error('useMobile must be used within a ResponsiveProvider');
  }
  
  return context;
}