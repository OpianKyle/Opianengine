import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

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
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'reactivate' | null>(null);

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
    onSuccess: () => {
      toast({
        title: "Subscription cancelled",
        description: "Your subscription has been cancelled successfully.",
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
                <CardFooter>
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