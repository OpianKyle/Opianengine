import React, { useEffect } from 'react';
import Joyride, { STATUS, Step } from 'react-joyride';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/components/ui/button';

// Style customization for the tour
const joyrideStyles = {
  options: {
    primaryColor: '#1b75bc', // OPIAN blue
    textColor: '#011d3d',
    backgroundColor: '#ffffff',
    arrowColor: '#ffffff',
    overlayColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1000,
  },
  tooltipContainer: {
    textAlign: 'left' as const,
    padding: '20px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  },
  buttonNext: {
    backgroundColor: '#1b75bc',
    color: '#ffffff',
    borderRadius: '4px',
    padding: '8px 16px',
    fontWeight: 'bold',
  },
  buttonBack: {
    marginRight: '8px',
    color: '#757575',
  },
  buttonSkip: {
    color: '#757575',
  },
  buttonClose: {
    color: '#757575',
  },
  spotlight: {
    backgroundColor: 'transparent',
    borderRadius: '8px',
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.85), 0 0 15px rgba(0, 0, 0, 0.5)',
  },
  overlay: {
    backgroundColor: 'transparent',
  },
};

// Tour steps for the customer dashboard
const tourSteps: Step[] = [
  {
    target: '.welcome-dashboard', 
    content: 'Welcome to your OPIAN Rewards dashboard! This tour will help you learn how to navigate the platform and make the most of your rewards.',
    disableBeacon: true,
    placement: 'auto',
    isFixed: true, // Keep the tooltip in a fixed position
  },
  {
    target: '.points-card',
    content: 'Here you can see your current points balance. You earn points through referrals, purchases, and special promotions.',
    disableBeacon: true,
    placement: 'bottom',
    spotlightPadding: 15,
    offset: 20,
    disableScrolling: false,
    disableOverlayClose: false,
  },
  {
    target: '.sidebar-navigation',
    content: 'Use the navigation menu to access different sections of your dashboard, including Products, Rewards, and Referrals.',
    disableBeacon: true,
    placement: 'right',
    spotlightPadding: 10,
  },
  {
    target: '.referral-section',
    content: 'Share your unique referral code with friends and family. You\'ll earn 2000 points for each successful referral!',
    disableBeacon: true,
    placement: 'bottom',
    spotlightPadding: 20,
    disableOverlay: false,
    disableScrolling: false,
    offset: 20,
  },
  {
    target: '.recent-transactions',
    content: 'Track your recent point transactions, including earnings and redemptions.',
    disableBeacon: true,
    placement: 'top',
    spotlightPadding: 15,
  },
  {
    target: '.profile-link',
    content: 'Update your profile information and manage your account settings here.',
    disableBeacon: true,
    placement: 'left',
    spotlightPadding: 10,
  },
];

const CustomerTour: React.FC = () => {
  const { 
    showTour, 
    stepIndex, 
    setStepIndex, 
    startTour, 
    endTour, 
    isFirstVisit 
  } = useOnboarding();

  // Start the tour automatically on the first visit after a small delay
  // to ensure all components are loaded
  useEffect(() => {
    if (isFirstVisit) {
      console.log('CustomerTour: First visit detected, preparing to start tour...');
      const timer = setTimeout(() => {
        console.log('CustomerTour: Starting tour now');
        startTour();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isFirstVisit, startTour]);
  
  // Debug the current tour state for troubleshooting
  useEffect(() => {
    console.log('CustomerTour state:', { showTour, stepIndex, isFirstVisit });
  }, [showTour, stepIndex, isFirstVisit]);
  
  // Handle tour events with improved debugging and smoother transitions
  const handleJoyrideCallback = (data: any) => {
    const { action, index, status, type, lifecycle, step } = data;
    
    console.log('Tour callback:', { action, index, status, type, lifecycle });
    
    // Handle different tour events
    if (type === 'step:before') {
      // Preparing to show a step
      console.log('Preparing step:', index);
      
      // Make sure target is visible by scrolling to it if needed
      if (step && step.target) {
        try {
          const targetElement = document.querySelector(step.target);
          if (targetElement) {
            // Special handling for specific steps that need custom scroll positioning
            if (index === 1) {
              console.log(`Enhanced scrolling for points card (step ${index})`);
              // For points card, scroll to show the full card
              window.scrollTo({
                top: Math.max(0, targetElement.getBoundingClientRect().top + window.scrollY - 300),
                behavior: 'smooth'
              });
            } else if (index === 3) {
              console.log(`Enhanced scrolling for referral section (step ${index})`);
              // Force scroll to element with additional offset
              window.scrollTo({
                top: Math.max(0, targetElement.getBoundingClientRect().top + window.scrollY - 300),
                behavior: 'smooth'
              });
              
              // Add a slight delay to ensure scrolling completes
              setTimeout(() => {
                console.log('Highlighting referral section after scroll');
                // If needed, we could add additional handling here
              }, 300);
            } else {
              // Check if element is in viewport
              const rect = targetElement.getBoundingClientRect();
              const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
              const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
              
              // More forgiving viewport check (element is at least partially visible)
              const isPartiallyInViewport = !(
                rect.bottom < 0 || 
                rect.top > viewportHeight ||
                rect.right < 0 || 
                rect.left > viewportWidth
              );
              
              // Element is not even partially in viewport
              if (!isPartiallyInViewport) {
                console.log(`Element ${step.target} not in viewport, scrolling to it`);
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
              // Element is partially visible but not fully
              else if (rect.top < 0 || rect.bottom > viewportHeight) {
                console.log(`Element ${step.target} partially in viewport, adjusting scroll`);
                targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }
            }
          }
        } catch (err) {
          console.error('Error scrolling to target:', err);
        }
      }
    }
    
    // Update step index for navigation
    if (type === 'step:after' && action === 'next') {
      console.log('Moving to next step:', index + 1);
      setStepIndex(index + 1);
    } else if (type === 'step:after' && action === 'back') {
      console.log('Moving to previous step:', index - 1);
      setStepIndex(index - 1);
    }
    
    // Handle step entry and exit
    if (lifecycle === 'complete' && action !== 'close') {
      // Step was completed (user clicked "Next" or "Back")
      console.log('Step completed:', index);
    }
    
    // End tour when finished or skipped
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      console.log('Tour ended with status:', status);
      endTour();
    }
  };
  
  // Tour restart button to show in the dashboard
  const TourButton = () => (
    <Button
      onClick={startTour}
      className="tour-guide-button bg-[#1b75bc] hover:bg-[#145d99] text-white"
    >
      Start Tour Guide
    </Button>
  );

  return (
    <>
      {/* Only show tour button when tour is not running */}
      {!showTour && (
        <div className="flex justify-end mb-4">
          <TourButton />
        </div>
      )}
      <Joyride
        steps={tourSteps}
        run={showTour}
        continuous={true}
        scrollToFirstStep={true}
        // @ts-ignore - scrollToSteps exists in react-joyride but isn't in the types
        scrollToSteps={true}
        scrollOffset={80}
        scrollDuration={300}
        showProgress={true}
        showSkipButton={true}
        spotlightClicks={true}
        disableOverlayClose={true}
        disableCloseOnEsc={true}
        hideCloseButton={false}
        callback={handleJoyrideCallback}
        stepIndex={stepIndex}
        styles={joyrideStyles}
        debug={true}
        floaterProps={{ 
          disableAnimation: false,
          styles: {
            arrow: {
              length: 8,
              spread: 12,
            }
          }
        }}
        locale={{
          back: 'Back',
          close: 'Close',
          last: 'Finish',
          next: 'Next',
          skip: 'Skip Tour',
        }}
      />
    </>
  );
};

export default CustomerTour;