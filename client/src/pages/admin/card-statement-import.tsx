import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { AlertTriangle, CheckCircle, Upload } from 'lucide-react';

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

// Define the schema for the form
const formSchema = z.object({
  file: z.any().refine((file) => file instanceof FileList && file.length > 0, {
    message: 'Please select a file.',
  }),
});

// Define the response type for the import stats
interface ImportStats {
  totalProcessed: number;
  usersUpdated: number;
  pointsAllocated: number;
  cashDepositsAllocated: number;
  errors: string[];
}

// The main component for the Card Statement Import page
export default function CardStatementImportPage() {
  const { toast } = useToast();
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Initialize the form with react-hook-form and zod validation
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      file: undefined,
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
    const files = values.file as FileList;
    if (files.length === 0) return;
    
    const formData = new FormData();
    formData.append('file', files[0]);
    
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