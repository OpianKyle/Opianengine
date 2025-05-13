// Define the gtag function globally
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

// Initialize Google Analytics
export const initGA = () => {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  
  if (!measurementId) {
    console.warn('Missing VITE_GA_MEASUREMENT_ID environment variable');
    return;
  }

  // Check if GA is already initialized to prevent duplicate script loading
  if (document.querySelector(`script[src*="googletagmanager.com/gtag/js"]`)) {
    console.log('Google Analytics already initialized');
    return;
  }
  
  try {
    // Add Google Analytics script to the head
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(script1);

    // Initialize gtag
    const script2 = document.createElement('script');
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${measurementId}');
    `;
    document.head.appendChild(script2);
    
    console.log('Google Analytics initialized');
  } catch (error) {
    console.error('Failed to initialize Google Analytics:', error);
  }
};

// Track page views - useful for single-page applications
export const trackPageView = (url: string) => {
  if (typeof window === 'undefined' || !window.gtag) return;
  
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID;
  if (!measurementId) {
    console.warn('Missing VITE_GA_MEASUREMENT_ID environment variable for page tracking');
    return;
  }
  
  try {
    window.gtag('config', measurementId, {
      page_path: url
    });
    console.log(`Tracked page view: ${url}`);
  } catch (error) {
    console.error('Error tracking page view:', error);
  }
};

// Track events
export const trackEvent = (
  action: string, 
  category?: string, 
  label?: string, 
  value?: number
) => {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('Google Analytics not available for event tracking');
    return;
  }
  
  try {
    window.gtag('event', action, {
      event_category: category,
      event_label: label,
      value: value,
    });
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Tracked event: ${action}`, { category, label, value });
    }
  } catch (error) {
    console.error('Error tracking event:', error);
  }
};

// Track social media referrals - called with the social network name
export const trackSocialReferral = (network: string) => {
  if (typeof window === 'undefined' || !window.gtag) {
    console.warn('Google Analytics not available for social referral tracking');
    return;
  }

  try {
    window.gtag('event', 'social_referral', {
      social_network: network,
      referral_path: document.referrer,
      page_path: window.location.pathname
    });
    
    console.log(`Tracked social referral from ${network}`);
  } catch (error) {
    console.error('Error tracking social referral:', error);
  }
};