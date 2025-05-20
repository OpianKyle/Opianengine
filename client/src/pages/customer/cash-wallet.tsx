import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Wallet, ArrowDownLeft, CreditCard, RefreshCw, Calendar, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import CustomerLayout from "@/components/layout/customer-layout";
import { OnboardingProvider } from "@/contexts/OnboardingContext";

type CashTransaction = {
  id: number;
  amount: number;
  description: string;
  created_at: string;
  timestamp: string;
  transaction_type?: string;
};

function CustomerCashWalletContent() {
  const { toast } = useToast();

  // Fetch cash wallet balance and transactions
  const { data: walletData, isLoading: isWalletLoading, error: walletError } = useQuery({
    queryKey: ["/api/customer/cash-wallet"],
    queryFn: async () => {
      const response = await fetch("/api/customer/cash-wallet", {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("Failed to fetch cash wallet data");
      }
      return response.json();
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (walletError) {
    toast({
      title: "Error",
      description: "Could not load cash wallet data. Please try again later.",
      variant: "destructive",
    });
  }

  // Format cash balance for display
  const formatCurrency = (amount: number) => {
    return `R${amount.toFixed(2)}`;
  };

  // Format transaction date
  const formatTransactionDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return format(date, "dd MMM yyyy, HH:mm");
    } catch (error) {
      return dateString;
    }
  };

  // Card component for cash balance
  const CashBalanceCard = () => (
    <Card className="bg-primary text-primary-foreground">
      <CardHeader>
        <CardTitle className="flex items-center text-xl md:text-2xl font-bold">
          <Wallet className="mr-2 h-6 w-6" />
          Cash Balance
        </CardTitle>
        <CardDescription className="text-primary-foreground/90">
          Your available cash wallet balance
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isWalletLoading ? (
          <Skeleton className="h-12 w-48 bg-primary-foreground/20" />
        ) : (
          <div className="flex flex-col">
            <span className="text-3xl md:text-4xl font-bold mb-2">
              {formatCurrency(walletData?.cash_balance || 0)}
            </span>
            <span className="text-xs text-primary-foreground/80">
              Last updated: {new Date().toLocaleString()}
            </span>
          </div>
        )}
      </CardContent>
      <CardFooter className="text-primary-foreground/90 text-xs flex justify-between">
        <div className="flex items-center">
          <Clock className="h-4 w-4 mr-1" />
          <span>Updated in real-time</span>
        </div>
      </CardFooter>
    </Card>
  );

  // Transaction history card
  const TransactionHistoryCard = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-xl font-bold">
          <CreditCard className="mr-2 h-5 w-5" />
          Transaction History
        </CardTitle>
        <CardDescription>
          Recent cash wallet transactions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isWalletLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : (
          <ScrollArea className="h-[300px] pr-4">
            {walletData?.transactions && walletData.transactions.length > 0 ? (
              <div className="space-y-4">
                {walletData.transactions.map((transaction: CashTransaction) => (
                  <div key={transaction.id} className="flex flex-col p-3 border rounded-lg">
                    <div className="flex justify-between items-start">
                      <div className="flex items-start space-x-2">
                        <ArrowDownLeft className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-medium leading-none">{transaction.description}</p>
                          <div className="flex items-center text-xs text-muted-foreground">
                            <Calendar className="h-3 w-3 mr-1" />
                            <span>{formatTransactionDate(transaction.timestamp || transaction.created_at)}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className="font-semibold text-green-600">
                          {formatCurrency(transaction.amount)}
                        </span>
                        <Badge variant="outline" className="text-xs mt-1">
                          {transaction.transaction_type || "Deposit"}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No transactions yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Your transaction history will appear here
                </p>
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="outline" className="w-full" disabled={isWalletLoading}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Transactions
        </Button>
      </CardFooter>
    </Card>
  );

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Cash Wallet</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <CashBalanceCard />
        </div>
        
        <div className="md:col-span-2">
          <TransactionHistoryCard />
        </div>
      </div>
      
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">About Your Cash Wallet</h2>
        <Separator className="mb-4" />
        <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-2">
          <p>Your cash wallet allows you to store and use cash earned from converted points.</p>
          <p>Cash in your wallet can be used for various transactions and redemptions within the Opian Rewards system.</p>
          <p>To convert more points to cash, please contact an administrator or use the points redemption options.</p>
        </div>
      </div>
    </div>
  );
}

// Export the wrapped component
export default function CustomerCashWallet() {
  return (
    <CustomerLayout>
      <OnboardingProvider section="cash-wallet">
        <CustomerCashWalletContent />
      </OnboardingProvider>
    </CustomerLayout>
  );
}