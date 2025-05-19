import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { CheckCircle2, Clock, DollarSign, User, Calendar, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

type Transaction = {
  id: number;
  userId: number;
  points: number;
  description: string;
  createdAt: string;
  status?: 'PENDING' | 'PROCESSED';
  processedAt?: string;
  user?: {
    firstName: string;
    lastName: string;
    email: string;
  };
  processor?: {
    firstName: string;
    lastName: string;
    email: string;
  };
};

export default function CashRedemptions() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("pending");
  
  // Updated to properly handle the API response format with cashRedemptions field
  // Added credentials option to ensure auth cookies are sent with request
  const { data, isLoading, isError, error } = useQuery<{ cashRedemptions: Transaction[] }>({
    queryKey: ["/api/admin/cash-redemptions"],
    refetchInterval: 30000, // Refresh every 30 seconds to catch new redemptions
    retry: 3,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchOnMount: true,
    onError: (err: any) => {
      console.error("Error fetching cash redemptions:", err);
      toast({
        variant: "destructive",
        title: "Error fetching redemptions",
        description: err instanceof Error ? err.message : "Unknown error",
      });
    },
    onSuccess: (data) => {
      const redemptions = data?.cashRedemptions || [];
      console.log(`Loaded ${redemptions.length} cash redemptions:`, 
        redemptions.length > 0 ? 
        {firstRedemption: redemptions[0]} : 
        "No redemptions found");
    }
  });
  
  // Extract the transactions from the response
  const transactions = data?.cashRedemptions || [];

  // Debug empty responses
  if (transactions.length === 0 && !isLoading) {
    console.log("No transactions found, but query completed successfully");
  }

  const pendingTransactions = transactions.filter(t => t.status !== 'PROCESSED');
  const processedTransactions = transactions.filter(t => t.status === 'PROCESSED');

  const markProcessedMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      const response = await fetch(`/api/admin/cash-redemptions/${transactionId}/process`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to mark redemption as processed');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/cash-redemptions"] });
      toast({
        title: "Success",
        description: "Cash redemption marked as processed",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const formatCurrency = (points: number) => {
    const amount = Math.abs(points) * 0.015;
    return `R${amount.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="space-y-6 pb-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Cash Redemptions</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
            {pendingTransactions.length} Pending
          </Badge>
          <Badge variant="outline" className="bg-green-100 text-green-800 hover:bg-green-200">
            {processedTransactions.length} Processed
          </Badge>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cash Redemption Requests</CardTitle>
          <CardDescription>
            Manage customer requests to redeem points for cash. Each point is worth R0.015.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4">
              <TabsTrigger value="pending">Pending ({pendingTransactions.length})</TabsTrigger>
              <TabsTrigger value="processed">Processed ({processedTransactions.length})</TabsTrigger>
              <TabsTrigger value="all">All ({transactions.length})</TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending">
              {renderTransactionList(pendingTransactions, formatCurrency, formatDate, markProcessedMutation, isLoading)}
            </TabsContent>
            
            <TabsContent value="processed">
              {renderTransactionList(processedTransactions, formatCurrency, formatDate, markProcessedMutation, isLoading)}
            </TabsContent>
            
            <TabsContent value="all">
              {renderTransactionList(transactions, formatCurrency, formatDate, markProcessedMutation, isLoading)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function renderTransactionList(
  transactions: Transaction[], 
  formatCurrency: (points: number) => string,
  formatDate: (date: string) => string,
  markProcessedMutation: any,
  isLoading: boolean
) {
  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin h-8 w-8 border-t-2 border-primary rounded-full" />
      </div>
    );
  }
  
  if (transactions.length === 0) {
    return (
      <div className="text-center text-muted-foreground py-8">
        <p>No redemption requests found</p>
      </div>
    );
  }
  
  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <Card key={transaction.id} className={`overflow-hidden ${transaction.status === 'PROCESSED' ? 'border-green-200' : 'border-amber-200'}`}>
            <div className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                {/* Customer details section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold">
                      {transaction.user?.firstName} {transaction.user?.lastName}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      {transaction.user?.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Requested: {formatDate(transaction.createdAt)}
                    </p>
                  </div>
                  {transaction.processedAt && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <p className="text-sm text-muted-foreground">
                        Processed: {formatDate(transaction.processedAt)}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Redemption details section */}
                <div className="flex flex-col items-end space-y-2">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-green-600" />
                    <span className="text-xl font-bold text-green-600">
                      {formatCurrency(transaction.points)}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {Math.abs(transaction.points).toLocaleString()} points
                  </p>
                  
                  {transaction.status === 'PROCESSED' ? (
                    <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                      Processed
                    </Badge>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-200 mb-2">
                        <Clock className="h-3 w-3 mr-1" /> Pending
                      </Badge>
                      <Button
                        className="bg-green-600 hover:bg-green-700"
                        size="sm"
                        onClick={() => markProcessedMutation.mutate(transaction.id)}
                        disabled={markProcessedMutation.isPending}
                      >
                        Mark as Processed
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              
              {transaction.processor && (
                <div className="mt-4 pt-3 border-t text-sm text-muted-foreground">
                  <p>Processed by: {transaction.processor.firstName} {transaction.processor.lastName} ({transaction.processor.email})</p>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}