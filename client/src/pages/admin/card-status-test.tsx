import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function CardStatusTest() {
  const { toast } = useToast();
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  const testCardStatus = async () => {
    try {
      setLoading(true);
      console.log('Testing card status test endpoint...');
      const response = await fetch('/api/admin/customers/card-status-test', {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });

      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      setResponse(data);
      
      toast({
        title: "Test result",
        description: `Status: ${response.status}`,
        variant: response.status === 200 ? "default" : "destructive",
      });
      
    } catch (error) {
      console.error('Error testing card status:', error);
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
      const response = await fetch('/api/admin/customers/update-card-status', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          userIds: [10, 11], // Use real user IDs or it will fail with a 400 error
          cardStatus: 'OUT_FOR_DELIVERY'
        })
      });

      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      setResponse(data);
      
      toast({
        title: "Update test result",
        description: `Status: ${response.status}`,
        variant: response.status === 200 ? "default" : "destructive",
      });
      
    } catch (error) {
      console.error('Error testing card status update:', error);
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
          <div className="space-y-4">
            <Button 
              onClick={testCardStatus} 
              disabled={loading}
              className="mr-4"
            >
              Test Auth Endpoint
            </Button>
            
            <Button 
              onClick={testCardStatusUpdate} 
              disabled={loading}
              variant="outline"
            >
              Test Update Endpoint
            </Button>
            
            {response && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
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