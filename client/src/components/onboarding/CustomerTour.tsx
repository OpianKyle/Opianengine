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
    overlayColor: 'rgba(0, 0, 0, 0.5)',
  },
  tooltipContainer: {
    textAlign: 'left' as const,
    padding: '15px',
  },
  buttonNext: {
    backgroundColor: '#1b75bc',
    color: '#ffffff',
    borderRadius: '4px',
    padding: '8px 16px',
  },
  buttonBack: {
    marginRight: '8px',
    color: '#757575',
  },
  buttonSkip: {
    color: '#757575',
  },
};

// Tour steps for the customer dashboard
const tourSteps: Step[] = [
  {
    target: '.welcome-dashboard', 
    content: 'Welcome to your OPIAN Rewards dashboard! This tour will help you learn how to navigate the platform and make the most of your rewards.',
    disableBeacon: true,
    placement: 'auto',
  },
  {
    target: '.points-card',
    content: 'Here you can see your current points balance. You earn points through referrals, purchases, and special promotions.',
    disableBeacon: true,
    placement: 'bottom',
  },
  {
    target: '.sidebar-navigation',
    content: 'Use the navigation menu to access different sections of your dashboard, including Products, Rewards, and Referrals.',
    disableBeacon: true,
    placement: 'right',
  },
  {
    target: '.referral-section',
    content: 'Share your unique referral code with friends and family. You\'ll earn 2000 points for each successful referral!',
    disableBeacon: true,
    placement: 'top',
  },
  {
    target: '.recent-transactions',
    content: 'Track your recent point transactions, including earnings and redemptions.',
    disableBeacon: true,
    placement: 'top',
  },
  {
    target: '.profile-link',
    content: 'Update your profile information and manage your account settings here.',
    disableBeacon: true,
    placement: 'left',
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
  
  // Handle tour events with improved debugging
  const handleJoyrideCallback = (data: any) => {
    const { action, index, status, type } = data;
    
    console.log('Tour callback:', { action, index, status, type });
    
    // Update step index for navigation
    if (type === 'step:after' && action === 'next') {
      setStepIndex(index + 1);
    } else if (type === 'step:after' && action === 'back') {
      setStepIndex(index - 1);
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
        showProgress={true}
        showSkipButton={true}
        spotlightClicks={true}
        disableOverlayClose={true}
        disableCloseOnEsc={true}
        hideCloseButton={false}
        scrollOffset={120}
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