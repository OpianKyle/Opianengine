import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Wallet, ArrowDownCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest } from '@/lib/queryClient';

interface CashDeposit {
  id: number;
  points: number;
  description: string;
  created_at: string;
  cashValue: number;
}

export default function CashDepositsPage() {
  const [isClient, setIsClient] = useState(false);

  // Use useEffect to handle SSR hydration
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch cash deposits data
  const { data, isLoading, error } = useQuery({
    queryKey: ['/api/customer/cash-deposits'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/customer/cash-deposits');
      
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch cash deposits');
      }
      
      return res.json();
    }
  });

  // Handle loading state
  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl md:text-3xl font-bold">Cash Deposits</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  // Handle error state
  if (error) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl md:text-3xl font-bold">Cash Deposits</h1>
        <Card className="border-destructive">
          <CardContent className="pt-6">
            <div className="text-destructive font-medium">Error loading cash deposits</div>
            <p className="text-sm text-muted-foreground mt-2">
              {error instanceof Error ? error.message : 'An unknown error occurred'}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Format the data for display
  const deposits = data?.deposits || [];
  const totalPoints = data?.totalPoints || 0;
  const totalCashValue = data?.totalCashValue || 0;

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl md:text-3xl font-bold">Cash Deposits</h1>
        <Badge variant="outline" className="text-sm py-1 px-3 font-medium">
          Exchange Rate: R0.015 / point
        </Badge>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash Points</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPoints.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Points available in your cash wallet
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cash Value</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCashValue)}</div>
            <p className="text-xs text-muted-foreground">
              Total Rand value of your cash points
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deposits Table */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Deposit History</CardTitle>
        </CardHeader>
        <CardContent>
          {deposits.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-center">
              <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">No cash deposits yet</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-2">
                When cash deposits are added to your wallet, they will appear here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Points</TableHead>
                    <TableHead className="text-right">Cash Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deposits.map((deposit: CashDeposit) => (
                    <TableRow key={deposit.id}>
                      <TableCell className="whitespace-nowrap">
                        {isClient ? formatDate(deposit.created_at) : ''}
                      </TableCell>
                      <TableCell>{deposit.description}</TableCell>
                      <TableCell className="text-right">{deposit.points.toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(deposit.cashValue)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}