import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  ArrowLeft, 
  Calendar, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Search,
  Download,
  Filter,
  Eye
} from "lucide-react";
import { Helmet } from "react-helmet";
import { format } from "date-fns";

interface Transaction {
  id: number;
  user_id: number;
  transaction_type: string;
  amount: number;
  description: string;
  merchant_name: string;
  merchant_category: string;
  transaction_date: string;
  points_earned: number;
  import_batch_id: string;
  raw_data: string;
  created_at: string;
  updated_at: string;
}

export default function TransactionHistoryPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedImport, setSelectedImport] = useState<number | null>(null);

  // Fetch transaction history
  const { 
    data: transactionData, 
    isLoading: isLoadingTransactions 
  } = useQuery({
    queryKey: ['/api/transaction-history'],
    queryFn: async () => {
      const response = await fetch('/api/transaction-history');
      if (!response.ok) throw new Error('Failed to fetch transaction history');
      return response.json();
    }
  });

  // Get transactions from API response
  const transactions = transactionData?.transactions || [];
  const pagination = transactionData?.pagination || {};

  // Filter transactions based on search and filters
  const filteredTransactions = transactions.filter((transaction: Transaction) => {
    const matchesSearch = !searchTerm || 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.merchant_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCustomer = !selectedCustomer || 
      item.customer_email === selectedCustomer;
    
    const matchesDate = dateFilter === 'all' || (() => {
      const importDate = new Date(item.import_date);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          return importDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return importDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return importDate >= monthAgo;
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesCustomer && matchesDate;
  }) || [];

  // Calculate summary statistics
  const totalImports = filteredHistory.length;
  const totalTransactions = filteredHistory.reduce((sum: number, item: TransactionHistory) => 
    sum + item.total_transactions, 0);
  const totalAmount = filteredHistory.reduce((sum: number, item: TransactionHistory) => 
    sum + item.total_amount, 0);
  const totalPoints = filteredHistory.reduce((sum: number, item: TransactionHistory) => 
    sum + item.points_allocated, 0);

  // Get unique customers for filter
  const uniqueCustomers = Array.from(new Set(
    historyData?.map((item: TransactionHistory) => item.customer_email) || []
  ));

  if (selectedImport && detailsData) {
    return (
      <div className="container py-8 mx-auto">
        <Helmet>
          <title>Transaction Details - Opian Rewards Admin</title>
        </Helmet>

        <div className="flex flex-col gap-6">
          {/* Header with back button */}
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => setSelectedImport(null)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to History
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Transaction Details</h1>
              <p className="text-muted-foreground">
                Imported on {format(new Date(detailsData.import_date), 'PPP')}
              </p>
            </div>
          </div>

          {/* Import Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Import Summary</CardTitle>
              <CardDescription>
                {detailsData.customer_name} ({detailsData.customer_email})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {detailsData.total_transactions}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Transactions</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    R{detailsData.total_amount.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Total Amount</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {detailsData.points_allocated.toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Points Allocated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    R{detailsData.cash_deposits.toFixed(2)}
                  </div>
                  <div className="text-sm text-muted-foreground">Cash Deposits</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction Details Table */}
          <Card>
            <CardHeader>
              <CardTitle>Individual Transactions</CardTitle>
              <CardDescription>
                Detailed breakdown of all transactions in this import
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Cash Deposit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {detailsData.transactions?.map((transaction: TransactionDetail) => (
                      <TableRow key={transaction.id}>
                        <TableCell>
                          {format(new Date(transaction.date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {transaction.description}
                        </TableCell>
                        <TableCell>
                          <span className={transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                            R{Math.abs(transaction.amount).toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {transaction.merchant_category}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {transaction.points_earned > 0 && (
                            <span className="text-blue-600 font-medium">
                              +{transaction.points_earned}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {transaction.cash_deposit > 0 && (
                            <span className="text-purple-600 font-medium">
                              R{transaction.cash_deposit.toFixed(2)}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 mx-auto">
      <Helmet>
        <title>Transaction History - Opian Rewards Admin</title>
      </Helmet>

      <div className="flex flex-col gap-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Transaction History</h1>
            <p className="text-muted-foreground mt-2">
              View all card statement imports and transaction analysis
            </p>
          </div>
          <Button variant="outline" asChild>
            <a href="/admin/card-statement-import">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Import
            </a>
          </Button>
        </div>

        {/* Summary Statistics */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Imports</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalImports}</div>
              <p className="text-xs text-muted-foreground">
                Card statement imports
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTransactions.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Individual transactions processed
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R{totalAmount.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Transaction value processed
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Points Allocated</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPoints.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">
                Reward points distributed
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter transaction history by various criteria</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by customer name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger className="w-full md:w-64">
                  <SelectValue placeholder="All customers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All customers</SelectItem>
                  {uniqueCustomers.map((email) => (
                    <SelectItem key={email} value={email}>
                      {email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">Last 7 days</SelectItem>
                  <SelectItem value="month">Last 30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History Table */}
        <Card>
          <CardHeader>
            <CardTitle>Import History</CardTitle>
            <CardDescription>
              All card statement imports with transaction analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingHistory ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Import Date</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Cash Deposits</TableHead>
                      <TableHead>Processed By</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          No transaction history found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredHistory.map((item: TransactionHistory) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{item.customer_name}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.customer_email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {format(new Date(item.import_date), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {item.total_transactions}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-green-600">
                              R{item.total_amount.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-blue-600">
                              {item.points_allocated.toLocaleString()}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-purple-600">
                              R{item.cash_deposits.toFixed(2)}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {item.processed_by}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedImport(item.id)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}