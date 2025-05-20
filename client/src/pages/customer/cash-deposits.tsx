import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Wallet, ArrowDownCircle, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { useProfile } from '@/hooks/use-profile';

interface CashDeposit {
  id: number;
  points: number;
  description: string;
  created_at: string;
  cashValue: number;
}

export default function CashDepositsPage() {
  const [isClient, setIsClient] = useState(false);
  const [pointsToAllocate, setPointsToAllocate] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: profileData } = useProfile();
  
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
        const errorData = await res.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || 'Failed to fetch cash deposits');
      }
      
      return res.json();
    }
  });
  
  // Mutation for allocating points to cash deposits
  const allocateMutation = useMutation({
    mutationFn: async ({ points, description }: { points: number, description: string }) => {
      const res = await apiRequest('POST', '/api/customer/cash-deposits/allocate', {
        points,
        description
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || 'Failed to allocate points');
      }
      
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: 'Points Allocated',
        description: `Successfully allocated points to your cash wallet.`,
        variant: 'default',
      });
      
      // Reset form
      setPointsToAllocate('');
      setDescription('');
      
      // Refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/customer/cash-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/profile'] });
      queryClient.invalidateQueries({ queryKey: ['/api/transactions'] });
    },
    onError: (error) => {
      toast({
        title: 'Allocation Failed',
        description: error instanceof Error ? error.message : 'Failed to allocate points',
        variant: 'destructive',
      });
    }
  });
  
  const handleAllocate = () => {
    // Validate input
    const points = Number(pointsToAllocate);
    if (isNaN(points) || points <= 0) {
      toast({
        title: 'Invalid Points',
        description: 'Please enter a valid number of points greater than zero.',
        variant: 'destructive',
      });
      return;
    }
    
    // Check if user has enough points
    const availablePoints = profileData?.points || 0;
    if (points > availablePoints) {
      toast({
        title: 'Insufficient Points',
        description: `You only have ${availablePoints.toLocaleString()} points available.`,
        variant: 'destructive',
      });
      return;
    }
    
    // Execute the mutation
    allocateMutation.mutate({ 
      points, 
      description: description || 'Points allocated to cash deposits'
    });
  };

  // Calculate preview value
  const previewCashValue = () => {
    const points = Number(pointsToAllocate);
    if (isNaN(points) || points <= 0) return formatCurrency(0);
    return formatCurrency(points * 0.015);
  };

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
  const availablePoints = profileData?.points || 0;

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
      
      {/* Points Allocation Card */}
      <Card>
        <CardHeader>
          <CardTitle>Allocate Points to Cash Wallet</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="pointsToAllocate">Points to Allocate</Label>
              <div className="flex items-center mt-1.5 gap-2">
                <Input
                  id="pointsToAllocate"
                  type="number"
                  placeholder="Enter points amount"
                  value={pointsToAllocate}
                  onChange={(e) => setPointsToAllocate(e.target.value)}
                />
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
                <div className="text-sm font-medium">
                  {previewCashValue()}
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                You have {availablePoints.toLocaleString()} points available
              </p>
            </div>
            
            <div>
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                placeholder="Add a note for this allocation"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1.5"
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button 
            onClick={handleAllocate}
            disabled={!pointsToAllocate || Number(pointsToAllocate) <= 0 || Number(pointsToAllocate) > availablePoints || allocateMutation.isPending}
          >
            {allocateMutation.isPending ? 'Allocating...' : 'Allocate Points'}
          </Button>
        </CardFooter>
      </Card>

      <Separator />

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