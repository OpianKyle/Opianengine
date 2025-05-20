import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Wallet, ArrowDownCircle, ArrowRight, AlertCircle, BanknoteIcon, InfoIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest } from '@/lib/queryClient';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface CashDeposit {
  id: number;
  points: number;
  description: string;
  created_at: string;
  cashValue: number;
}

interface CashRedemption {
  id: number;
  points: number;
  cashAmount: number;
  status: 'PENDING' | 'PROCESSED';
  created_at: string;
  processed_at: string | null;
}

export default function CashDepositsPage() {
  const [isClient, setIsClient] = useState(false);
  const [pointsToAllocate, setPointsToAllocate] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [withdrawDialogOpen, setWithdrawDialogOpen] = useState(false);
  const [bankDetails, setBankDetails] = useState<string>('');
  const [withdrawalNotes, setWithdrawalNotes] = useState<string>('');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // Fetch user profile data for available points
  const { data: profileData, isLoading: profileLoading } = useQuery({
    queryKey: ['/api/customer/profile'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/customer/profile');
      if (!res.ok) {
        throw new Error('Failed to fetch profile data');
      }
      return res.json();
    },
    staleTime: 30000 // 30 seconds
  });
  
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
  
  // Mutation for withdrawal requests
  const withdrawalMutation = useMutation({
    mutationFn: async ({ bankDetails, notes }: { bankDetails: string, notes?: string }) => {
      const res = await apiRequest('POST', '/api/customer/cash-redemptions/request', {
        bankDetails,
        notes
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to parse error response' }));
        throw new Error(errorData.error || 'Failed to process withdrawal request');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Withdrawal Request Submitted',
        description: `Your withdrawal request for ${formatCurrency(data.amount)} has been submitted for processing.`,
        variant: 'default',
      });
      
      // Reset form and close dialog
      setBankDetails('');
      setWithdrawalNotes('');
      setWithdrawDialogOpen(false);
      
      // Refetch data
      queryClient.invalidateQueries({ queryKey: ['/api/customer/cash-deposits'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customer/cash-redemptions'] });
    },
    onError: (error) => {
      toast({
        title: 'Withdrawal Request Failed',
        description: error instanceof Error ? error.message : 'Failed to submit withdrawal request',
        variant: 'destructive',
      });
    }
  });
  
  const handleAllocate = async () => {
    // Validate input
    const points = Number(pointsToAllocate);
    console.log('Starting allocation with points:', points);
    
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
    console.log('Available points:', availablePoints);
    
    if (points > availablePoints) {
      toast({
        title: 'Insufficient Points',
        description: `You only have ${availablePoints.toLocaleString()} points available.`,
        variant: 'destructive',
      });
      return;
    }
    
    // Add extensive logging to debug
    console.log('Attempting to allocate points:', points);
    console.log('With description:', description || 'Points allocated to cash deposits');
    
    // Execute the mutation directly with a fetch call for debugging
    try {
      console.log('Making direct fetch call to allocate points');
      
      const response = await fetch('/api/customer/cash-deposits/allocate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          points, 
          description: description || 'Points allocated to cash deposits'
        }),
        credentials: 'include'
      });
      
      console.log('Allocation response status:', response.status);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to parse error response' }));
        console.error('Allocation error:', errorData);
        throw new Error(errorData.error || 'Failed to allocate points');
      }
      
      const result = await response.json();
      console.log('Allocation success:', result);
      
      // Show success toast
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
      
    } catch (error) {
      console.error('Error in allocation request:', error);
      toast({
        title: 'Allocation Failed',
        description: error instanceof Error ? error.message : 'Failed to allocate points',
        variant: 'destructive',
      });
    }
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

  // Function to handle withdrawal request submission
  const handleWithdrawalRequest = async () => {
    if (!bankDetails.trim()) {
      toast({
        title: "Missing Bank Details",
        description: "Please provide your bank details for the withdrawal.",
        variant: "destructive",
      });
      return;
    }

    withdrawalMutation.mutate({ 
      bankDetails,
      notes: withdrawalNotes
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
        <h1 className="text-2xl md:text-3xl font-bold">Cash Deposits</h1>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-sm py-1 px-3 font-medium">
            Exchange Rate: R0.015 / point
          </Badge>
          
          {totalCashValue >= 5000 ? (
            <Button
              variant="default"
              size="sm"
              className="whitespace-nowrap"
              onClick={() => setWithdrawDialogOpen(true)}
            >
              <BanknoteIcon className="mr-2 h-4 w-4" />
              Request Withdrawal
            </Button>
          ) : null}
        </div>
      </div>
      
      {/* Withdrawal Request Dialog */}
      <Dialog open={withdrawDialogOpen} onOpenChange={setWithdrawDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request Cash Withdrawal</DialogTitle>
            <DialogDescription>
              You are about to request a withdrawal of {formatCurrency(totalCashValue)} from your cash wallet.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            {totalCashValue < 5000 ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Insufficient Funds</AlertTitle>
                <AlertDescription>
                  You need at least R5,000 in your cash wallet to request a withdrawal. You currently have {formatCurrency(totalCashValue)}.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                <div className="space-y-1">
                  <Label htmlFor="bankDetails">Bank Details</Label>
                  <Textarea 
                    id="bankDetails"
                    placeholder="Enter your bank details including account number, branch code, and bank name"
                    value={bankDetails}
                    onChange={(e) => setBankDetails(e.target.value)}
                    className="min-h-[120px]"
                    required
                  />
                </div>
                
                <div className="space-y-1">
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea 
                    id="notes"
                    placeholder="Any additional information regarding your withdrawal request"
                    value={withdrawalNotes}
                    onChange={(e) => setWithdrawalNotes(e.target.value)}
                  />
                </div>
                
                <Alert>
                  <InfoIcon className="h-4 w-4" />
                  <AlertTitle>Processing Time</AlertTitle>
                  <AlertDescription>
                    Withdrawal requests are typically processed within 5-7 business days.
                  </AlertDescription>
                </Alert>
              </>
            )}
          </div>
          
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setWithdrawDialogOpen(false)}
            >
              Cancel
            </Button>
            
            <Button
              type="button"
              onClick={handleWithdrawalRequest}
              disabled={totalCashValue < 5000 || !bankDetails.trim() || withdrawalMutation.isPending}
            >
              {withdrawalMutation.isPending ? "Processing..." : "Submit Withdrawal Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              Points allocated to your cash wallet
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cash Value</CardTitle>
            <BanknoteIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCashValue)}</div>
            <p className="text-xs text-muted-foreground">
              Exchange rate: R0.015 per point
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Allocate Points Form */}
      <Card>
        <CardHeader>
          <CardTitle>Allocate Points to Cash Wallet</CardTitle>
          <CardDescription>
            Convert your reward points to cash value at a rate of R0.015 per point.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="points">Points to Allocate</Label>
              <Input 
                id="points" 
                type="number" 
                placeholder="Enter points amount" 
                value={pointsToAllocate}
                onChange={(e) => setPointsToAllocate(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Available: {availablePoints.toLocaleString()} points
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="preview">Cash Value Preview</Label>
              <div className="h-10 px-3 py-2 rounded-md border border-input bg-background text-sm">
                {previewCashValue()}
              </div>
              <p className="text-xs text-muted-foreground">
                Estimated cash value at R0.015 per point
              </p>
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Input 
              id="description" 
              placeholder="Add a note for this allocation" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex justify-between border-t px-6 py-4">
          <p className="text-sm text-muted-foreground">
            Points will be deducted from your rewards balance
          </p>
          <Button 
            onClick={handleAllocate}
            disabled={!pointsToAllocate || Number(pointsToAllocate) <= 0 || Number(pointsToAllocate) > availablePoints}
          >
            Allocate Points
          </Button>
        </CardFooter>
      </Card>

      {/* Deposit History */}
      <Card>
        <CardHeader>
          <CardTitle>Cash Deposit History</CardTitle>
          <CardDescription>
            Record of points allocated to your cash wallet
          </CardDescription>
        </CardHeader>
        <CardContent>
          {deposits.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No cash deposits found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Allocate points to start building your cash wallet
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead className="text-right">Cash Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deposits.map((deposit: CashDeposit) => (
                  <TableRow key={deposit.id}>
                    <TableCell>{formatDate(deposit.created_at)}</TableCell>
                    <TableCell>{deposit.description}</TableCell>
                    <TableCell>{deposit.points.toLocaleString()}</TableCell>
                    <TableCell className="text-right">{formatCurrency(deposit.cashValue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}