import { useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function FixPendingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleFixPending = async () => {
    setLoading(true);
    setError(null);
    setResults(null);
    setSuccess(false);

    try {
      const response = await apiRequest('POST', '/api/payment/fix-pending');
      const data = await response.json();

      if (data.success) {
        setSuccess(true);
        setResults(data.results);
        toast({
          title: "Operation Successful",
          description: data.message,
        });
      } else {
        setError(data.message || 'Failed to fix pending subscriptions');
        toast({
          title: "Operation Failed",
          description: data.message || 'Failed to fix pending subscriptions',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fixing pending subscriptions:', error);
      setError('Failed to fix pending subscriptions. Please try again.');
      toast({
        title: "Error",
        description: 'Failed to fix pending subscriptions. Please try again.',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Fix Pending Subscriptions</h1>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Admin Tool: Fix Pending Subscriptions</CardTitle>
          <CardDescription>
            This tool will attempt to fix any pending subscriptions by verifying payments and updating subscription status.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="mb-4 text-muted-foreground">
            Use this tool when customers report that their subscriptions are still showing as "PENDING" after payment.
            The tool will check each pending subscription against Paystack's API to verify payment status.
          </p>
        </CardContent>
        <CardFooter>
          <Button 
            onClick={handleFixPending} 
            disabled={loading}
            className="w-full md:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              'Fix Pending Subscriptions'
            )}
          </Button>
        </CardFooter>
      </Card>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && !results?.length && (
        <Alert className="mb-6">
          <CheckCircle2 className="h-4 w-4" />
          <AlertTitle>No Action Needed</AlertTitle>
          <AlertDescription>
            No pending subscriptions were found that need fixing.
          </AlertDescription>
        </Alert>
      )}

      {results && results.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Results</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.map((result, index) => (
              <Card key={index} className={`overflow-hidden ${
                result.status === 'FIXED' ? 'border-green-500' :
                result.status === 'SKIPPED' ? 'border-amber-500' :
                'border-red-500'
              }`}>
                <CardHeader className={`
                  ${result.status === 'FIXED' ? 'bg-green-50' :
                    result.status === 'SKIPPED' ? 'bg-amber-50' :
                    'bg-red-50'}
                `}>
                  <CardTitle className="flex items-center">
                    {result.status === 'FIXED' ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500 mr-2" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
                    )}
                    Subscription {result.id}
                  </CardTitle>
                  <CardDescription>
                    Status: {result.status}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    {result.message && <p>{result.message}</p>}
                    {result.reason && <p>Reason: {result.reason}</p>}
                    {result.error && <p className="text-red-500">Error: {result.error}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}