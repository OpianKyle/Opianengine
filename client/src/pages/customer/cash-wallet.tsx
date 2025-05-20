import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import CustomerLayout from '@/components/layout/customer-layout';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCaption, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Skeleton 
} from '@/components/ui/skeleton';
import { 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  AlertCircle,
  Award
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { getQueryFn, queryClient } from '@/lib/queryClient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AnimatedMetric from '@/components/shared/animated-metric';

// Define the cash wallet data structure
interface CashWalletData {
  cash_balance: number;
  transactions: Transaction[];
}

interface Transaction {
  id: number;
  user_id: number;
  amount: number;
  description: string;
  created_at: string;
  timestamp: string;
  transaction_type: 'CREDIT' | 'DEBIT';
}

export default function CashWalletPage() {
  const { toast } = useToast();
  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  
  // Fetch cash wallet data
  const { 
    data: walletData,
    isLoading,
    isError,
    error
  } = useQuery<CashWalletData>({
    queryKey: ['/api/customer/cash-wallet'],
    queryFn: getQueryFn(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    onError: (err: Error) => {
      toast({
        title: 'Error fetching cash wallet data',
        description: err.message,
        variant: 'destructive',
      });
    }
  });
  
  // Fetch user points data
  const { data: userPoints, isLoading: isPointsLoading } = useQuery({
    queryKey: ['/api/customer/points'],
    queryFn: getQueryFn(),
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
  
  // Cash redemption mutation
  const redeemCashMutation = useMutation({
    mutationFn: async (points: number) => {
      const res = await fetch('/api/rewards/redeem-cash', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ points }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/customer/points'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/transactions'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/cash-wallet'] });
      toast({
        title: 'Success',
        description: `Successfully redeemed R${(pointsToRedeem * 0.015).toFixed(2)}`,
      });
      setPointsToRedeem(0);
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Get transaction icon based on type
  const getTransactionIcon = (type: string) => {
    if (type === 'CREDIT') {
      return <ArrowDownLeft className="h-4 w-4 text-green-500" />;
    }
    return <ArrowUpRight className="h-4 w-4 text-red-500" />;
  };

  return (
    <CustomerLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold tracking-tight">Cash Wallet</h1>
        
        <p className="text-muted-foreground">
          View your cash balance and transaction history. Cash earned through rewards can be used for various Opian services.
        </p>
        
        {isLoading ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-1/4" />
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <Skeleton className="h-8 w-1/3" />
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : isError ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {error?.message || 'Failed to load cash wallet data. Please try again later.'}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {/* Cash Balance Card */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-md font-medium">
                    Available Cash Balance
                  </CardTitle>
                  <Wallet className="h-5 w-5 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">
                    {formatCurrency(walletData?.cash_balance || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {walletData?.transactions && walletData.transactions.length > 0 
                      ? `Updated ${formatDate(new Date(walletData.transactions[0].timestamp))}` 
                      : 'No recent activity'}
                  </p>
                </CardContent>
              </Card>
              
              {/* Cash Redemption Card */}
              <Card className="md:col-span-1 lg:col-span-2">
                <CardHeader className="border-b border-border/40">
                  <CardTitle className="flex items-center gap-2 text-primary-700 dark:text-primary-300 font-semibold">
                    Cash Redemption
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {isPointsLoading ? (
                    <>
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                      <Skeleton className="h-10 w-full" />
                    </>
                  ) : (
                    <>
                      <AnimatedMetric 
                        title="Cash Value"
                        value={(userPoints?.points || 0) * 0.015}
                        prefix="R"
                        formatter={(val) => val.toFixed(2)}
                        description="Current points exchange rate: 1 point = R0.015"
                        isLoading={isPointsLoading}
                        delay={250}
                        colorScheme="success"
                        className="mb-4 -mt-4 p-0"
                      />
                      <div className="space-y-2 mt-4">
                        <label className="text-sm font-medium">Points to Redeem</label>
                        <Input
                          type="number"
                          min="0"
                          max={userPoints?.points || 0}
                          value={pointsToRedeem}
                          onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                          placeholder="Enter points amount"
                        />
                        {pointsToRedeem > 0 && (
                          <p className="text-sm font-medium mt-2">
                            You will receive: <span className="text-green-500">R{(pointsToRedeem * 0.015).toFixed(2)}</span>
                          </p>
                        )}
                      </div>
                      <Button
                        className="w-full mt-2"
                        onClick={() => redeemCashMutation.mutate(pointsToRedeem)}
                        disabled={!pointsToRedeem || pointsToRedeem <= 0 || pointsToRedeem > (userPoints?.points || 0)}
                      >
                        Redeem for Cash
                      </Button>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Transaction History</CardTitle>
                <CardDescription>
                  A record of all cash deposits and withdrawals in your account.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {walletData?.transactions && walletData.transactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {walletData.transactions.map((transaction: Transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getTransactionIcon(transaction.transaction_type)}
                              <span>
                                {transaction.transaction_type === 'CREDIT' ? 'Deposit' : 'Withdrawal'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>{formatDate(new Date(transaction.timestamp))}</TableCell>
                          <TableCell className={`text-right ${
                            transaction.transaction_type === 'CREDIT' 
                              ? 'text-green-600' 
                              : 'text-red-600'
                          }`}>
                            {transaction.transaction_type === 'CREDIT' ? '+' : '-'}
                            {formatCurrency(Math.abs(transaction.amount))}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="py-6 text-center">
                    <p className="text-muted-foreground">No transactions found. Your transaction history will appear here.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </CustomerLayout>
  );
}