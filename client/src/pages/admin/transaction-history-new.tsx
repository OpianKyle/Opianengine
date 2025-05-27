import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { ArrowLeft, Search, Calendar, DollarSign } from "lucide-react";
import { Helmet } from "react-helmet";
import { format } from "date-fns";
import { Link } from "wouter";

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

  // Filter transactions based on search
  const filteredTransactions = transactions.filter((transaction: Transaction) => {
    if (!searchTerm) return true;
    return transaction.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
           transaction.merchant_name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Calculate summary stats
  const totalTransactions = transactions.length;
  const totalAmount = transactions.reduce((sum: number, t: Transaction) => sum + (t.amount / 100), 0);
  const totalPoints = transactions.reduce((sum: number, t: Transaction) => sum + t.points_earned, 0);

  return (
    <div className="min-h-screen bg-[#011d3d] text-white">
      <Helmet>
        <title>Transaction History - OPIAN Rewards Admin</title>
      </Helmet>

      <div className="container mx-auto p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Link href="/admin">
            <Button variant="ghost" size="sm" className="text-white hover:bg-[#022b5c]">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Admin
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Transaction History</h1>
        </div>

        {/* Summary Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-[#022b5c] border-[#0a4a8a] text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-300">Total Transactions</p>
                  <p className="text-2xl font-bold">{totalTransactions.toLocaleString()}</p>
                </div>
                <Calendar className="h-8 w-8 text-[#4a9eff]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#022b5c] border-[#0a4a8a] text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-300">Total Amount</p>
                  <p className="text-2xl font-bold">R{totalAmount.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}</p>
                </div>
                <DollarSign className="h-8 w-8 text-[#4a9eff]" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-[#022b5c] border-[#0a4a8a] text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-300">Total Points</p>
                  <p className="text-2xl font-bold">{totalPoints.toLocaleString()}</p>
                </div>
                <Badge className="bg-[#4a9eff] text-white">Points</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <Card className="bg-[#022b5c] border-[#0a4a8a] text-white mb-6">
          <CardHeader>
            <CardTitle>Search Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Search by description or merchant..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 bg-[#011d3d] border-[#0a4a8a] text-white"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card className="bg-[#022b5c] border-[#0a4a8a] text-white">
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription className="text-gray-300">
              Showing {filteredTransactions.length} of {totalTransactions} transactions
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingTransactions ? (
              <div className="flex justify-center py-8">
                <div className="text-center">Loading transactions...</div>
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-400">No transactions found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-[#0a4a8a] hover:bg-[#011d3d]">
                      <TableHead className="text-gray-300">Date</TableHead>
                      <TableHead className="text-gray-300">Merchant</TableHead>
                      <TableHead className="text-gray-300">Description</TableHead>
                      <TableHead className="text-gray-300">Type</TableHead>
                      <TableHead className="text-gray-300">Amount</TableHead>
                      <TableHead className="text-gray-300">Points</TableHead>
                      <TableHead className="text-gray-300">User ID</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTransactions.map((transaction: Transaction) => (
                      <TableRow key={transaction.id} className="border-[#0a4a8a] hover:bg-[#011d3d]">
                        <TableCell className="text-white">
                          {format(new Date(transaction.transaction_date), 'yyyy-MM-dd')}
                        </TableCell>
                        <TableCell className="text-white font-medium">
                          {transaction.merchant_name}
                        </TableCell>
                        <TableCell className="text-gray-300 max-w-xs truncate">
                          {transaction.description}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={transaction.transaction_type === 'DEBIT' ? 'destructive' : 'default'}
                            className={transaction.transaction_type === 'DEBIT' ? 'bg-red-600' : 'bg-green-600'}
                          >
                            {transaction.transaction_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white font-medium">
                          R{(transaction.amount / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-[#4a9eff] font-medium">
                          {transaction.points_earned.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-gray-400">
                          {transaction.user_id}
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
    </div>
  );
}