import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Loader2, 
  AlertCircle, 
  CheckCircle, 
  Sync, 
  Edit, 
  CreditCard, 
  UserCheck,
  Calendar, 
  CalendarClock,
  RefreshCw 
} from 'lucide-react';

type Subscription = {
  id: number;
  userId: number;
  userEmail?: string;
  userName?: string;
  packageType: string;
  status: string;
  amount: string;
  createdAt: string;
  updatedAt: string;
  startDate: string;
  endDate: string;
  lastPaymentDate: string | null;
  nextPaymentDate: string | null;
  paystackSubscriptionCode: string | null;
  paystackCustomerCode: string | null;
  paymentMethod: string | null;
  paymentReference: string | null;
  cancelledAt: string | null;
};

type SyncResult = {
  updated: number;
  failed: number;
  notFound: number;
  details: Array<{
    subscription_id: number;
    email?: string;
    message: string;
    paystack_subscription_code?: string;
    paystack_customer_code?: string;
    success: boolean;
    error?: string;
  }>;
};

export default function SubscriptionsPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // State for subscription management
  const [selectedSubscription, setSelectedSubscription] = useState<Subscription | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [paystackSubscriptionCode, setPaystackSubscriptionCode] = useState('');
  const [paystackCustomerCode, setPaystackCustomerCode] = useState('');
  
  // State for filtering
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPackage, setFilterPackage] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // State for sync feature
  const [syncResults, setSyncResults] = useState<SyncResult | null>(null);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  
  // Query for subscriptions data
  const { 
    data, 
    isLoading, 
    isError, 
    error,
    refetch
  } = useQuery<{ success: boolean; subscriptions: Subscription[] }>({
    queryKey: ['/api/admin/subscriptions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/subscriptions');
      return response.json();
    }
  });

  // Mutation for updating subscription details
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: any }) => {
      const response = await apiRequest(
        'PUT', 
        `/api/admin/subscriptions/${id}`,
        data
      );
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      setIsDialogOpen(false);
      toast({
        title: 'Success',
        description: 'Subscription updated successfully',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update subscription',
        variant: 'destructive',
      });
    }
  });

  // Mutation for syncing with Paystack
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/admin/subscriptions/sync');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/subscriptions'] });
      setSyncResults(data.results);
      setIsSyncDialogOpen(true);
      toast({
        title: 'Success',
        description: 'Synced subscriptions with Paystack',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message || 'Failed to sync with Paystack',
        variant: 'destructive',
      });
    }
  });

  // Handle opening the edit dialog
  const editSubscription = (subscription: Subscription) => {
    setSelectedSubscription(subscription);
    setPaystackSubscriptionCode(subscription.paystackSubscriptionCode || '');
    setPaystackCustomerCode(subscription.paystackCustomerCode || '');
    setIsDialogOpen(true);
  };

  // Handle updating subscription
  const handleUpdateSubscription = () => {
    if (!selectedSubscription) return;
    
    updateMutation.mutate({
      id: selectedSubscription.id,
      data: {
        paystackSubscriptionCode,
        paystackCustomerCode
      }
    });
  };

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case 'ACTIVE':
        return 'bg-green-500 hover:bg-green-600';
      case 'PENDING':
        return 'bg-amber-500 hover:bg-amber-600';
      case 'CANCELLED':
        return 'bg-red-500 hover:bg-red-600';
      case 'EXPIRED':
        return 'bg-slate-500 hover:bg-slate-600';
      default:
        return 'bg-blue-500 hover:bg-blue-600';
    }
  };

  // Get package badge color
  const getPackageColor = (packageType: string) => {
    switch (packageType.toUpperCase()) {
      case 'OPPORTUNITY':
        return 'bg-zinc-400 hover:bg-zinc-500';
      case 'MOMENTUM':
        return 'bg-blue-400 hover:bg-blue-500';
      case 'PROSPER':
        return 'bg-green-400 hover:bg-green-500';
      case 'PRESTIGE':
        return 'bg-purple-400 hover:bg-purple-500';
      case 'PINNACLE':
        return 'bg-amber-400 hover:bg-amber-500';
      case 'TEST':
        return 'bg-indigo-400 hover:bg-indigo-500';
      default:
        return 'bg-slate-400 hover:bg-slate-500';
    }
  };

  // Format date string
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter subscriptions based on status, package, and search term
  const filteredSubscriptions = data?.subscriptions
    ? data.subscriptions.filter(sub => {
        const statusMatch = filterStatus === 'all' || sub.status.toUpperCase() === filterStatus.toUpperCase();
        const packageMatch = filterPackage === 'all' || sub.packageType.toUpperCase() === filterPackage.toUpperCase();
        const searchMatch = searchTerm === '' || 
          (sub.userEmail && sub.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (sub.userName && sub.userName.toLowerCase().includes(searchTerm.toLowerCase()));
        return statusMatch && packageMatch && searchMatch;
      })
    : [];

  return (
    <div className="container mx-auto py-8">
      <Card className="mb-6">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
            <div>
              <CardTitle className="text-2xl mb-2">Subscription Management</CardTitle>
              <CardDescription>
                Manage user subscription details and Paystack integration
              </CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 mt-4 md:mt-0">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Sync className="h-4 w-4" />
                    Sync with Paystack
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sync Subscriptions with Paystack</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will attempt to match existing subscriptions with Paystack data using email addresses.
                      This operation may take some time to complete.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => syncMutation.mutate()}
                      disabled={syncMutation.isPending}
                    >
                      {syncMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Syncing...
                        </>
                      ) : (
                        'Continue'
                      )}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
              
              <Button 
                onClick={() => refetch()} 
                variant="outline"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                <span className="ml-2">Refresh</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="flex flex-col gap-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="status-filter">Filter by Status</Label>
                <Select 
                  value={filterStatus} 
                  onValueChange={setFilterStatus}
                >
                  <SelectTrigger id="status-filter">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                    <SelectItem value="EXPIRED">Expired</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="package-filter">Filter by Package</Label>
                <Select 
                  value={filterPackage} 
                  onValueChange={setFilterPackage}
                >
                  <SelectTrigger id="package-filter">
                    <SelectValue placeholder="Select package" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Packages</SelectItem>
                    <SelectItem value="OPPORTUNITY">Opportunity</SelectItem>
                    <SelectItem value="MOMENTUM">Momentum</SelectItem>
                    <SelectItem value="PROSPER">Prosper</SelectItem>
                    <SelectItem value="PRESTIGE">Prestige</SelectItem>
                    <SelectItem value="PINNACLE">Pinnacle</SelectItem>
                    <SelectItem value="TEST">Test</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex flex-col space-y-1.5">
                <Label htmlFor="search">Search</Label>
                <Input
                  id="search"
                  placeholder="Search by user email or name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : isError ? (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                {error instanceof Error ? error.message : 'Failed to load subscriptions'}
              </AlertDescription>
            </Alert>
          ) : filteredSubscriptions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No subscriptions found matching your filters.</p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>Last Payment</TableHead>
                    <TableHead>Next Payment</TableHead>
                    <TableHead>Paystack Codes</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubscriptions.map((subscription) => (
                    <TableRow key={subscription.id}>
                      <TableCell>
                        <div className="font-medium">{subscription.userName || 'Unknown'}</div>
                        <div className="text-sm text-muted-foreground">{subscription.userEmail || 'No email'}</div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getPackageColor(subscription.packageType)}`}>
                          {subscription.packageType}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${getStatusColor(subscription.status)}`}>
                          {subscription.status}
                        </Badge>
                      </TableCell>
                      <TableCell>R {subscription.amount}</TableCell>
                      <TableCell>{formatDate(subscription.startDate)}</TableCell>
                      <TableCell>{formatDate(subscription.lastPaymentDate)}</TableCell>
                      <TableCell>{formatDate(subscription.nextPaymentDate)}</TableCell>
                      <TableCell>
                        {subscription.paystackSubscriptionCode ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            <span className="text-xs">Connected</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <AlertCircle className="h-4 w-4 mr-1" />
                            <span className="text-xs">Missing</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => editSubscription(subscription)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          Edit
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Edit Subscription Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Subscription</DialogTitle>
            <DialogDescription>
              Update Paystack subscription details for {selectedSubscription?.userName}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subscription-code" className="text-right">
                Subscription Code
              </Label>
              <Input
                id="subscription-code"
                placeholder="e.g. SUB_abcdef123456"
                value={paystackSubscriptionCode}
                onChange={(e) => setPaystackSubscriptionCode(e.target.value)}
                className="col-span-3"
              />
            </div>
            
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="customer-code" className="text-right">
                Customer Code
              </Label>
              <Input
                id="customer-code"
                placeholder="e.g. CUS_abcdef123456"
                value={paystackCustomerCode}
                onChange={(e) => setPaystackCustomerCode(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={handleUpdateSubscription}
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Sync Results Dialog */}
      <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Sync Results</DialogTitle>
            <DialogDescription>
              Results of synchronizing subscriptions with Paystack
            </DialogDescription>
          </DialogHeader>
          
          {syncResults && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Updated</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-green-600">{syncResults.updated}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Failed</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-red-600">{syncResults.failed}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Not Found</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold text-amber-600">{syncResults.notFound}</p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Subscription ID</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Result</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {syncResults.details.map((detail, index) => (
                      <TableRow key={index}>
                        <TableCell>{detail.subscription_id}</TableCell>
                        <TableCell>{detail.email || 'N/A'}</TableCell>
                        <TableCell>
                          {detail.success ? (
                            <Badge className="bg-green-500">Success</Badge>
                          ) : (
                            <Badge className="bg-red-500">Failed</Badge>
                          )}
                        </TableCell>
                        <TableCell className="max-w-[300px] truncate">
                          {detail.message}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button onClick={() => setIsSyncDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}