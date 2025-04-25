import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { AlertCircle, CheckCircle, ArrowRight, Loader2, CalendarIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { CancellationDialog } from './CancellationDialog';
import { Badge } from '@/components/ui/badge';
import { get, post } from '@/lib/api';

// Package prices in ZAR
const PACKAGE_PRICES = {
  OPPORTUNITY: 350,
  MOMENTUM: 450,
  PROSPER: 550,
  PRESTIGE: 695,
  PINNACLE: 825
};

// Package descriptions
const PACKAGE_FEATURES = {
  OPPORTUNITY: [
    'Essential rewards program',
    'Monthly newsletter',
    'Basic customer support'
  ],
  MOMENTUM: [
    'Enhanced rewards program',
    'Quarterly digital magazine',
    'Priority email support',
    'Additional reward opportunities'
  ],
  PROSPER: [
    'Premium rewards program',
    'Access to referral program',
    'Dedicated support agent',
    'Monthly exclusive offers',
    'Priority processing'
  ],
  PRESTIGE: [
    'Elite rewards program',
    'VIP referral benefits',
    '24/7 priority support',
    'Exclusive member events',
    'Quarterly performance reviews',
    'Enhanced reward multipliers'
  ],
  PINNACLE: [
    'Ultimate rewards experience',
    'Maximum referral benefits',
    'Dedicated account manager',
    'Customized rewards strategy',
    'Exclusive VIP events',
    'Premium reward multipliers',
    'Early access to new features'
  ]
};

interface SubscriptionDetailsProps {
  packageType: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PaystackSubscription({ 
  packageType,
  onSuccess,
  onCancel
}: SubscriptionDetailsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [subscriptionDetails, setSubscriptionDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCancellationDialog, setShowCancellationDialog] = useState(false);
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();

  // Check if user is on this package already
  const isCurrentPackage = 
    user?.selectedPackage === packageType;

  // FORCE isCurrentPackage to true if this is the user's selected package
  // This ensures the cancel button displays even without a valid subscription
  const showCancelButton = user?.selectedPackage === packageType;
  
  // Check if subscription data is available
  const hasSubscription = !!user?.paystack_subscription_code;

  // Debug values
  console.log('Subscription Debug:', {
    packageType,
    userPackage: user?.selectedPackage,
    subscriptionStatus: user?.subscription_status,
    isCurrentPackage,
    hasSubscription,
    subscriptionCode: user?.paystack_subscription_code
  });

  // Fetch subscription details if available
  useEffect(() => {
    // Always fetch subscription details if user has a subscription
    // This helps with syncing data between Paystack and our database
    if (hasSubscription) {
      fetchSubscriptionDetails();
    } 
    // If the user has selected a package but no recorded subscription code,
    // try to fetch details anyway as there might be a subscription in Paystack
    else if (user?.selectedPackage === packageType && !user.paystack_subscription_code) {
      fetchSubscriptionDetails();
    }
  }, [hasSubscription, isCurrentPackage, user?.selectedPackage]);

  // Fetch subscription details from the server
  const fetchSubscriptionDetails = async () => {
    try {
      // Only fetch if user has a subscription code or selectedPackage
      if (!user?.paystack_subscription_code && !user?.selectedPackage) {
        console.log('Skipping subscription details fetch - no subscription data');
        return;
      }
      
      setIsLoading(true);
      const data = await get('/api/subscription/details');
      setSubscriptionDetails(data.subscription);
      setError(null); // Clear any previous errors on success
    } catch (error: any) {
      console.error('Error fetching subscription details:', error);
      // Don't show 404 errors to user as these are expected when no subscription exists
      if (error.status !== 404) {
        setError(error.message || 'An error occurred while fetching subscription details');
      }

      // If error response contains "No active subscription found" but we know user has a subscription
      // in Paystack, refresh the user data to get fresh subscription info
      if (error.message?.includes('No active subscription') && user?.selectedPackage) {
        await refreshUser();
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize subscription
  const handleSubscribe = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await post('/api/subscription/initialize', { packageType });
      
      // Redirect to Paystack checkout page
      window.location.href = data.authorization_url;
    } catch (error: any) {
      console.error('Subscription initialization error:', error);
      
      // Check if the error message indicates subscription already exists
      if (error.message?.includes('already') || error.message?.includes('exists')) {
        // Refresh user data to get current subscription status
        await refreshUser();
        
        toast({
          title: 'Subscription Already Exists',
          description: 'You already have this subscription. Refreshing subscription details...',
          variant: 'default',
        });
        
        // Fetch subscription details to update the UI
        await fetchSubscriptionDetails();
      } else {
        setError(error.message || 'An error occurred while setting up subscription');
        toast({
          title: 'Subscription Error',
          description: error.message || 'Failed to set up subscription',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Open cancellation dialog
  const handleOpenCancellationDialog = () => {
    setShowCancellationDialog(true);
  };

  // Handle successful cancellation
  const handleSubscriptionCancelled = async () => {
    if (onCancel) {
      onCancel();
    }
    
    // Refresh user data and subscription details
    await refreshUser();
    await fetchSubscriptionDetails();
  };

  // Reactivate subscription
  const handleReactivate = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await post('/api/subscription/reactivate');
      
      toast({
        title: 'Subscription Reactivated',
        description: 'Your subscription has been successfully reactivated',
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      // Refresh user data and subscription details
      await refreshUser();
      await fetchSubscriptionDetails();
    } catch (error: any) {
      setError(error.message || 'An error occurred while reactivating subscription');
      toast({
        title: 'Reactivation Error',
        description: error.message || 'Failed to reactivate subscription',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Request payment update link
  const handleRequestUpdateLink = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const data = await get('/api/subscription/update-link');
      
      // Open the update link in a new tab
      window.open(data.link, '_blank');
      
      toast({
        title: 'Payment Update',
        description: 'A payment update page has been opened in a new tab',
      });
    } catch (error: any) {
      setError(error.message || 'Failed to generate payment update link');
      toast({
        title: 'Error',
        description: error.message || 'Failed to generate payment update link',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Get package color class based on package type
  const getPackageColorClass = () => {
    switch (packageType) {
      case 'OPPORTUNITY':
        return 'bg-zinc-100';
      case 'MOMENTUM':
        return 'bg-blue-50';
      case 'PROSPER':
        return 'bg-green-50';
      case 'PRESTIGE':
        return 'bg-purple-50';
      case 'PINNACLE':
        return 'bg-amber-50';
      default:
        return 'bg-white';
    }
  };

  // Get package border color based on package type
  const getPackageBorderClass = () => {
    switch (packageType) {
      case 'OPPORTUNITY':
        return 'border-zinc-300';
      case 'MOMENTUM':
        return 'border-blue-300';
      case 'PROSPER':
        return 'border-green-300';
      case 'PRESTIGE':
        return 'border-purple-300';
      case 'PINNACLE':
        return 'border-amber-300';
      default:
        return 'border-gray-200';
    }
  };

  // Calculate end date
  const calculateEndDate = () => {
    if (!subscriptionDetails?.nextPaymentDate) return 'Not available';
    
    try {
      const date = new Date(subscriptionDetails.nextPaymentDate);
      return date.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Not available';
    }
  };

  // Format subscription status
  const formatStatus = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-500 text-white">Active</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
      case 'paused':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Paused</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <>
      <Card className={`${getPackageColorClass()} border-2 ${getPackageBorderClass()}`}>
        <CardHeader>
          <CardTitle className="flex items-center">
            <span className={`inline-block w-4 h-4 rounded-full mr-2 ${getPackageBorderClass().replace('border', 'bg')}`}></span>
            {packageType} Package
            {isCurrentPackage && (
              <span className="ml-auto text-sm bg-green-100 text-green-800 px-2 py-1 rounded-full flex items-center">
                <CheckCircle size={16} className="mr-1" /> Current
              </span>
            )}
          </CardTitle>
          <CardDescription className="text-2xl font-bold mt-2">
            R{PACKAGE_PRICES[packageType as keyof typeof PACKAGE_PRICES]}/month
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          
          <div className="space-y-2">
            <h3 className="font-semibold">Features:</h3>
            <ul className="space-y-1">
              {PACKAGE_FEATURES[packageType as keyof typeof PACKAGE_FEATURES].map((feature, index) => (
                <li key={index} className="flex items-start">
                  <CheckCircle size={16} className="mr-2 text-green-600 mt-1 flex-shrink-0" />
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          
          {isCurrentPackage && subscriptionDetails && (
            <div className="mt-6 space-y-3 border-t pt-4">
              <h3 className="font-semibold">Subscription Details</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-600">Status:</div>
                <div>
                  {formatStatus(subscriptionDetails.status)}
                </div>
                
                <div className="text-gray-600">Next payment:</div>
                <div className="flex items-center">
                  <CalendarIcon size={14} className="mr-1.5 text-gray-500" />
                  {calculateEndDate()}
                </div>
                
                <div className="text-gray-600">Amount:</div>
                <div>R{subscriptionDetails.amount}</div>
                
                <div className="text-gray-600">Billing cycle:</div>
                <div>{subscriptionDetails.plan?.interval || 'Monthly'}</div>
              </div>
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-2">
          {isLoading ? (
            <Button disabled className="w-full">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Please wait
            </Button>
          ) : showCancelButton ? (
            <>
              {/* Always show Cancel Subscription button for current package */}
              <Button variant="destructive" onClick={handleOpenCancellationDialog} className="w-full">
                Cancel Subscription
              </Button>
              <Button variant="outline" onClick={handleRequestUpdateLink} className="w-full">
                Update Payment Method
              </Button>
            </>
          ) : (
            <Button onClick={handleSubscribe} className="w-full">
              {hasSubscription ? 'Change to this Plan' : 'Subscribe Now'} 
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* Cancellation Dialog */}
      <CancellationDialog
        open={showCancellationDialog}
        onClose={() => setShowCancellationDialog(false)}
        onCancelled={handleSubscriptionCancelled}
        packageType={packageType}
      />
    </>
  );
}