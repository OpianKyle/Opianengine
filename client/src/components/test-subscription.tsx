import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Loader2, TestTube, PlayCircle, XCircle, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

type TestSubscriptionStatus = 'idle' | 'loading' | 'success' | 'error';
type TestStep = 'create' | 'cancel';

export default function TestSubscriptionTool() {
  const { toast } = useToast();
  const { token } = useAuth();
  
  const [email, setEmail] = useState('kylem@opianfsgroup.com'); // Default to a user with auth
  const [subscriptionId, setSubscriptionId] = useState('');
  const [customerCode, setCustomerCode] = useState('');
  const [status, setStatus] = useState<TestSubscriptionStatus>('idle');
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TestStep>('create');

  const handleCreateSubscription = async () => {
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to create a test subscription.",
        variant: "destructive",
      });
      return;
    }

    try {
      setStatus('loading');
      setError(null);
      
      const response = await fetch('/api/test/subscription/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to create test subscription');
      }

      setResult(data);
      setSubscriptionId(data.subscription?.id || '');
      setCustomerCode(data.customer?.customer_code || '');
      setStatus('success');
      
      toast({
        title: "Test Subscription Created",
        description: "Test subscription has been created successfully.",
      });
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'An unknown error occurred');
      
      toast({
        title: "Subscription Creation Failed",
        description: err.message || 'Failed to create test subscription',
        variant: "destructive",
      });
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscriptionId.trim()) {
      toast({
        title: "Subscription ID Required",
        description: "Please enter a subscription ID or subscription code to cancel.",
        variant: "destructive",
      });
      return;
    }

    try {
      setStatus('loading');
      setError(null);
      
      const response = await fetch('/api/test/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscription_id: subscriptionId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to cancel subscription');
      }

      setResult(data);
      setStatus('success');
      
      toast({
        title: "Subscription Cancelled",
        description: "Test subscription has been cancelled successfully.",
      });
    } catch (err: any) {
      setStatus('error');
      setError(err.message || 'An unknown error occurred');
      
      toast({
        title: "Cancellation Failed",
        description: err.message || 'Failed to cancel subscription',
        variant: "destructive",
      });
    }
  };

  const renderStatusIcon = () => {
    switch (status) {
      case 'loading':
        return <Loader2 className="h-5 w-5 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <TestTube className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {renderStatusIcon()}
          Test Subscription Tools
        </CardTitle>
        <CardDescription>
          Create and cancel test subscriptions to verify Paystack integration
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TestStep)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="create">Create Subscription</TabsTrigger>
            <TabsTrigger value="cancel">Cancel Subscription</TabsTrigger>
          </TabsList>
          
          <TabsContent value="create" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={status === 'loading'}
                />
              </div>

              <Button 
                onClick={handleCreateSubscription}
                disabled={status === 'loading'}
                className="w-full"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <PlayCircle className="mr-2 h-4 w-4" />
                    Create Test Subscription
                  </>
                )}
              </Button>
            </div>

            {status === 'success' && activeTab === 'create' && result && (
              <div className="mt-4 p-4 border rounded-md bg-green-50/50">
                <h3 className="font-medium flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Subscription Created Successfully
                </h3>
                <div className="grid gap-2 mt-2">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="font-medium">Subscription ID:</span>
                    <span className="col-span-2">{result.subscription?.id || 'N/A'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="font-medium">Subscription Code:</span>
                    <span className="col-span-2">{result.subscription?.subscription_code || 'N/A'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="font-medium">Email Token:</span>
                    <span className="col-span-2">{result.subscription?.email_token || 'N/A'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="font-medium">Customer Code:</span>
                    <span className="col-span-2">{result.customer?.customer_code || 'N/A'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="font-medium">Plan Code:</span>
                    <span className="col-span-2">{result.subscription?.plan?.plan_code || 'N/A'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="font-medium">Status:</span>
                    <span className="col-span-2">{result.subscription?.status || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {status === 'error' && activeTab === 'create' && error && (
              <div className="mt-4 p-4 border rounded-md bg-red-50/50">
                <h3 className="font-medium flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Error Creating Subscription
                </h3>
                <p className="text-sm text-red-600">{error}</p>
                
                {(error.includes("no saved authorizations") || error.includes("no payment authorizations")) && (
                  <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-amber-800 text-xs">
                    <strong>Note:</strong> Paystack requires a customer to have a saved payment method before subscribing.
                    <br /><br />
                    For test purposes, please use the email <strong>kylem@opianfsgroup.com</strong> which already 
                    has a test authorization set up.
                    <br /><br />
                    If you're still seeing this error with kylem@opianfsgroup.com, the saved authorization may have 
                    expired or been removed. You'll need to make a test payment with this email first.
                  </div>
                )}
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="cancel" className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="subscription_id">Subscription ID or Code</Label>
                <Input
                  id="subscription_id"
                  type="text"
                  placeholder="Enter database ID or Paystack subscription code"
                  value={subscriptionId}
                  onChange={(e) => setSubscriptionId(e.target.value)}
                  disabled={status === 'loading'}
                />
                <p className="text-xs text-muted-foreground">
                  You can enter either the database ID (number) or the Paystack subscription code (e.g. SUB_xxxxxxxx)
                </p>
              </div>

              <Button 
                onClick={handleCancelSubscription}
                disabled={status === 'loading'}
                className="w-full"
                variant="destructive"
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  <>
                    <XCircle className="mr-2 h-4 w-4" />
                    Cancel Subscription
                  </>
                )}
              </Button>
            </div>

            {status === 'success' && activeTab === 'cancel' && result && (
              <div className="mt-4 p-4 border rounded-md bg-green-50/50">
                <h3 className="font-medium flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Subscription Cancelled Successfully
                </h3>
                <div className="grid gap-2 mt-2">
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="font-medium">Subscription ID:</span>
                    <span className="col-span-2">{result.subscription_id || 'N/A'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="font-medium">Subscription Code:</span>
                    <span className="col-span-2">{result.subscription_code || 'N/A'}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-sm">
                    <span className="font-medium">Status:</span>
                    <span className="col-span-2">{result.status || 'N/A'}</span>
                  </div>
                </div>
              </div>
            )}

            {status === 'error' && activeTab === 'cancel' && error && (
              <div className="mt-4 p-4 border rounded-md bg-red-50/50">
                <h3 className="font-medium flex items-center gap-2 mb-2">
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  Error Cancelling Subscription
                </h3>
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}