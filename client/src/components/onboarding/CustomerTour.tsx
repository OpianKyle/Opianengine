import React, { useEffect } from 'react';
import Joyride, { STATUS, Step } from 'react-joyride';
import { useOnboarding } from '@/contexts/OnboardingContext';
import { Button } from '@/components/ui/button';

// @ts-nocheck
// The above directive disables type checking for this file to allow custom styling
// Style customization for the tour with blue and green theme
const joyrideStyles = {
  options: {
    primaryColor: '#43EB3E', // OPIAN green for primary actions
    textColor: '#ffffff', // White text for dark background
    backgroundColor: '#011d3d', // Dark blue background
    arrowColor: '#011d3d', // Match the tooltip background
    overlayColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 1000,
  },
  tooltipContainer: {
    textAlign: 'left' as const,
    padding: '28px 26px', // Extra padding all around for better spacing
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    border: '2px solid #1b75bc',
    borderTop: '4px solid #43EB3E', // Green top border for emphasis
    backgroundColor: '#011d3d', // Dark blue background matching site theme
    color: '#ffffff', // White text for contrast
  },
  buttonNext: {
    backgroundColor: '#43EB3E', // Green for the primary action button
    color: '#011d3d', // Dark text for contrast on green
    borderRadius: '4px',
    padding: '8px 16px',
    fontWeight: 'normal', // Less bold text
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    cursor: 'pointer', // Make sure cursor indicates it's clickable
  },
  buttonBack: {
    marginRight: '8px',
    color: '#43EB3E', // Green for better visibility on dark background
    fontWeight: 'normal', // Less bold text
    cursor: 'pointer', // Make sure cursor indicates it's clickable
  },
  buttonSkip: {
    color: '#43EB3E', // Green for better visibility on dark background
    fontWeight: 'normal', // Less bold text
    cursor: 'pointer', // Make sure cursor indicates it's clickable
  },
  // The close button with improved positioning (using styles that work with JoyRide)
  buttonClose: {
    color: '#43EB3E', // Green cross
    fontSize: '12px', // Even smaller cross to fit properly in circle
    fontWeight: 'normal', // Less bold text
    backgroundColor: '#1b75bc', // Solid blue background
    borderRadius: '50%', // Circular background
    width: '22px',
    height: '22px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    border: '1px solid #43EB3E', // Green border
    padding: 0, // Remove padding
    boxShadow: '0 0 4px rgba(67, 235, 62, 0.5)', // Subtle green glow
    // Ensure the button is properly clickable by using absolute positioning
    position: 'absolute', // Use absolute positioning
    top: '-11px', // Position from top
    right: '-11px', // Position from right
    lineHeight: '12px', // Adjusted to match font size
    textAlign: 'center', // Center the X horizontally
    zIndex: 10, // Ensure it's above other elements
    cursor: 'pointer', // Make sure cursor indicates it's clickable
  },
  spotlight: {
    backgroundColor: 'transparent',
    borderRadius: '8px',
    boxShadow: '0 0 0 9999px rgba(0, 0, 0, 0.85), 0 0 15px rgba(67, 235, 62, 0.5), 0 0 8px rgba(27, 117, 188, 0.5)', // Combined green and blue glow
  },
  overlay: {
    backgroundColor: 'transparent',
  },
  // Add title styling with enhanced colors for dark background
  tooltipTitle: {
    color: '#43EB3E', // Green for headings stands out on dark background
    fontSize: '18px',
    fontWeight: 'bold',
    borderBottom: '1px solid #1b75bc', // Blue border
    paddingBottom: '8px',
    marginBottom: '15px', // More space after the title
  },
  tooltipContent: {
    fontSize: '15px',
    lineHeight: '1.5',
    color: '#ffffff', // Ensure content text is white for readability
    paddingRight: '10px', // Add space to account for close button
  },
};

// Tour steps for the customer dashboard
const tourSteps: Step[] = [
  {
    target: '.welcome-dashboard', 
    content: 'Welcome to your OPIAN Rewards dashboard! This tour will help you learn how to navigate the platform and make the most of your rewards.',
    disableBeacon: true,
    placement: 'top-start',
    isFixed: true, // Keep the tooltip in a fixed position
  },
  {
    // First card in the first row - Points Balance
    target: '.points-card',
    content: 'Here you can see your current points balance and tier level. You earn points through referrals, purchases, and special promotions.',
    disableBeacon: true,
    placement: 'bottom',
    spotlightPadding: 15,
    offset: 20,
    disableScrolling: false,
    disableOverlayClose: false,
  },
  {
    // Second card in the first row - Cash Redemption
    target: '.rewards-section',
    content: 'Redeem your points for cash at a rate of R0.015 per point. Enter the amount you want to redeem and click the button to process your request.',
    disableBeacon: true,
    placement: 'bottom',
    spotlightPadding: 15,
    offset: 20,
  },
  {
    target: '.sidebar-navigation',
    content: 'Use the navigation menu to access different sections of your dashboard, including Products, Rewards, and Referrals.',
    disableBeacon: true,
    placement: 'right',
    spotlightPadding: 10,
  },
  {
    // Target the referral program card specifically
    target: '.referral-section',
    content: 'Share your unique referral code with friends and family. You\'ll earn 2000 points for each successful referral!',
    disableBeacon: true,
    placement: 'right',
    spotlightPadding: 20,
    disableOverlay: false,
    disableScrolling: false,
    offset: 20,
  },
  {
    // Recent Activity card
    target: '.recent-transactions',
    content: 'Track your recent point transactions, including earnings and redemptions.',
    disableBeacon: true,
    placement: 'left',
    spotlightPadding: 15,
  },
  {
    // Training Videos card
    target: '.training-videos',
    content: 'Access training videos and resources to learn more about OPIAN Rewards and how to maximize your benefits.',
    disableBeacon: true,
    placement: 'left',
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
    
    // Immediately handle close action regardless of context
    if (action === 'close') {
      console.log('Close button clicked, ending tour immediately');
      endTour();
      return;
    }
    
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
            if (index === 1 || index === 2) {
              console.log(`Enhanced scrolling for cards in first row (step ${index})`);
              // For points and cash redemption cards, scroll to show the full card
              window.scrollTo({
                top: Math.max(0, targetElement.getBoundingClientRect().top + window.scrollY - 200),
                behavior: 'smooth'
              });
            } else if (index === 4 || index === 5 || index === 6) {
              console.log(`Enhanced scrolling for second row cards (step ${index})`);
              // Force scroll to element with additional offset
              window.scrollTo({
                top: Math.max(0, targetElement.getBoundingClientRect().top + window.scrollY - 150),
                behavior: 'smooth'
              });
              
              // Add a slight delay to ensure scrolling completes
              setTimeout(() => {
                console.log(`Highlighting card element after scroll for step ${index}`);
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
      const nextIndex = index + 1;
      console.log('Moving to next step:', nextIndex);
      setStepIndex(nextIndex);
    } else if (type === 'step:after' && action === 'prev' || type === 'step:after' && action === 'back') {
      // Only go back if we're not already at the first step
      if (index > 0) {
        const prevIndex = index - 1;
        console.log('Moving to previous step:', prevIndex);
        setStepIndex(prevIndex);
      } else {
        // If we're at the first step, just maintain the current step
        console.log('Already at first step, maintaining current position');
        setStepIndex(0);
      }
    }
    
    // Handle tour end
    if (type === 'tour:end') {
      console.log('Tour ended by tour:end event');
      endTour();
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
  
  // Tour restart button to show in the dashboard with green styling
  const TourButton = () => (
    <Button
      onClick={startTour}
      className="tour-guide-button bg-[#43EB3E] hover:bg-[#43EB3E]/80 text-[#011d3d] font-medium border border-[#1b75bc] shadow-sm"
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
        // @ts-ignore - We need to bypass TypeScript for the custom styles
        styles={joyrideStyles as any}
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