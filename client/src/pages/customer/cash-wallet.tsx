import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  AlertCircle 
} from 'lucide-react';
import { formatDate } from '@/lib/utils';
import { getQueryFn } from '@/lib/queryClient';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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