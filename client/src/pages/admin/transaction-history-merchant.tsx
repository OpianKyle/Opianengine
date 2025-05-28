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
  TrendingUp, 
  Users, 
  DollarSign, 
  Search,
  Filter,
  Building2
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

export default function TransactionHistoryMerchantPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMerchant, setSelectedMerchant] = useState("");
  const [dateFilter, setDateFilter] = useState("all");
  const [groupByMerchant, setGroupByMerchant] = useState(false);

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

  // Filter transactions based on search and filters
  const filteredTransactions = transactions.filter((transaction: Transaction) => {
    const matchesSearch = !searchTerm || 
      transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transaction.merchant_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesMerchant = !selectedMerchant || 
      transaction.merchant_name.toLowerCase().includes(selectedMerchant.toLowerCase());
    
    const matchesDate = dateFilter === 'all' || (() => {
      const transactionDate = new Date(transaction.transaction_date);
      const now = new Date();
      
      switch (dateFilter) {
        case 'today':
          return transactionDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return transactionDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return transactionDate >= monthAgo;
        default:
          return true;
      }
    })();
    
    return matchesSearch && matchesMerchant && matchesDate;
  }) || [];

  // Get unique merchants for filter dropdown
  const uniqueMerchants = Array.from(new Set(
    transactions
      .map((t: Transaction) => t.merchant_name)
      .filter((name: string) => name && name.trim() !== '' && name !== null && name !== undefined)
  )).sort();

  // Group transactions by merchant if grouping is enabled
  const groupedTransactions = groupByMerchant 
    ? filteredTransactions.reduce((groups: Record<string, Transaction[]>, transaction: Transaction) => {
        const merchantName = transaction.merchant_name || 'Unknown Merchant';
        if (!groups[merchantName]) {
          groups[merchantName] = [];
        }
        groups[merchantName].push(transaction);
        return groups;
      }, {})
    : null;

  // Calculate summary statistics
  const totalTransactions = filteredTransactions.length;
  const totalAmount = filteredTransactions.reduce((sum: number, transaction: Transaction) => 
    sum + transaction.amount, 0);
  const totalPoints = filteredTransactions.reduce((sum: number, transaction: Transaction) => 
    sum + transaction.points_earned, 0);

  // Calculate merchant statistics
  const merchantStats = uniqueMerchants.map(merchant => {
    const merchantTransactions = filteredTransactions.filter(t => t.merchant_name === merchant);
    return {
      name: merchant,
      count: merchantTransactions.length,
      totalAmount: merchantTransactions.reduce((sum, t) => sum + t.amount, 0),
      totalPoints: merchantTransactions.reduce((sum, t) => sum + t.points_earned, 0)
    };
  }).sort((a, b) => b.totalAmount - a.totalAmount);

  if (isLoadingTransactions) {
    return (
      <div className="container py-8 mx-auto">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading transaction history...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 mx-auto">
      <Helmet>
        <title>Transaction History - Opian Rewards Admin</title>
      </Helmet>

      <div className="flex flex-col gap-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Transaction History</h1>
          <p className="text-muted-foreground">
            View and analyze all customer transactions with merchant filtering
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalTransactions.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">R{totalAmount.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Points</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalPoints.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Unique Merchants</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{uniqueMerchants.length}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search transactions..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Merchant</label>
                <Select value={selectedMerchant} onValueChange={setSelectedMerchant}>
                  <SelectTrigger>
                    <SelectValue placeholder="All merchants" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All merchants</SelectItem>
                    {uniqueMerchants.map((merchant) => (
                      <SelectItem key={merchant} value={merchant}>
                        {merchant}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Last 7 days</SelectItem>
                    <SelectItem value="month">Last 30 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">View Mode</label>
                <Button
                  variant={groupByMerchant ? "default" : "outline"}
                  onClick={() => setGroupByMerchant(!groupByMerchant)}
                  className="w-full"
                >
                  {groupByMerchant ? "Grouped by Merchant" : "List View"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Tabs */}
        <Tabs defaultValue="transactions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="merchants">Merchant Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions" className="space-y-4">
            {groupByMerchant && groupedTransactions ? (
              // Grouped view
              <div className="space-y-4">
                {Object.entries(groupedTransactions).map(([merchantName, merchantTransactions]) => (
                  <Card key={merchantName}>
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{merchantName}</span>
                        <Badge variant="secondary">
                          {merchantTransactions.length} transactions
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Points</TableHead>
                            <TableHead>Customer ID</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {merchantTransactions.map((transaction) => (
                            <TableRow key={transaction.id}>
                              <TableCell>
                                {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                              </TableCell>
                              <TableCell>{transaction.description}</TableCell>
                              <TableCell>R{transaction.amount.toLocaleString()}</TableCell>
                              <TableCell>{transaction.points_earned}</TableCell>
                              <TableCell>{transaction.user_id}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // List view
              <Card>
                <CardHeader>
                  <CardTitle>All Transactions</CardTitle>
                  <CardDescription>
                    Showing {filteredTransactions.length} transactions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Merchant</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Points</TableHead>
                        <TableHead>Customer ID</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTransactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>
                            {format(new Date(transaction.transaction_date), 'MMM dd, yyyy')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {transaction.merchant_name || 'Unknown'}
                            </Badge>
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell>R{transaction.amount.toLocaleString()}</TableCell>
                          <TableCell>{transaction.points_earned}</TableCell>
                          <TableCell>{transaction.user_id}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="merchants" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Merchant Analysis</CardTitle>
                <CardDescription>
                  Transaction volume and spending by merchant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Merchant</TableHead>
                      <TableHead>Transactions</TableHead>
                      <TableHead>Total Amount</TableHead>
                      <TableHead>Total Points</TableHead>
                      <TableHead>Avg Transaction</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {merchantStats.map((merchant) => (
                      <TableRow key={merchant.name}>
                        <TableCell className="font-medium">{merchant.name}</TableCell>
                        <TableCell>{merchant.count}</TableCell>
                        <TableCell>R{merchant.totalAmount.toLocaleString()}</TableCell>
                        <TableCell>{merchant.totalPoints.toLocaleString()}</TableCell>
                        <TableCell>
                          R{(merchant.totalAmount / merchant.count).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}