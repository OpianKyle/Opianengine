import React, { useEffect } from "react";
import Joyride, { STATUS, Step, CallBackProps, Placement } from "react-joyride";
import { Button } from "@/components/ui/button";
import { useOnboarding } from "@/contexts/OnboardingContext";

// Define styles explicitly with proper TypeScript typings to match the site theme
const joyrideStyles = {
  options: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    overlayColor: "rgba(0, 0, 0, 0.7)",
    primaryColor: "#1b75bc", // OPIAN blue from theme.json
    spotlightShadow: "0 0 15px rgba(27, 117, 188, 0.5)",
    textColor: "#011d3d",
    width: 400,
    zIndex: 10000,
  },
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    mixBlendMode: "normal" as const, // Use const assertion for string literals
  },
  spotlight: {
    backgroundColor: "transparent",
    borderRadius: 8,
    boxShadow: '0 0 0 999vw rgba(0, 0, 0, 0.85), 0 0 15px rgba(27, 117, 188, 0.5)',
  },
  tooltip: {
    backgroundColor: "#fff",
    borderRadius: "8px",
    color: "#011d3d",
    fontSize: "15px",
    padding: "20px",
    border: "1px solid #1b75bc",
  },
  tooltipContent: {
    padding: "5px 0",
  },
  tooltipFooter: {
    alignItems: "center",
    display: "flex",
    justifyContent: "flex-end",
    marginTop: "15px",
  },
  tooltipTitle: {
    color: "#1b75bc",
    fontSize: "16px",
    fontWeight: "bold",
    marginBottom: "10px",
  },
  buttonNext: {
    backgroundColor: "#1b75bc",
    borderRadius: "4px",
    color: "#fff",
    fontWeight: "bold",
    padding: "8px 16px",
  },
  buttonBack: {
    marginRight: "10px",
    color: "#1b75bc",
  },
  buttonSkip: {
    color: "#1b75bc",
  },
  buttonClose: {
    color: "#1b75bc",
  },
};

// Tour steps configuration
const tourSteps: Step[] = [
  {
    target: '.referral-header',
    content: 'Welcome to the referral program! Here you can manage your referrals and earn rewards.',
    disableBeacon: true,
    placement: 'bottom' as Placement,
    spotlightPadding: 15,
    disableOverlayClose: false,
    offset: 20,
  },
  {
    target: '.referral-rewards-info',
    content: 'This section explains how the referral program works. You can earn points and commissions from different tiers of referrals.',
    disableBeacon: true,
    placement: 'bottom' as Placement,
    spotlightPadding: 15,
    offset: 20,
  },
  {
    target: '.referral-link-section',
    content: 'Share your unique referral link with friends and family. Every time someone signs up using your link, you\'ll earn rewards!',
    disableBeacon: true,
    placement: 'bottom' as Placement,
    spotlightPadding: 15,
    offset: 20,
  },
  {
    target: '.social-share-buttons',
    content: 'Use these buttons to quickly share your referral link on social media and via email.',
    disableBeacon: true,
    placement: 'bottom' as Placement,
    spotlightPadding: 10,
    offset: 20,
  },
  {
    target: '.referral-stats',
    content: 'Track your referral performance here. See how many people you\'ve referred and the total points earned.',
    disableBeacon: true,
    placement: 'bottom' as Placement,
    spotlightPadding: 15,
    offset: 20,
  },
  {
    target: '.referral-badges',
    content: 'Earn badges as you refer more people! Each badge represents a milestone in your referral journey.',
    disableBeacon: true,
    placement: 'bottom' as Placement,
    spotlightPadding: 15,
    offset: 20,
  },
];

interface ReferralsTourProps {
  onComplete?: () => void;
}

const ReferralsTour: React.FC<ReferralsTourProps> = ({ onComplete }) => {
  // Use the centralized OnboardingContext for managing tour state
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
      console.log('ReferralsTour: First visit detected, preparing to start tour...');
      const timer = setTimeout(() => {
        console.log('ReferralsTour: Starting tour now');
        startTour();
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isFirstVisit, startTour]);

  // Custom endTour handler to call the onComplete callback if provided
  const handleEndTour = () => {
    endTour();
    if (onComplete) {
      onComplete();
    }
  };

  // Handle tour events with improved debugging and smoother transitions
  const handleJoyrideCallback = (data: CallBackProps) => {
    const { action, index, status, type, lifecycle, step } = data;
    
    console.log('Referrals tour callback:', { action, index, status, type, lifecycle });
    
    // Handle different tour events
    if (type === 'step:before') {
      // Preparing to show a step
      console.log('Preparing referrals step:', index);
      
      // Make sure target is visible by scrolling to it if needed
      if (step && step.target) {
        try {
          const targetElement = document.querySelector(step.target as string);
          if (targetElement) {
            // Custom scroll positioning for all elements with extra space
            window.scrollTo({
              top: Math.max(0, targetElement.getBoundingClientRect().top + window.scrollY - 250),
              behavior: 'smooth'
            });
          }
        } catch (err) {
          console.error('Error scrolling to target:', err);
        }
      }
    }
    
    // Update step index for navigation
    if (type === 'step:after') {
      if (action === 'next') {
        console.log('Moving to next step:', index + 1);
        setStepIndex(index + 1);
      } else if (action === 'prev') {
        // 'prev' is the correct action type in Joyride, not 'back'
        console.log('Moving to previous step:', index - 1);
        setStepIndex(index - 1);
      }
    }
    
    // End tour when finished or skipped
    // Do a string comparison instead of using the STATUS enum to avoid TypeScript errors
    if (status === 'finished' || status === 'skipped') {
      console.log('Referrals tour ended with status:', status);
      handleEndTour();
    }
  };
  
  // Tour restart button to show in the dashboard
  const TourButton = () => (
    <Button
      onClick={startTour}
      className="tour-guide-button bg-primary hover:bg-primary/80 text-white font-medium"
    >
      Start Referrals Tour
    </Button>
  );

  return (
    <>
      {/* Only show tour button when tour is not running */}
      {!showTour && !isFirstVisit && (
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

export default ReferralsTour;