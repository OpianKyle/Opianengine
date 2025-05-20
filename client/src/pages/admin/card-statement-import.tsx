import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Upload, CheckCircle, FileText, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Progress } from "@/components/ui/progress";

interface ImportStats {
  totalProcessed: number;
  usersUpdated: number;
  pointsAllocated: number;
  cashDepositsAllocated: number;
  errors: string[];
}

export default function CardStatementImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [importStats, setImportStats] = useState<ImportStats | null>(null);
  const [progress, setProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    
    if (selectedFile) {
      // Check file type
      if (!selectedFile.name.endsWith('.xlsx')) {
        toast({
          title: "Invalid file type",
          description: "Please upload an Excel file (.xlsx)",
          variant: "destructive",
        });
        return;
      }
      
      setFile(selectedFile);
      setImportStats(null);
    }
  };
  
  const importMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("No file selected");
      
      const formData = new FormData();
      formData.append('file', file);
      
      setImporting(true);
      setProgress(0);
      
      // Create interval to simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          const newValue = prev + Math.random() * 5;
          return newValue > 90 ? 90 : newValue;
        });
      }, 300);
      
      try {
        const response = await fetch('/api/admin/import-card-statement', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to import file");
        }
        
        clearInterval(progressInterval);
        setProgress(100);
        
        const result = await response.json();
        setImportStats(result);
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
        queryClient.invalidateQueries({ queryKey: ['/api/admin/cash-deposits'] });
        
        return result;
      } catch (error) {
        clearInterval(progressInterval);
        throw error;
      } finally {
        setImporting(false);
      }
    },
    onSuccess: () => {
      toast({
        title: "File imported successfully",
        description: `Processed ${importStats?.totalProcessed || 0} entries`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const handleImport = () => {
    importMutation.mutate();
  };
  
  return (
    <AdminLayout>
      <div className="container mx-auto py-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold">Card Statement Import</h1>
            <p className="text-muted-foreground mt-2">
              Import card statements to allocate points for money deductions and cash deposit points for money deposited.
            </p>
          </div>
          
          <Card>
            <CardHeader>
              <CardTitle>Upload Card Statement</CardTitle>
              <CardDescription>
                Upload an Excel (.xlsx) file containing card statement data. 
                The system will allocate regular points for money deductions and cash deposit points for money deposited.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="border rounded-md p-8 flex flex-col items-center justify-center gap-4 border-dashed">
                  <FileText className="h-12 w-12 text-muted-foreground" />
                  <div className="space-y-2 text-center">
                    <h3 className="font-medium">Upload Excel File</h3>
                    <p className="text-sm text-muted-foreground">
                      Drag and drop or click to select Excel file
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label 
                      htmlFor="file-upload" 
                      className="cursor-pointer inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90"
                    >
                      <Upload className="h-4 w-4" />
                      Choose File
                    </Label>
                    <Input 
                      id="file-upload" 
                      type="file" 
                      accept=".xlsx" 
                      className="hidden" 
                      onChange={handleFileChange} 
                    />
                  </div>
                </div>
                
                {file && (
                  <div className="flex items-center gap-2 p-3 border rounded-md bg-muted/50">
                    <FileText className="h-5 w-5 text-primary" />
                    <span>{file.name}</span>
                    <span className="ml-auto text-sm text-muted-foreground">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                )}
                
                {importing && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Importing data...</Label>
                      <span className="text-sm">{Math.round(progress)}%</span>
                    </div>
                    <Progress value={progress} />
                  </div>
                )}
                
                {importStats && (
                  <div className="space-y-4">
                    <Alert className="bg-green-50">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <AlertTitle>Import Completed</AlertTitle>
                      <AlertDescription>
                        Successfully processed the card statement file.
                      </AlertDescription>
                    </Alert>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="p-4 border rounded-md">
                        <p className="text-sm text-muted-foreground">Total Processed</p>
                        <p className="text-2xl font-bold">{importStats.totalProcessed}</p>
                      </div>
                      <div className="p-4 border rounded-md">
                        <p className="text-sm text-muted-foreground">Users Updated</p>
                        <p className="text-2xl font-bold">{importStats.usersUpdated}</p>
                      </div>
                      <div className="p-4 border rounded-md">
                        <p className="text-sm text-muted-foreground">Points Allocated</p>
                        <p className="text-2xl font-bold">{importStats.pointsAllocated.toLocaleString()}</p>
                      </div>
                      <div className="p-4 border rounded-md">
                        <p className="text-sm text-muted-foreground">Cash Deposits</p>
                        <p className="text-2xl font-bold">{importStats.cashDepositsAllocated.toLocaleString()}</p>
                      </div>
                    </div>
                    
                    {importStats.errors.length > 0 && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Errors Occurred</AlertTitle>
                        <AlertDescription>
                          <ul className="list-disc pl-5 mt-2 space-y-1">
                            {importStats.errors.map((error, index) => (
                              <li key={index} className="text-sm">{error}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t p-6">
              <div className="text-sm text-muted-foreground">
                Only .xlsx files are supported
              </div>
              <Button 
                onClick={handleImport} 
                disabled={!file || importing}
                className="min-w-32"
              >
                {importing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : 'Import Data'}
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>File Format Instructions</CardTitle>
              <CardDescription>
                Your Excel file should include the following columns:
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm">The system expects the following columns in your Excel file:</p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li><strong>CardNumber</strong> - The card number associated with the user</li>
                  <li><strong>TransactionDate</strong> - Date of the transaction (YYYY-MM-DD format)</li>
                  <li><strong>TransactionType</strong> - "Debit" for money deductions, "Credit" for money deposits</li>
                  <li><strong>Amount</strong> - Transaction amount in Rands (negative for deductions, positive for deposits)</li>
                  <li><strong>Description</strong> - Transaction description (optional)</li>
                </ul>
                <p className="text-sm mt-4">
                  <strong>Note:</strong> For each transaction:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-sm">
                  <li>Debit transactions (money deductions) will convert to regular reward points (1 Rand = 1 point)</li>
                  <li>Credit transactions (money deposits) will convert to cash deposit points (1 Rand = 1 point), which can be withdrawn at R0.015 per point</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}