import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Calendar, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface SubscriptionHistoryProps {
  userId?: number;
}

export function SubscriptionHistory({ userId }: SubscriptionHistoryProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [history, setHistory] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    fetchSubscriptionHistory();
  }, []);
  
  const fetchSubscriptionHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await fetch('/api/subscription/history');
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch subscription history');
      }
      
      setHistory(data.history || []);
    } catch (error: any) {
      setError(error.message || 'An error occurred while fetching subscription history');
      toast({
        title: 'Error',
        description: error.message || 'Failed to fetch subscription history',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Format date string
  const formatDate = (dateStr: string) => {
    if (!dateStr) return 'N/A';
    
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };
  
  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active':
        return <Badge className="bg-green-500 text-white border-green-600">Active</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">Cancelled</Badge>;
      case 'expired':
        return <Badge variant="outline" className="bg-gray-100 text-gray-800 border-gray-200">Expired</Badge>;
      case 'paused':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Paused</Badge>;
      default:
        return <Badge variant="outline">{status || 'Unknown'}</Badge>;
    }
  };
  
  // Get package badge
  const getPackageBadge = (packageType: string) => {
    switch (packageType) {
      case 'OPPORTUNITY':
        return <Badge variant="outline" className="bg-zinc-100 border-zinc-300">Opportunity</Badge>;
      case 'MOMENTUM':
        return <Badge variant="outline" className="bg-blue-50 border-blue-300 text-blue-800">Momentum</Badge>;
      case 'PROSPER':
        return <Badge variant="outline" className="bg-green-50 border-green-300 text-green-800">Prosper</Badge>;
      case 'PRESTIGE':
        return <Badge variant="outline" className="bg-purple-50 border-purple-300 text-purple-800">Prestige</Badge>;
      case 'PINNACLE':
        return <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-800">Pinnacle</Badge>;
      default:
        return <Badge variant="outline">{packageType || 'Unknown'}</Badge>;
    }
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Subscription History</CardTitle>
        <CardDescription>
          View your subscription history and payment details
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2">No subscription history available</p>
          </div>
        ) : (
          <Accordion type="single" collapsible className="w-full">
            <Table>
              <TableCaption>Your subscription history</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((subscription, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <TableRow>
                      <TableCell>
                        <AccordionTrigger className="hover:no-underline">
                          {formatDate(subscription.createdAt)}
                        </AccordionTrigger>
                      </TableCell>
                      <TableCell>{getPackageBadge(subscription.packageType)}</TableCell>
                      <TableCell>R{subscription.amount}</TableCell>
                      <TableCell>{getStatusBadge(subscription.status)}</TableCell>
                    </TableRow>
                    <AccordionContent>
                      <div className="px-4 pb-4">
                        <div className="bg-gray-50 p-3 rounded-md grid grid-cols-2 gap-2 text-sm">
                          <div className="text-gray-600">Start Date:</div>
                          <div>{formatDate(subscription.startDate)}</div>
                          
                          <div className="text-gray-600">End Date:</div>
                          <div>{formatDate(subscription.endDate)}</div>
                          
                          <div className="text-gray-600">Subscription ID:</div>
                          <div className="font-mono text-xs">{subscription.id}</div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </TableBody>
            </Table>
          </Accordion>
        )}
      </CardContent>
    </Card>
  );
}