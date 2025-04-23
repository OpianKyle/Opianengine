import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest, getQueryFn } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { useLocation } from 'wouter';

// Types for subscriptions
interface Subscription {
  id: number;
  userId: number;
  packageType: string;
  amount: number;
  paystackCustomerCode: string;
  paystackSubscriptionCode: string;
  status: 'ACTIVE' | 'CANCELLED' | 'PAST_DUE' | 'UNPAID';
  createdAt: string;
  updatedAt: string;
  lastPaymentDate: string | null;
  nextPaymentDate: string | null;
  cancelledAt: string | null;
}

const packageColors: Record<string, string> = {
  'OPPORTUNITY': 'bg-zinc-100 text-zinc-800 border-zinc-200',
  'MOMENTUM': 'bg-blue-100 text-blue-800 border-blue-200',
  'PROSPER': 'bg-green-100 text-green-800 border-green-200',
  'PRESTIGE': 'bg-purple-100 text-purple-800 border-purple-200',
  'PINNACLE': 'bg-amber-100 text-amber-800 border-amber-200',
  'TEST': 'bg-indigo-100 text-indigo-800 border-indigo-200',
};

const statusColors: Record<string, string> = {
  'ACTIVE': 'bg-green-100 text-green-800 border-green-200',
  'CANCELLED': 'bg-red-100 text-red-800 border-red-200',
  'PAST_DUE': 'bg-amber-100 text-amber-800 border-amber-200',
  'UNPAID': 'bg-slate-100 text-slate-800 border-slate-200',
};

const SubscriptionPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth(); // Use the auth hook to get user data
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'reactivate' | null>(null);
  const [showManualSyncDialog, setShowManualSyncDialog] = useState(false);
  const [customerCode, setCustomerCode] = useState('');
  const [subscriptionCode, setSubscriptionCode] = useState('');
  const [, params] = useLocation();
  
  // Check for payment reference from Paystack redirect
  useEffect(() => {
    console.log('SubscriptionPage mounted, checking URL for payment reference...');
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check for reference, trxref, and verified flag
    const reference = urlParams.get('reference') || urlParams.get('trxref');
    const verified = urlParams.get('verified');
    console.log('Full URL parameters:', Object.fromEntries(urlParams.entries()));
    
    if (reference) {
      console.log('✅ Payment reference detected in URL:', reference);
      console.log('Verified status from server callback:', verified);
      
      if (verified === 'true') {
        // The payment was already verified on the server in the callback
        console.log('✅ Payment was already verified by server in callback!');
        toast({
          title: "Payment Successful",
          description: "Your subscription payment has been processed and activated successfully.",
          variant: "default",
        });
        
        // Refresh subscription data
        console.log('Invalidating subscription queries to refresh data');
        queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
        
        // Clean up URL params after processing
        console.log('Cleaning up URL parameters');
        window.history.replaceState({}, document.title, window.location.pathname);
      } else {
        // Perform an additional verification as fallback
        const verifyPayment = async () => {
          try {
            console.log('Verifying payment with reference:', reference);
            const verifyUrl = `/api/payment/verify/${reference}`;
            console.log('Making verification request to:', verifyUrl);
            
            const response = await apiRequest('GET', verifyUrl);
            const data = await response.json();
            console.log('Payment verification response:', data);
            
            if (data.success) {
              console.log('✅ Payment verification successful');
              toast({
                title: "Payment Successful",
                description: "Your subscription payment has been processed successfully.",
                variant: "default",
              });
              
              // Refresh subscription data
              console.log('Invalidating subscription queries to refresh data');
              queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
            } else {
              console.log('❌ Payment verification failed:', data.message);
              toast({
                title: "Payment Verification Failed",
                description: data.message || "There was an issue verifying your payment. Please contact support.",
                variant: "destructive",
              });
            }
            
            // Clean up URL params after processing
            console.log('Cleaning up URL parameters');
            window.history.replaceState({}, document.title, window.location.pathname);
          } catch (error) {
            console.error('❌ Error verifying payment:', error);
            toast({
              title: "Verification Error",
              description: "Failed to verify payment. Please check your account status.",
              variant: "destructive",
            });
          }
        };
        
        verifyPayment();
      }
    } else {
      console.log('No payment reference found in URL');
    }
  }, [toast, queryClient]);

  // Fetch subscription data
  const { data: subscriptionData, isLoading, error } = useQuery({
    queryKey: ['/api/subscription'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/subscription');
      return response.json();
    },
  });
  
  // Extract subscription, packages and current package from response
  const subscription = subscriptionData?.subscription || null;
  const packages = subscriptionData?.packages || {};
  const currentPackage = subscriptionData?.currentPackage || null;
  
  // Convert to array for compatibility with existing code
  const subscriptions = subscription ? [subscription] : [];

  // Cancel subscription mutation
  const cancelMutation = useMutation({
    mutationFn: async (subscriptionId: number) => {
      const response = await apiRequest('DELETE', `/api/subscription/${subscriptionId}`);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Subscription cancelled",
        description: data.message || "Your subscription has been cancelled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
      setIsConfirmDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to cancel subscription. Please try again.",
        variant: "destructive",
      });
      console.error('Error cancelling subscription:', error);
    }
  });

  // Reactivate subscription mutation
  const reactivateMutation = useMutation({
    mutationFn: async (subscriptionId: number) => {
      const response = await apiRequest('PUT', `/api/subscription/${subscriptionId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Subscription reactivated",
        description: "Your subscription has been reactivated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
      setIsConfirmDialogOpen(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to reactivate subscription. Please try again.",
        variant: "destructive",
      });
      console.error('Error reactivating subscription:', error);
    }
  });
  
  // Sync subscription with Paystack mutation
  const syncSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('GET', `/api/subscription/sync`);
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Subscription synchronized",
          description: data.message || "Your subscription has been synchronized with Paystack.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
      } else {
        toast({
          title: "Synchronization notice",
          description: data.message || "No changes were needed for your subscription.",
        });
        
        // If there's a suggestion to use manual sync, show the manual sync dialog
        if (data.suggestion && subscription) {
          setShowManualSyncDialog(true);
        }
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to synchronize subscription with Paystack. Please try again.",
        variant: "destructive",
      });
      console.error('Error synchronizing subscription:', error);
    }
  });
  
  // Manual sync with Paystack codes
  const manualSyncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/subscription/manual-sync`, {
        customerCode,
        subscriptionCode: subscriptionCode || undefined
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Manual sync successful",
          description: data.message || "Your subscription has been manually synchronized with Paystack.",
        });
        queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
        // Reset form and close dialog
        setShowManualSyncDialog(false);
        setCustomerCode('');
        setSubscriptionCode('');
      } else {
        toast({
          title: "Sync failed",
          description: data.message || "Failed to manually sync your subscription.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to manually synchronize subscription. Please try again.",
        variant: "destructive",
      });
      console.error('Error manually synchronizing subscription:', error);
    }
  });

  // New subscription mutation
  const newSubscriptionMutation = useMutation({
    mutationFn: async (packageType: string) => {
      const response = await apiRequest('POST', '/api/subscription', { packageType });
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Subscription created",
        description: "Your subscription has been created successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/subscription'] });
      
      // Redirect to payment confirmation if needed
      if (data.redirectUrl) {
        window.location.href = data.redirectUrl;
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to create subscription. Please try again.",
        variant: "destructive",
      });
      console.error('Error creating subscription:', error);
    }
  });

  const handleConfirmAction = () => {
    if (!selectedSubscription) return;
    
    if (confirmAction === 'cancel') {
      cancelMutation.mutate(selectedSubscription.id);
    } else if (confirmAction === 'reactivate') {
      reactivateMutation.mutate(selectedSubscription.id);
    }
  };

  const openConfirmDialog = (subscription: Subscription, action: 'cancel' | 'reactivate') => {
    setSelectedSubscription(subscription);
    setConfirmAction(action);
    setIsConfirmDialogOpen(true);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading your subscriptions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="mb-6">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>
          Failed to load subscriptions. Please try again later.
        </AlertDescription>
      </Alert>
    );
  }

  const activeSubscriptions = subscriptions?.filter(sub => sub.status === 'ACTIVE') || [];
  const inactiveSubscriptions = subscriptions?.filter(sub => sub.status !== 'ACTIVE') || [];

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">My Subscriptions</h1>
      
      {/* Manual Sync Dialog */}
      <Dialog open={showManualSyncDialog} onOpenChange={setShowManualSyncDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manual Subscription Sync</DialogTitle>
            <DialogDescription>
              Enter your Paystack customer code to manually sync your subscription.
              You can find this in your Paystack dashboard or email receipts.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="customerCode" className="text-left">
                Customer Code <span className="text-red-500">*</span>
              </Label>
              <Input
                id="customerCode"
                placeholder="e.g. CUS_1hjlwa7sb0glsb1"
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                className="w-full"
                required
              />
              <p className="text-sm text-muted-foreground">
                You can find this in your Paystack email receipts or dashboard (starts with CUS_)
              </p>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="subscriptionCode" className="text-left">
                Subscription Code <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="subscriptionCode"
                placeholder="e.g. SUB_e5k8qp4op8fvuqc"
                value={subscriptionCode}
                onChange={(e) => setSubscriptionCode(e.target.value)}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                If you have multiple subscriptions, enter the specific subscription code (starts with SUB_)
              </p>
            </div>
          </div>
          
          <DialogFooter className="sm:justify-between">
            <Button 
              variant="outline" 
              onClick={() => {
                setShowManualSyncDialog(false);
                setCustomerCode('');
                setSubscriptionCode('');
              }}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              onClick={() => manualSyncMutation.mutate()}
              disabled={!customerCode || manualSyncMutation.isPending}
            >
              {manualSyncMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Syncing...
                </>
              ) : (
                'Sync Subscription'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {(!subscriptions || subscriptions.length === 0) && (
        <Alert className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>No Subscriptions</AlertTitle>
          <AlertDescription>
            You don't have any active subscriptions yet. Choose a package below to subscribe.
          </AlertDescription>
        </Alert>
      )}

      {activeSubscriptions.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mb-4">Active Subscriptions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {activeSubscriptions.map(subscription => (
              <Card key={subscription.id} className="overflow-hidden">
                <CardHeader className={packageColors[subscription.packageType] || 'bg-gray-100'}>
                  <CardTitle>{subscription.packageType} Package</CardTitle>
                  <CardDescription className="text-foreground/70">
                    {formatAmount(subscription.amount)} per month
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge variant="outline" className={statusColors[subscription.status]}>
                        {subscription.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Started on:</span>
                      <span className="text-sm font-medium">{formatDate(subscription.createdAt)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Last payment:</span>
                      <span className="text-sm font-medium">{formatDate(subscription.lastPaymentDate)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Next payment:</span>
                      <span className="text-sm font-medium">{formatDate(subscription.nextPaymentDate)}</span>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex flex-col gap-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => syncSubscriptionMutation.mutate()}
                    disabled={syncSubscriptionMutation.isPending}
                  >
                    {syncSubscriptionMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Syncing...
                      </>
                    ) : (
                      'Sync with Paystack'
                    )}
                  </Button>
                  {user?.is_admin && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => setShowManualSyncDialog(true)}
                    >
                      <Info className="mr-2 h-4 w-4" />
                      Manual Sync (Admin)
                    </Button>
                  )}
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => openConfirmDialog(subscription, 'cancel')}
                  >
                    Cancel Subscription
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}

      {inactiveSubscriptions.length > 0 && (
        <>
          <h2 className="text-xl font-semibold mb-4">Inactive Subscriptions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {inactiveSubscriptions.map(subscription => (
              <Card key={subscription.id} className="overflow-hidden opacity-75">
                <CardHeader className={packageColors[subscription.packageType] || 'bg-gray-100'}>
                  <CardTitle>{subscription.packageType} Package</CardTitle>
                  <CardDescription className="text-foreground/70">
                    {formatAmount(subscription.amount)} per month
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Status:</span>
                      <Badge variant="outline" className={statusColors[subscription.status]}>
                        {subscription.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Started on:</span>
                      <span className="text-sm font-medium">{formatDate(subscription.createdAt)}</span>
                    </div>
                    {subscription.cancelledAt && (
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Cancelled on:</span>
                        <span className="text-sm font-medium">{formatDate(subscription.cancelledAt)}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter>
                  {subscription.status === 'CANCELLED' && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => openConfirmDialog(subscription, 'reactivate')}
                    >
                      Reactivate Subscription
                    </Button>
                  )}
                  {subscription.status === 'PAST_DUE' && (
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={() => newSubscriptionMutation.mutate(subscription.packageType)}
                    >
                      Renew Subscription
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
          </div>
        </>
      )}

      <h2 className="text-xl font-semibold mb-4">Available Packages</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Object.keys(packages).map(packageType => (
          <Card key={packageType} className="overflow-hidden">
            <CardHeader className={packageColors[packageType] || 'bg-gray-100'}>
              <CardTitle>{packageType} Package</CardTitle>
              <CardDescription className="text-foreground/70">
                {formatAmount(packages[packageType]?.price || 0)} per month
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-muted-foreground mb-4">
                Subscribe to our {packageType} package to access premium features and earn rewards.
              </p>
              {packageType === 'OPPORTUNITY' && (
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Basic account features</li>
                  <li>Standard support</li>
                  <li>Earn points on activities</li>
                </ul>
              )}
              {packageType === 'MOMENTUM' && (
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>All Opportunity features</li>
                  <li>Enhanced earning rates</li>
                  <li>Priority support</li>
                </ul>
              )}
              {packageType === 'PROSPER' && (
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>All Momentum features</li>
                  <li>Referral program access</li>
                  <li>Premium rewards</li>
                </ul>
              )}
              {packageType === 'PRESTIGE' && (
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>All Prosper features</li>
                  <li>VIP support</li>
                  <li>Exclusive rewards</li>
                </ul>
              )}
              {packageType === 'PINNACLE' && (
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>All Prestige features</li>
                  <li>Highest earning potential</li>
                  <li>Exclusive VIP events</li>
                </ul>
              )}
              {packageType === 'TEST' && (
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>Test package for development</li>
                  <li>All premium features available</li>
                  <li>Minimal cost for testing</li>
                </ul>
              )}
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full"
                onClick={() => newSubscriptionMutation.mutate(packageType)}
                disabled={newSubscriptionMutation.isPending}
              >
                {newSubscriptionMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>Subscribe</>
                )}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={isConfirmDialogOpen} onOpenChange={setIsConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {confirmAction === 'cancel' ? 'Cancel Subscription?' : 'Reactivate Subscription?'}
            </DialogTitle>
            <DialogDescription>
              {confirmAction === 'cancel' 
                ? 'Are you sure you want to cancel this subscription? You will lose access to premium features.'
                : 'Are you sure you want to reactivate this subscription? You will be billed for the next payment period.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsConfirmDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              variant={confirmAction === 'cancel' ? 'destructive' : 'default'}
              onClick={handleConfirmAction}
              disabled={cancelMutation.isPending || reactivateMutation.isPending}
            >
              {(cancelMutation.isPending || reactivateMutation.isPending) ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                confirmAction === 'cancel' ? 'Confirm Cancellation' : 'Confirm Reactivation'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionPage;