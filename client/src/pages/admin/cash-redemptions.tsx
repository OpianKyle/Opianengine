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
  
  // Use test endpoint during development
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["/api/test/cash-redemptions"],
    queryFn: async () => {
      const response = await fetch("/api/test/cash-redemptions", {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json"
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error ${response.status}: ${errorText}`);
        throw new Error(`Failed to fetch cash redemptions: ${response.status}`);
      }
      
      const result = await response.json();
      console.log("API response:", result);
      return result as { cashRedemptions: Transaction[] };
    },
    refetchInterval: 30000, // Refresh every 30 seconds to catch new redemptions
    retry: 3,
    refetchOnWindowFocus: true,
    staleTime: 1000 * 60 * 5 // 5 minutes
  });
  
  // Extract the transactions from the response
  const transactions = data?.cashRedemptions || [];

  // Debug empty responses
  if (transactions.length === 0 && !isLoading) {
    console.log("No transactions found, but query completed successfully");
  }

  const pendingTransactions = transactions.filter((t) => t.status !== 'PROCESSED');
  const processedTransactions = transactions.filter((t) => t.status === 'PROCESSED');

  const markProcessedMutation = useMutation({
    mutationFn: async (transactionId: number) => {
      const response = await fetch(`/api/admin/cash-redemptions/${transactionId}/process`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          "Content-Type": "application/json"
        }
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
        title: "Failed to process redemption",
        description: error.message
      });
    }
  });

  const handleMarkProcessed = (transactionId: number) => {
    markProcessedMutation.mutate(transactionId);
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Cash Redemptions</CardTitle>
            <CardDescription>
              Loading cash redemption requests...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center h-40">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render error state
  if (isError) {
    return (
      <div className="container mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle>Error Loading Cash Redemptions</CardTitle>
            <CardDescription>
              There was a problem loading the cash redemption data.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-red-500">
              {error instanceof Error ? error.message : 'Unknown error occurred'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Cash Redemptions</CardTitle>
          <CardDescription>
            Manage customer cash redemption requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="pending">
                Pending ({pendingTransactions.length})
              </TabsTrigger>
              <TabsTrigger value="processed">
                Processed ({processedTransactions.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="pending">
              {renderTransactionList(pendingTransactions, true, handleMarkProcessed)}
            </TabsContent>
            
            <TabsContent value="processed">
              {renderTransactionList(processedTransactions, false)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function renderTransactionList(
  transactions: Transaction[], 
  showActions: boolean,
  onMarkProcessed?: (id: number) => void
) {
  console.log("Transactions to render:", transactions);
  
  if (transactions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No redemption requests found
      </div>
    );
  }

  return (
    <ScrollArea className="h-[600px] pr-4">
      <div className="space-y-4">
        {transactions.map((transaction) => (
          <Card key={transaction.id} className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-medium text-lg flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-yellow-500" />
                    Cash Redemption: R{(Math.abs(transaction.points) * 0.015).toFixed(2)} ({Math.abs(transaction.points).toLocaleString()} points)
                  </h3>
                  <Badge variant={transaction.status === 'PROCESSED' ? "outline" : "default"}>
                    {transaction.status === 'PROCESSED' ? (
                      <><CheckCircle2 className="h-3 w-3 mr-1" /> Processed</>
                    ) : (
                      <><Clock className="h-3 w-3 mr-1" /> Pending</>
                    )}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    <span>{transaction.user?.firstName} {transaction.user?.lastName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{transaction.user?.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Requested: {new Date(transaction.createdAt).toLocaleString()}</span>
                  </div>
                  
                  {transaction.status === 'PROCESSED' && transaction.processedAt && (
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>Processed: {new Date(transaction.processedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
                
                {showActions && onMarkProcessed && (
                  <div className="mt-2">
                    <Button 
                      onClick={() => onMarkProcessed(transaction.id)}
                      size="sm"
                    >
                      Mark as Processed
                    </Button>
                  </div>
                )}

                {transaction.status === 'PROCESSED' && transaction.processor && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    Processed by: {transaction.processor.firstName} {transaction.processor.lastName}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </ScrollArea>
  );
}