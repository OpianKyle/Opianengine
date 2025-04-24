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
import { AlertCircle, CheckCircle, ArrowRight, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
  const { toast } = useToast();
  const { user } = useAuth();

  // Check if user is on this package already
  const isCurrentPackage = 
    user?.subscription_status === 'active' && 
    user?.selectedPackage === packageType;

  // Check if subscription data is available
  const hasSubscription = !!user?.paystack_subscription_code;

  // Fetch subscription details if available
  useEffect(() => {
    if (hasSubscription && isCurrentPackage) {
      fetchSubscriptionDetails();
    }
  }, [hasSubscription, isCurrentPackage]);

  // Fetch subscription details from the server
  const fetchSubscriptionDetails = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/subscription/details');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to fetch subscription details');
      }
      
      setSubscriptionDetails(data.subscription);
    } catch (error: any) {
      setError(error.message || 'An error occurred while fetching subscription details');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize subscription
  const handleSubscribe = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/subscription/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ packageType }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to initialize subscription');
      }
      
      // Redirect to Paystack checkout page
      window.location.href = data.authorization_url;
    } catch (error: any) {
      setError(error.message || 'An error occurred while setting up subscription');
      toast({
        title: 'Subscription Error',
        description: error.message || 'Failed to set up subscription',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Cancel subscription
  const handleCancel = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel subscription');
      }
      
      toast({
        title: 'Subscription Cancelled',
        description: 'Your subscription has been successfully cancelled',
      });
      
      if (onCancel) {
        onCancel();
      }
      
      // Refresh subscription details
      fetchSubscriptionDetails();
    } catch (error: any) {
      setError(error.message || 'An error occurred while cancelling subscription');
      toast({
        title: 'Cancellation Error',
        description: error.message || 'Failed to cancel subscription',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Reactivate subscription
  const handleReactivate = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/subscription/reactivate', {
        method: 'POST',
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reactivate subscription');
      }
      
      toast({
        title: 'Subscription Reactivated',
        description: 'Your subscription has been successfully reactivated',
      });
      
      if (onSuccess) {
        onSuccess();
      }
      
      // Refresh subscription details
      fetchSubscriptionDetails();
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

  return (
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
              <div className={subscriptionDetails.status === 'active' ? 'text-green-600 font-medium' : 'text-amber-600 font-medium'}>
                {subscriptionDetails.status === 'active' ? 'Active' : 'Inactive'}
              </div>
              
              <div className="text-gray-600">Next payment:</div>
              <div>{calculateEndDate()}</div>
              
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
        ) : isCurrentPackage ? (
          user?.subscription_status === 'active' ? (
            <Button variant="destructive" onClick={handleCancel} className="w-full">
              Cancel Subscription
            </Button>
          ) : (
            <Button onClick={handleReactivate} className="w-full">
              Reactivate Subscription
            </Button>
          )
        ) : (
          <Button onClick={handleSubscribe} className="w-full">
            {hasSubscription ? 'Change to this Plan' : 'Subscribe Now'} 
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}