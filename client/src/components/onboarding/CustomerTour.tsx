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
    target: '.welcome-dashboard', // Add this class to your welcome section
    content: 'Welcome to your OPIAN Rewards dashboard! This tour will help you learn how to navigate the platform and make the most of your rewards.',
    disableBeacon: true,
    placement: 'center',
  },
  {
    target: '.points-card', // Add this class to your points display
    content: 'Here you can see your current points balance. You earn points through referrals, purchases, and special promotions.',
    disableBeacon: true,
  },
  {
    target: '.sidebar-navigation', // Add this class to your sidebar
    content: 'Use the navigation menu to access different sections of your dashboard, including Products, Rewards, and Referrals.',
    disableBeacon: true,
  },
  {
    target: '.rewards-section', // Add this class to your rewards section
    content: 'Browse available rewards that you can redeem with your points. Check back regularly for new rewards!',
    disableBeacon: true,
  },
  {
    target: '.referral-section', // Add this class to your referral program area
    content: 'Share your unique referral code with friends and family. You\'ll earn 2000 points for each successful referral!',
    disableBeacon: true,
  },
  {
    target: '.recent-transactions', // Add this class to your transactions list
    content: 'Track your recent point transactions, including earnings and redemptions.',
    disableBeacon: true,
  },
  {
    target: '.profile-link', // Add this class to your profile section
    content: 'Update your profile information and manage your account settings here.',
    disableBeacon: true,
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
      const timer = setTimeout(() => {
        startTour();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [isFirstVisit, startTour]);
  
  // Handle tour events
  const handleJoyrideCallback = (data: any) => {
    const { status, index } = data;
    
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      endTour();
    } else {
      setStepIndex(index);
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
      <TourButton />
      <Joyride
        steps={tourSteps}
        run={showTour}
        continuous
        scrollToFirstStep
        showProgress
        showSkipButton
        callback={handleJoyrideCallback}
        stepIndex={stepIndex}
        styles={joyrideStyles}
        floaterProps={{ disableAnimation: false }}
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