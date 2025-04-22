import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { CircleDollarSign, CreditCard, CheckCircle2, AlertCircle, ArrowRight, RefreshCw } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/utils';
import { useUser } from '@/hooks/use-user';

const PaymentPage: React.FC = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isLoading: userLoading } = useUser();
  const [amount, setAmount] = useState<string>('');
  const [transactionReference, setTransactionReference] = useState<string | null>(null);
  const [paymentStep, setPaymentStep] = useState<'input' | 'processing' | 'success' | 'failed'>('input');

  // Fetch user's transaction history
  const { data: transactions, isLoading: transactionsLoading } = useQuery({
    queryKey: ['/api/payment/transactions'],
    queryFn: async () => {
      const response = await fetch('/api/payment/transactions');
      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }
      const data = await response.json();
      return data.data;
    },
    enabled: !!user
  });

  // Initialize payment mutation
  const initializePayment = useMutation({
    mutationFn: async (amount: number) => {
      const response = await fetch('/api/payment/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          amount,
          purpose: 'Account funding'
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to initialize payment');
      }
      
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.data.authorization_url) {
        setTransactionReference(data.data.reference);
        // Open Paystack payment page in a new window
        window.open(data.data.authorization_url, '_blank');
        setPaymentStep('processing');
      } else {
        toast({
          variant: 'destructive',
          title: 'Payment initialization failed',
          description: data.message || 'Could not start payment process'
        });
      }
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Payment initialization failed',
        description: error.message
      });
    }
  });

  // Verify payment mutation
  const verifyPayment = useMutation({
    mutationFn: async (reference: string) => {
      const response = await fetch(`/api/payment/verify/${reference}`);
      if (!response.ok) {
        throw new Error('Failed to verify payment');
      }
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        setPaymentStep('success');
        toast({
          title: 'Payment successful',
          description: `Your account has been funded with ${formatCurrency(data.data.amount)}`,
        });
        // Refresh user data to show updated balance
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/payment/transactions'] });
      } else {
        setPaymentStep('failed');
        toast({
          variant: 'destructive',
          title: 'Payment verification failed',
          description: data.message || 'Could not verify your payment'
        });
      }
    },
    onError: (error) => {
      setPaymentStep('failed');
      toast({
        variant: 'destructive',
        title: 'Payment verification failed',
        description: error.message
      });
    }
  });

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Allow only numbers
    const value = e.target.value.replace(/[^0-9]/g, '');
    setAmount(value);
  };

  const handlePaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const numericAmount = parseFloat(amount);
    
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast({
        variant: 'destructive',
        title: 'Invalid amount',
        description: 'Please enter a valid amount'
      });
      return;
    }
    
    if (numericAmount < 50) {
      toast({
        variant: 'destructive',
        title: 'Amount too low',
        description: 'Minimum funding amount is R50'
      });
      return;
    }
    
    initializePayment.mutate(numericAmount);
  };

  const handleVerifyPayment = () => {
    if (transactionReference) {
      verifyPayment.mutate(transactionReference);
    }
  };

  const handleResetPayment = () => {
    setAmount('');
    setTransactionReference(null);
    setPaymentStep('input');
  };

  // Loading state when user data is being fetched
  if (userLoading) {
    return (
      <div className="container max-w-4xl py-8">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-12 w-full mb-4" />
            <Skeleton className="h-10 w-24 mt-4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <h1 className="text-3xl font-bold mb-6">Payments</h1>
      
      <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
        {/* Wallet Card */}
        <Card className="col-span-1 md:col-span-3 bg-gradient-to-r from-blue-600 to-blue-800 text-white">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CircleDollarSign className="mr-2" /> My Wallet
            </CardTitle>
            <CardDescription className="text-blue-100">
              Your current balance and funding options
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
              <div>
                <p className="text-sm text-blue-100 mb-1">Current Balance:</p>
                <p className="text-3xl font-bold">
                  {formatCurrency(user?.wallet_balance || 0)}
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <p className="text-sm text-blue-100 mb-1">Points Balance:</p>
                <p className="text-2xl font-bold">
                  {user?.points || 0} pts
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Fund Wallet Card */}
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Add Funds</CardTitle>
            <CardDescription>
              Fund your wallet using Paystack secure payment gateway
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paymentStep === 'input' && (
              <form onSubmit={handlePaymentSubmit}>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (ZAR)</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R</span>
                      <Input
                        id="amount"
                        placeholder="0.00"
                        value={amount}
                        onChange={handleAmountChange}
                        className="pl-8"
                      />
                    </div>
                    <p className="text-sm text-gray-500">Minimum amount: R50</p>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="mt-4 w-full bg-green-500 hover:bg-green-600"
                  disabled={initializePayment.isPending}
                >
                  {initializePayment.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="mr-2 h-4 w-4" /> Proceed to Payment
                    </>
                  )}
                </Button>
              </form>
            )}

            {paymentStep === 'processing' && (
              <div className="space-y-4">
                <Alert className="bg-blue-50 border-blue-200">
                  <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
                  <AlertTitle className="text-blue-700">Payment in progress</AlertTitle>
                  <AlertDescription className="text-blue-600">
                    Complete the payment in the opened window. Once done, click the verify button below.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Button onClick={handleVerifyPayment} disabled={verifyPayment.isPending}>
                    {verifyPayment.isPending ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Verifying...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" /> Verify Payment
                      </>
                    )}
                  </Button>
                  <Button variant="outline" onClick={handleResetPayment}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {paymentStep === 'success' && (
              <div className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle className="text-green-700">Payment successful!</AlertTitle>
                  <AlertDescription className="text-green-600">
                    Your payment was successful. Your wallet has been updated.
                  </AlertDescription>
                </Alert>
                <Button onClick={handleResetPayment}>Make Another Payment</Button>
              </div>
            )}

            {paymentStep === 'failed' && (
              <div className="space-y-4">
                <Alert className="bg-red-50 border-red-200">
                  <AlertCircle className="h-4 w-4 text-red-500" />
                  <AlertTitle className="text-red-700">Payment failed</AlertTitle>
                  <AlertDescription className="text-red-600">
                    Your payment was not successful. Please try again or contact support.
                  </AlertDescription>
                </Alert>
                <Button onClick={handleResetPayment}>Try Again</Button>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col items-start border-t pt-4">
            <p className="text-sm text-gray-500">
              Payments are securely processed via Paystack. Your payment details are not stored on our servers.
            </p>
          </CardFooter>
        </Card>

        {/* Quick Options */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Fund</CardTitle>
            <CardDescription>
              Select an amount to fund
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2">
            {[100, 200, 500, 1000].map((quickAmount) => (
              <Button 
                key={quickAmount} 
                variant="outline" 
                className="justify-between w-full"
                onClick={() => {
                  setAmount(quickAmount.toString());
                  if (paymentStep !== 'input') {
                    setPaymentStep('input');
                  }
                }}
              >
                {formatCurrency(quickAmount)}
                <ArrowRight className="h-4 w-4" />
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Transaction History */}
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Transaction History</h2>
        
        {transactionsLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : transactions && transactions.length > 0 ? (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Date</th>
                      <th className="text-left py-3 px-4">Description</th>
                      <th className="text-right py-3 px-4">Amount</th>
                      <th className="text-right py-3 px-4">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((transaction: any) => {
                      // Parse metadata if it exists
                      let metadata;
                      try {
                        metadata = transaction.metadata ? JSON.parse(transaction.metadata) : null;
                      } catch (e) {
                        metadata = null;
                      }
                      
                      // Determine transaction amount from metadata or points
                      const amount = metadata?.amount || (transaction.points ? transaction.points : 0);
                      
                      return (
                        <tr key={transaction.id} className="border-b">
                          <td className="py-3 px-4">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-3 px-4">{transaction.description}</td>
                          <td className="py-3 px-4 text-right">
                            {transaction.type === 'FUNDING' || transaction.type === 'FUNDING_FAILED' 
                              ? formatCurrency(amount)
                              : `${transaction.points} pts`}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`inline-block rounded-full px-2 py-1 text-xs font-semibold ${
                              transaction.type === 'FUNDING' 
                                ? 'bg-green-100 text-green-800' 
                                : transaction.type === 'FUNDING_FAILED'
                                ? 'bg-red-100 text-red-800'
                                : transaction.type === 'EARNED'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {transaction.type}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Alert>
            <AlertDescription>
              No transaction history found.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
};

export default PaymentPage;