import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

/**
 * Test component to verify Google Analytics integration is working
 * This will attempt to fetch data from the /api/analytics endpoints
 */
export function AnalyticsTest() {
  const [deviceData, setDeviceData] = useState<any>(null);
  const [socialData, setSocialData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalyticsData() {
      setLoading(true);
      setError(null);
      
      try {
        // Try to fetch device types data (doesn't require authentication for test purposes)
        const deviceResponse = await fetch('/api/analytics/device-types?days=30');
        const deviceResult = await deviceResponse.json();
        setDeviceData(deviceResult);
        
        // Try to fetch social traffic data
        const socialResponse = await fetch('/api/analytics/social-traffic?days=30');
        const socialResult = await socialResponse.json();
        setSocialData(socialResult);
      } catch (err) {
        console.error('Error fetching analytics data:', err);
        setError('Failed to fetch analytics data. Check console for details.');
      } finally {
        setLoading(false);
      }
    }
    
    fetchAnalyticsData();
  }, []);
  
  if (loading) {
    return (
      <Card className="w-full max-w-3xl mx-auto mt-8">
        <CardHeader>
          <CardTitle>Analytics Test</CardTitle>
          <CardDescription>Testing Google Analytics integration...</CardDescription>
        </CardHeader>
        <CardContent className="flex justify-center py-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card className="w-full max-w-3xl mx-auto mt-8 border-red-200">
        <CardHeader className="bg-red-50">
          <CardTitle className="text-red-700">Analytics Test Error</CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <p>Please check that:</p>
          <ul className="list-disc ml-6 mt-2 space-y-1">
            <li>Google Analytics credentials are properly configured</li>
            <li>The necessary environment variables are set</li>
            <li>The Google Analytics API is accessible from your environment</li>
          </ul>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="w-full max-w-3xl mx-auto mt-8">
      <CardHeader>
        <CardTitle>Analytics Test Results</CardTitle>
        <CardDescription>Showing responses from Google Analytics API endpoints</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Device Types Data:</h3>
            <pre className="bg-slate-100 p-4 rounded-md overflow-auto max-h-40 text-xs">
              {JSON.stringify(deviceData, null, 2)}
            </pre>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Social Traffic Data:</h3>
            <pre className="bg-slate-100 p-4 rounded-md overflow-auto max-h-40 text-xs">
              {JSON.stringify(socialData, null, 2)}
            </pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}