import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';

interface OnboardingContextProps {
  showTour: boolean;
  startTour: () => void;
  endTour: () => void;
  resetTour: () => void;
  stepIndex: number;
  setStepIndex: (index: number) => void;
  setShowTour: (show: boolean) => void;
  isFirstVisit: boolean;
}

const OnboardingContext = createContext<OnboardingContextProps>({
  showTour: false,
  startTour: () => {},
  endTour: () => {},
  resetTour: () => {},
  stepIndex: 0,
  setStepIndex: () => {},
  setShowTour: () => {},
  isFirstVisit: false,
});

// Local storage key for tracking whether the user has seen the tour
const ONBOARDING_COMPLETED_KEY = 'opian_onboarding_completed';
const ONBOARDING_SECTION_KEY = 'opian_onboarding_section_';
const TOUR_ACTIVE_KEY = 'opian_tour_active';
const TOUR_STEP_KEY = 'opian_tour_step';

export const OnboardingProvider = ({ children, section = 'customer' }: { children: ReactNode, section?: string }) => {
  // Check if there's an active tour in sessionStorage when component mounts
  const shouldRestoreTour = typeof window !== 'undefined' && sessionStorage.getItem(TOUR_ACTIVE_KEY) === 'true';
  const savedStepIndex = typeof window !== 'undefined' && sessionStorage.getItem(TOUR_STEP_KEY) 
    ? parseInt(sessionStorage.getItem(TOUR_STEP_KEY) as string, 10) 
    : 0;
  
  const [showTour, setShowTour] = useState(shouldRestoreTour);
  const [stepIndex, setStepIndex] = useState(savedStepIndex);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  
  // Check if this is the user's first visit to this section
  useEffect(() => {
    const sectionKey = `${ONBOARDING_SECTION_KEY}${section}`;
    const hasCompletedOnboarding = localStorage.getItem(sectionKey) === 'true';
    
    console.log('OnboardingContext: Checking first visit status', { 
      section, 
      sectionKey,
      hasCompletedOnboarding,
      storedValue: localStorage.getItem(sectionKey),
      shouldRestoreTour,
      savedStepIndex
    });
    
    // Check if we have an active tour in session storage (from page navigation)
    if (shouldRestoreTour) {
      console.log('OnboardingContext: Restoring tour from session storage', {
        step: savedStepIndex
      });
      
      // Mark as active in session storage
      sessionStorage.setItem(TOUR_ACTIVE_KEY, 'true');
      
      // Ensure tour is showing
      setShowTour(true);
      
      // Set step index from session storage
      if (savedStepIndex !== null && !isNaN(savedStepIndex)) {
        setStepIndex(savedStepIndex);
      }
    }
    // Otherwise check if this is the user's first visit
    else if (!hasCompletedOnboarding) {
      console.log('OnboardingContext: First visit detected, setting isFirstVisit to true');
      setIsFirstVisit(true);
      // We don't automatically start the tour here, giving the app time to load
      
      // Force localStorage to be reset if there's any issue
      try {
        localStorage.removeItem(sectionKey);
      } catch (error) {
        console.error('Error accessing localStorage:', error);
      }
    }
  }, [section, shouldRestoreTour, savedStepIndex]);

  const startTour = () => {
    console.log('OnboardingContext: Starting tour');
    setShowTour(true);
    setStepIndex(0);
    
    // Set session storage to mark tour as active
    sessionStorage.setItem(TOUR_ACTIVE_KEY, 'true');
    sessionStorage.setItem(TOUR_STEP_KEY, '0');
  };

  const endTour = () => {
    console.log('OnboardingContext: Ending tour');
    setShowTour(false);
    
    // Mark this section's tour as completed in localStorage (permanent)
    const sectionKey = `${ONBOARDING_SECTION_KEY}${section}`;
    localStorage.setItem(sectionKey, 'true');
    setIsFirstVisit(false);
    
    // Clear session storage
    sessionStorage.removeItem(TOUR_ACTIVE_KEY);
    sessionStorage.removeItem(TOUR_STEP_KEY);
  };

  const resetTour = () => {
    console.log('OnboardingContext: Resetting tour');
    setStepIndex(0);
    setShowTour(true);
    
    // Update session storage
    sessionStorage.setItem(TOUR_ACTIVE_KEY, 'true');
    sessionStorage.setItem(TOUR_STEP_KEY, '0');
  };

  return (
    <OnboardingContext.Provider
      value={{
        showTour,
        startTour,
        endTour,
        resetTour,
        stepIndex,
        setStepIndex,
        setShowTour,
        isFirstVisit,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => useContext(OnboardingContext);