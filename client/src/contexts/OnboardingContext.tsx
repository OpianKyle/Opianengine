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

export const OnboardingProvider = ({ children, section = 'customer' }: { children: ReactNode, section?: string }) => {
  const [showTour, setShowTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [isFirstVisit, setIsFirstVisit] = useState(false);
  
  // Check if this is the user's first visit to this section
  useEffect(() => {
    const sectionKey = `${ONBOARDING_SECTION_KEY}${section}`;
    const hasCompletedOnboarding = localStorage.getItem(sectionKey) === 'true';
    
    console.log('OnboardingContext: Checking first visit status', { 
      section, 
      sectionKey,
      hasCompletedOnboarding,
      storedValue: localStorage.getItem(sectionKey)
    });
    
    if (!hasCompletedOnboarding) {
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
  }, [section]);

  const startTour = () => {
    setShowTour(true);
    setStepIndex(0);
  };

  const endTour = () => {
    setShowTour(false);
    // Mark this section's tour as completed
    const sectionKey = `${ONBOARDING_SECTION_KEY}${section}`;
    localStorage.setItem(sectionKey, 'true');
    setIsFirstVisit(false);
  };

  const resetTour = () => {
    setStepIndex(0);
    setShowTour(true);
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