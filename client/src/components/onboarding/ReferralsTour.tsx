import React, { useEffect, useState } from "react";
import Joyride, { STATUS, Step, CallBackProps, Placement } from "react-joyride";
import { Button } from "@/components/ui/button";

// Define styles explicitly with proper TypeScript typings
const joyrideStyles = {
  options: {
    backgroundColor: "#fff",
    borderRadius: "4px",
    overlayColor: "rgba(0, 0, 0, 0.5)",
    primaryColor: "#1b75bc",
    spotlightShadow: "0 0 15px rgba(0, 0, 0, 0.5)",
    textColor: "#333",
    width: 400,
    zIndex: 10000,
  },
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    mixBlendMode: "normal" as const, // Use const assertion for string literals
  },
  spotlight: {
    backgroundColor: "transparent",
    borderRadius: 4,
    boxShadow: '0 0 0 999vw rgba(0, 0, 0, 0.5)',
  },
  tooltip: {
    backgroundColor: "#fff",
    borderRadius: "4px",
    color: "#333",
    fontSize: "15px",
    padding: "15px",
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
  },
  buttonBack: {
    marginRight: "10px",
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
  const [showTour, setShowTour] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  const startTour = () => {
    setShowTour(true);
    setStepIndex(0);
  };

  const endTour = () => {
    setShowTour(false);
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
      endTour();
    }
  };
  
  // Tour restart button to show in the dashboard
  const TourButton = () => (
    <Button
      onClick={startTour}
      className="tour-guide-button bg-[#1b75bc] hover:bg-[#145d99] text-white"
    >
      Start Referrals Tour
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

export default ReferralsTour;