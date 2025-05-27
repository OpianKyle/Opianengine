import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQuery } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Upload, Search } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Progress } from '@/components/ui/progress';
import { MetaTags } from '@/components/seo/meta-tags';
import { Helmet } from 'react-helmet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Define the schema for the form
const formSchema = z.object({
  file: z.any().refine((file) => file instanceof FileList && file.length > 0, {
    message: 'Please select a file.',
  }),
  customerId: z.string({
    required_error: "Please select a customer",
  }),
});

// Define transaction types
interface Transaction {
  type: string;
  amount: number;
  description?: string;
  date?: string;
  merchant?: string;
}

// Define grouped transaction type for analysis
interface GroupedTransaction {
  merchantPattern: string;
  transactions: Transaction[];
  totalAmount: number;
  count: number;
  averageAmount: number;
}

// Define the response type for the import stats
interface ImportStats {
  totalProcessed: number;
  usersUpdated: number;
  pointsAllocated: number;
  cashDepositsAllocated: number;
  errors: string[];
  transactionDetails?: {
    debitTransactions?: Transaction[];
    creditTransactions?: Transaction[];
  };
}

// The main component for the Card Statement Import page
// Define interface for customer data
interface Customer {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  card_number?: string;
}

export default function CardStatementImportPage() {
  const { toast } = useToast();
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');

  // Function to group transactions by similar merchant names/descriptions
  const groupTransactionsByMerchant = (transactions: Transaction[]): GroupedTransaction[] => {
    const groups: { [key: string]: Transaction[] } = {};
    
    transactions.forEach(transaction => {
      // Extract merchant pattern from description
      let merchantPattern = transaction.description || transaction.type || 'Unknown';
      
      // Clean and normalize the merchant name
      merchantPattern = merchantPattern
        .replace(/\d{2}\/\d{2}\/\d{4}/g, '') // Remove dates
        .replace(/\d{2}:\d{2}/g, '') // Remove times
        .replace(/[#\*\-\d]+/g, '') // Remove reference numbers
        .replace(/\s+/g, ' ') // Normalize spaces
        .trim()
        .toUpperCase();
      
      // Group similar merchants by first few words
      const keyWords = merchantPattern.split(' ').slice(0, 2).join(' ');
      const groupKey = keyWords || 'MISCELLANEOUS';
      
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(transaction);
    });
    
    // Convert to grouped transaction format
    return Object.entries(groups).map(([pattern, transactions]) => {
      const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);
      return {
        merchantPattern: pattern,
        transactions,
        totalAmount,
        count: transactions.length,
        averageAmount: totalAmount / transactions.length
      };
    }).sort((a, b) => b.totalAmount - a.totalAmount); // Sort by total amount descending
  };

  // Fetch ALL customers for dropdown (no pagination/filtering)
  const { data: customersResponse, isLoading: isLoadingCustomers } = useQuery<any>({
    queryKey: ['/api/admin/customers-all'], // Different cache key to avoid conflicts
    queryFn: async () => {
      const response = await fetch('/api/admin/customers?limit=1000&showTest=false'); // Get all customers
      if (!response.ok) {
        throw new Error('Failed to fetch customers');
      }
      return response.json();
    },
    staleTime: 60000, // 1 minute
  });

  // Extract customers from response (handle both direct array and nested data structure)
  const customers: Customer[] = Array.isArray(customersResponse) 
    ? customersResponse 
    : customersResponse?.data || customersResponse?.customers || [];

  // Filter customers based on search term
  const filteredCustomers = searchTerm 
    ? (customers as Customer[]).filter(c => 
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : customers;

  // Initialize the form with react-hook-form and zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      file: undefined,
      customerId: '',
    },
  });

  // Setup the mutation for uploading the Excel file
  const uploadMutation = useMutation({
    mutationFn: async (data: FormData) => {
      setIsUploading(true);
      setUploadProgress(0);
      
      // Simulate upload progress (in a real app, this would come from the actual upload)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + 5;
        });
      }, 300);
      
      try {
        const response = await fetch('/api/admin/import-card-statement', {
          method: 'POST',
          body: data,
        });
        
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || 'Failed to upload file');
        }
        
        return await response.json();
      } finally {
        setIsUploading(false);
      }
    },
    onSuccess: (data: ImportStats) => {
      setImportStats(data);
      toast({
        title: 'Import Successful',
        description: `Processed ${data.totalProcessed} transactions for ${data.usersUpdated} customers`,
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Import Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle form submission
  const onSubmit = (values: z.infer<typeof formSchema>) => {
    if (!values.customerId) {
      toast({
        title: "Customer selection required",
        description: "Please select a customer before uploading the file",
        variant: "destructive",
      });
      return;
    }
    
    const files = values.file as FileList;
    if (files.length === 0) return;
    
    const formData = new FormData();
    formData.append('file', files[0]);
    formData.append('customerId', values.customerId);
    
    uploadMutation.mutate(formData);
  };

  return (
    <>
      <MetaTags
        title="Card Statement Import | Opian Rewards"
        description="Import card statements to allocate reward points and cash deposits for customers"
      />
      <Helmet>
        <title>Card Statement Import | Opian Rewards</title>
      </Helmet>

      <div className="container py-8 mx-auto">
        <div className="flex flex-col gap-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Card Statement Import</h1>
            <p className="text-muted-foreground mt-2">
              Import Excel card statements to allocate reward points and cash deposits for customers.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2">
            {/* Import Form Card */}
            <Card>
              <CardHeader>
                <CardTitle>Upload Card Statement</CardTitle>
                <CardDescription>
                  Select an Excel file containing card statements to process.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                      control={form.control}
                      name="customerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Select Customer</FormLabel>
                          <FormControl>
                            <Select 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              disabled={isUploading}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select a customer" />
                              </SelectTrigger>
                              <SelectContent>
                                {isLoadingCustomers ? (
                                  <div className="flex items-center justify-center p-4">
                                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                                  </div>
                                ) : (filteredCustomers as Customer[]).length > 0 ? (
                                  (filteredCustomers as Customer[]).map((customer: Customer) => (
                                    <SelectItem key={customer.id} value={customer.id.toString()}>
                                      {customer.first_name} {customer.last_name} - {customer.email}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <div className="p-2 text-center text-sm text-muted-foreground">
                                    No customers found
                                  </div>
                                )}
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormDescription>
                            Choose the customer whose card statement you're uploading
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="file"
                      render={({ field: { onChange, value, ...rest } }) => (
                        <FormItem>
                          <FormLabel>Excel File</FormLabel>
                          <FormControl>
                            <Input
                              type="file"
                              accept=".xlsx,.xls"
                              onChange={(e) => onChange(e.target.files)}
                              disabled={isUploading}
                              {...rest}
                            />
                          </FormControl>
                          <FormDescription>
                            Upload an Excel file with customer card transactions.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {isUploading && (
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Uploading and processing...</p>
                        <Progress value={uploadProgress} />
                      </div>
                    )}

                    <Button type="submit" disabled={isUploading} className="w-full">
                      {isUploading ? (
                        <>Processing...</>
                      ) : (
                        <>
                          <Upload className="mr-2 h-4 w-4" />
                          Upload and Process
                        </>
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>

            {/* Import Guide Card */}
            <Card>
              <CardHeader>
                <CardTitle>Import Guide</CardTitle>
                <CardDescription>
                  How the card statement import process works.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-1">Required Format</h3>
                  <p className="text-sm text-muted-foreground">
                    The Excel file should contain the following columns:
                  </p>
                  <ul className="text-sm text-muted-foreground list-disc pl-5 mt-2">
                    <li>Card Number (to identify the customer)</li>
                    <li>Transaction Date</li>
                    <li>Transaction Amount</li>
                    <li>Transaction Type (Debit or Credit)</li>
                  </ul>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-1">How Points Are Allocated</h3>
                  <p className="text-sm text-muted-foreground">
                    <strong>Debit Transactions:</strong> Customer spending earns regular reward points.
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    <strong>Credit Transactions:</strong> Money deposited is converted to cash deposit points.
                  </p>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-1">Points Conversion Rate</h3>
                  <p className="text-sm text-muted-foreground">
                    Cash deposits are converted to points at a rate of R0.015 per point, allowing customers to withdraw cash when they accumulate enough points (minimum R5000).
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Results Section */}
          {importStats && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Import Results</CardTitle>
                <CardDescription>Summary of the processed card statement data.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-muted p-4 rounded-md">
                    <h3 className="text-sm font-medium text-muted-foreground">Transactions Processed</h3>
                    <p className="text-2xl font-bold">{importStats.totalProcessed}</p>
                  </div>
                  <div className="bg-muted p-4 rounded-md">
                    <h3 className="text-sm font-medium text-muted-foreground">Customers Updated</h3>
                    <p className="text-2xl font-bold">{importStats.usersUpdated}</p>
                  </div>
                  <div className="bg-muted p-4 rounded-md">
                    <h3 className="text-sm font-medium text-muted-foreground">Reward Points Allocated</h3>
                    <p className="text-2xl font-bold">{importStats.pointsAllocated.toLocaleString()}</p>
                  </div>
                  <div className="bg-muted p-4 rounded-md">
                    <h3 className="text-sm font-medium text-muted-foreground">Cash Deposit Points</h3>
                    <p className="text-2xl font-bold">{importStats.cashDepositsAllocated.toLocaleString()}</p>
                  </div>
                </div>

                {importStats.errors.length > 0 && (
                  <Alert variant="destructive" className="mt-6">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Import Errors</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc pl-6 mt-2 space-y-1">
                        {importStats.errors.map((error, index) => (
                          <li key={index}>{error}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {importStats.errors.length === 0 && (
                  <Alert className="mt-6 bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <AlertTitle>Import Completed Successfully</AlertTitle>
                    <AlertDescription>
                      All transactions were processed without errors.
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Detailed Transaction Breakdown */}
                {importStats.transactionDetails && (
                  <div className="mt-6 border rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-4 py-3 border-b">
                      <h3 className="font-semibold">Transaction Details</h3>
                    </div>
                    
                    <div className="p-4">
                      {/* Debit Transactions (Regular Reward Points) */}
                      {importStats.transactionDetails.debitTransactions && 
                       importStats.transactionDetails.debitTransactions.length > 0 && (
                        <div className="mb-6">
                          <h4 className="font-medium text-sm mb-2">Debit Transactions (Reward Points)</h4>
                          <div className="overflow-x-auto border rounded-md">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    #
                                  </th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount (R)
                                  </th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Converted Points
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {importStats.transactionDetails.debitTransactions.map((tx, idx) => (
                                  <tr key={`debit-${idx}`}>
                                    <td className="px-3 py-2 whitespace-nowrap">{idx + 1}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">R {tx.amount.toFixed(2)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">{Math.round(tx.amount)}</td>
                                  </tr>
                                ))}
                                <tr className="bg-blue-50 font-medium">
                                  <td className="px-3 py-2 whitespace-nowrap">Total</td>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    R {importStats.transactionDetails.debitTransactions
                                      .reduce((sum, tx) => sum + tx.amount, 0)
                                      .toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    {importStats.pointsAllocated} points
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      
                      {/* Credit Transactions (Cash Deposit Points) */}
                      {importStats.transactionDetails.creditTransactions && 
                       importStats.transactionDetails.creditTransactions.length > 0 && (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Credit Transactions (Cash Deposit Points)</h4>
                          <div className="overflow-x-auto border rounded-md">
                            <table className="min-w-full divide-y divide-gray-200 text-sm">
                              <thead className="bg-gray-100">
                                <tr>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    #
                                  </th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Amount (R)
                                  </th>
                                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                    Converted Points
                                  </th>
                                </tr>
                              </thead>
                              <tbody className="bg-white divide-y divide-gray-200">
                                {importStats.transactionDetails.creditTransactions.map((tx, idx) => (
                                  <tr key={`credit-${idx}`}>
                                    <td className="px-3 py-2 whitespace-nowrap">{idx + 1}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">R {tx.amount.toFixed(2)}</td>
                                    <td className="px-3 py-2 whitespace-nowrap">{Math.round(tx.amount)}</td>
                                  </tr>
                                ))}
                                <tr className="bg-blue-50 font-medium">
                                  <td className="px-3 py-2 whitespace-nowrap">Total</td>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    R {importStats.transactionDetails.creditTransactions
                                      .reduce((sum, tx) => sum + tx.amount, 0)
                                      .toFixed(2)}
                                  </td>
                                  <td className="px-3 py-2 whitespace-nowrap">
                                    {importStats.cashDepositsAllocated} points
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}
                      
                      <div className="mt-4 text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
                        <p><strong>Conversion rate:</strong> R1 = 1 point</p>
                        <p><strong>Debit transactions:</strong> Added to regular reward points</p>
                        <p><strong>Credit transactions:</strong> Added to cash deposit points</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Transaction History Analysis - Grouped Deductions */}
                {importStats.transactionDetails?.debitTransactions && 
                 importStats.transactionDetails.debitTransactions.length > 0 && (
                  <div className="mt-6 border rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-4 py-3 border-b">
                      <h3 className="font-semibold">Transaction Analysis - Grouped Deductions</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        Similar transactions grouped by merchant patterns for spending insights
                      </p>
                    </div>
                    
                    <div className="p-4">
                      {(() => {
                        const groupedTransactions = groupTransactionsByMerchant(
                          importStats.transactionDetails.debitTransactions
                        );
                        
                        return (
                          <div className="space-y-4">
                            {groupedTransactions.length > 0 ? (
                              groupedTransactions.map((group, idx) => (
                                <div key={idx} className="border rounded-lg p-4 bg-white shadow-sm">
                                  <div className="flex justify-between items-start mb-3">
                                    <div>
                                      <h4 className="font-medium text-gray-900">
                                        {group.merchantPattern || 'Miscellaneous Transactions'}
                                      </h4>
                                      <p className="text-sm text-gray-500">
                                        {group.count} transaction{group.count !== 1 ? 's' : ''}
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-lg font-semibold text-gray-900">
                                        R {group.totalAmount.toFixed(2)}
                                      </p>
                                      <p className="text-sm text-gray-500">
                                        Avg: R {group.averageAmount.toFixed(2)}
                                      </p>
                                    </div>
                                  </div>
                                  
                                  {/* Individual transactions in this group */}
                                  <div className="bg-gray-50 rounded p-3">
                                    <h5 className="text-xs font-medium text-gray-700 mb-2 uppercase tracking-wide">
                                      Individual Transactions
                                    </h5>
                                    <div className="space-y-1">
                                      {group.transactions.map((transaction, txIdx) => (
                                        <div key={txIdx} className="flex justify-between text-sm">
                                          <span className="text-gray-600">
                                            Transaction {txIdx + 1}
                                            {transaction.description && 
                                             transaction.description !== transaction.type && (
                                              <span className="text-gray-400 ml-1">
                                                ({transaction.description.substring(0, 30)}
                                                {transaction.description.length > 30 ? '...' : ''})
                                              </span>
                                            )}
                                          </span>
                                          <span className="font-medium">
                                            R {transaction.amount.toFixed(2)}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                  
                                  {/* Spending insights */}
                                  <div className="mt-3 p-2 bg-blue-50 rounded text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-blue-700">Points Earned:</span>
                                      <span className="font-medium text-blue-900">
                                        {Math.round(group.totalAmount)} points
                                      </span>
                                    </div>
                                    {group.count > 1 && (
                                      <div className="flex justify-between mt-1">
                                        <span className="text-blue-700">Frequency:</span>
                                        <span className="text-blue-900">
                                          {group.count > 5 ? 'High' : group.count > 2 ? 'Medium' : 'Low'} 
                                          ({group.count} times)
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-center py-8 text-gray-500">
                                <p>No transaction patterns found to group.</p>
                              </div>
                            )}
                            
                            {/* Summary insights */}
                            {groupedTransactions.length > 0 && (
                              <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border">
                                <h4 className="font-semibold text-gray-900 mb-2">Spending Insights</h4>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                  <div>
                                    <span className="text-gray-600">Top Merchant Category:</span>
                                    <p className="font-medium text-gray-900">
                                      {groupedTransactions[0]?.merchantPattern}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Highest Single Amount:</span>
                                    <p className="font-medium text-gray-900">
                                      R {Math.max(...importStats.transactionDetails.debitTransactions.map(t => t.amount)).toFixed(2)}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-gray-600">Most Frequent Merchant:</span>
                                    <p className="font-medium text-gray-900">
                                      {groupedTransactions.reduce((prev, current) => 
                                        prev.count > current.count ? prev : current
                                      )?.merchantPattern}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <Button 
                  variant="outline" 
                  onClick={() => setImportStats(null)}
                  className="w-full"
                >
                  Clear Results & Import Another File
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}