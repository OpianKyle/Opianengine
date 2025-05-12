import { useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { trackPageView, trackSocialReferral } from '../lib/analytics';

// List of known social media domains to check referrers against
const SOCIAL_DOMAINS = [
  'facebook.com',
  'instagram.com',
  'twitter.com',
  'linkedin.com',
  'youtube.com',
  'pinterest.com',
  'reddit.com',
  'tiktok.com',
  't.co', // Twitter shortened URLs
  'lnkd.in', // LinkedIn shortened URLs
  'fb.me', // Facebook shortened URLs
];

// Identify which social network a visitor came from
const getSocialReferrer = (referrer: string): string | null => {
  if (!referrer) return null;
  
  try {
    const url = new URL(referrer);
    const domain = url.hostname.replace('www.', '');
    
    for (const socialDomain of SOCIAL_DOMAINS) {
      if (domain.includes(socialDomain)) {
        // Return the main domain name (e.g., "facebook" from "facebook.com")
        return socialDomain.split('.')[0];
      }
    }
  } catch (e) {
    console.error('Error parsing referrer URL:', e);
  }
  
  return null;
};

// Custom hook for tracking analytics data
export const useAnalytics = () => {
  const [location] = useLocation();
  const prevLocationRef = useRef<string>(location);
  const socialTrackingProcessed = useRef<boolean>(false);
  
  // Track page views when route changes
  useEffect(() => {
    if (location !== prevLocationRef.current) {
      trackPageView(location);
      prevLocationRef.current = location;
    }
  }, [location]);
  
  // Track social media referrers on initial load
  useEffect(() => {
    if (!socialTrackingProcessed.current && document.referrer) {
      const socialNetwork = getSocialReferrer(document.referrer);
      if (socialNetwork) {
        trackSocialReferral(socialNetwork);
      }
      socialTrackingProcessed.current = true;
    }
  }, []);
};