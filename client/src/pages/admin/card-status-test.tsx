import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

type CardStatus = "NOT_DELIVERED" | "OUT_FOR_DELIVERY" | "DELIVERED";

export default function CardStatusTest() {
  const { toast } = useToast();
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [userIds, setUserIds] = useState<string>("10, 11");
  const [cardStatus, setCardStatus] = useState<CardStatus>("OUT_FOR_DELIVERY");
  
  const testCardStatus = async () => {
    try {
      setLoading(true);
      console.log('Testing card status test endpoint...');
      
      // Get token from localStorage if available
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Accept': 'application/json'
      };
      
      // Add token to headers if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('Using Bearer token for authentication');
      } else {
        console.log('No token found in localStorage, using session-based authentication');
      }
      
      const response = await fetch('/api/admin/customers/card-status-test', {
        method: 'GET',
        credentials: 'include',
        headers
      });

      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      setResponse(data);
      
      toast({
        title: "Test result",
        description: `Status: ${response.status} - ${response.status === 200 ? 'Success' : 'Failed'}`,
        variant: response.status === 200 ? "default" : "destructive",
      });
      
    } catch (error) {
      console.error('Error testing card status:', error);
      setResponse({ error: String(error) });
      toast({
        title: "Test failed",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };
  
  const testCardStatusUpdate = async () => {
    try {
      setLoading(true);
      console.log('Testing card status update endpoint...');
      
      // Parse user IDs from comma-separated string to array of numbers
      const userIdArray = userIds.split(',').map(id => parseInt(id.trim(), 10)).filter(id => !isNaN(id));
      
      if (userIdArray.length === 0) {
        throw new Error('Please enter at least one valid user ID');
      }
      
      console.log(`Using user IDs: ${userIdArray.join(', ')} and status: ${cardStatus}`);
      
      // Get token from localStorage if available
      const token = localStorage.getItem('authToken');
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      };
      
      // Add token to headers if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        console.log('Using Bearer token for authentication');
      } else {
        console.log('No token found in localStorage, using session-based authentication');
      }
      
      const response = await fetch('/api/admin/customers/update-card-status', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify({
          userIds: userIdArray,
          cardStatus: cardStatus
        })
      });

      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      setResponse(data);
      
      toast({
        title: "Update test result",
        description: `Status: ${response.status} - ${response.status === 200 ? 'Success' : 'Failed'}`,
        variant: response.status === 200 ? "default" : "destructive",
      });
      
    } catch (error) {
      console.error('Error testing card status update:', error);
      setResponse({ error: String(error) });
      toast({
        title: "Update test failed",
        description: String(error),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Card Status API Test</CardTitle>
          <CardDescription>Test the card status API endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid gap-4">
              <div>
                <Label htmlFor="userIds">User IDs (comma separated)</Label>
                <Input
                  id="userIds"
                  value={userIds}
                  onChange={(e) => setUserIds(e.target.value)}
                  placeholder="10, 11, 12"
                  className="mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Enter user IDs separated by commas
                </p>
              </div>
              
              <div>
                <Label htmlFor="cardStatus">Card Status</Label>
                <Select
                  value={cardStatus}
                  onValueChange={(value) => setCardStatus(value as CardStatus)}
                >
                  <SelectTrigger id="cardStatus" className="mt-1">
                    <SelectValue placeholder="Select card status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NOT_DELIVERED">Not Delivered</SelectItem>
                    <SelectItem value="OUT_FOR_DELIVERY">Out For Delivery</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex gap-4">
              <Button 
                onClick={testCardStatus} 
                disabled={loading}
              >
                Test Auth Endpoint
              </Button>
              
              <Button 
                onClick={testCardStatusUpdate} 
                disabled={loading}
                variant="outline"
              >
                Update Card Status
              </Button>
            </div>
            
            {loading && (
              <div className="flex items-center justify-center">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div>
                <span className="ml-2">Processing...</span>
              </div>
            )}
            
            {response && (
              <div className="p-4 bg-muted rounded-lg">
                <h3 className="font-medium mb-2">Response:</h3>
                <pre className="text-xs overflow-auto max-h-[300px]">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            This page helps debug authentication and API issues with the card status feature.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}