import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2, TrendingUp, Users, BarChart2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type SocialTrafficData = {
  results: Array<{
    id: string;
    name: string;
    sessions: number;
    users: number;
    color: string;
  }>;
  total: {
    sessions: number;
    users: number;
  };
  error?: string;
};

type DeviceType = {
  device: string;
  sessions: number;
};

type TrafficSource = {
  source: string;
  sessions: number;
};

const SocialMediaTracker: React.FC = () => {
  const [timeRange, setTimeRange] = useState<string>('30');
  
  const { data: socialData, isLoading: socialLoading, error: socialError } = useQuery<SocialTrafficData>({
    queryKey: ['/api/analytics/social-traffic', timeRange],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/analytics/social-traffic?days=${timeRange}`);
      return await res.json();
    },
  });
  
  const { data: deviceData, isLoading: deviceLoading } = useQuery<DeviceType[]>({
    queryKey: ['/api/analytics/device-types', timeRange],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/analytics/device-types?days=${timeRange}`);
      return await res.json();
    },
  });
  
  const { data: sourceData, isLoading: sourceLoading } = useQuery<TrafficSource[]>({
    queryKey: ['/api/analytics/traffic-sources', timeRange],
    queryFn: async () => {
      const res = await apiRequest('GET', `/api/analytics/traffic-sources?days=${timeRange}&limit=10`);
      return await res.json();
    },
  });
  
  const isLoading = socialLoading || deviceLoading || sourceLoading;
  const hasError = socialError || !socialData;
  
  const renderSocialChart = () => {
    if (socialData?.results?.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground mb-2">No social media traffic data available for the selected period</p>
          <p className="text-sm text-muted-foreground">Try selecting a different time range or check back later</p>
        </div>
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Social Traffic Distribution</CardTitle>
            <CardDescription>Sessions by social network</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={socialData?.results}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="sessions"
                    nameKey="name"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {socialData?.results?.map((entry) => (
                      <Cell key={entry.id} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => [`${value} sessions`, '']}
                    labelFormatter={(name) => `${name}`}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Social Traffic Comparison</CardTitle>
            <CardDescription>Total sessions per platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={socialData?.results}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                  <XAxis type="number" />
                  <YAxis 
                    dataKey="name" 
                    type="category" 
                    tick={{ fontSize: 12 }}
                    width={80}
                  />
                  <Tooltip />
                  <Bar 
                    dataKey="sessions" 
                    name="Sessions" 
                    fill="#43EB3E"
                    radius={[0, 4, 4, 0]} 
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  const renderDeviceChart = () => {
    const deviceColors = {
      mobile: "#FF6384",
      desktop: "#36A2EB",
      tablet: "#FFCE56"
    };
    
    const formattedDeviceData = deviceData?.map(item => ({
      ...item,
      // @ts-ignore
      color: deviceColors[item.device.toLowerCase()] || "#9966FF"
    }));
    
    if (!deviceData || deviceData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground mb-2">No device data available for the selected period</p>
          <p className="text-sm text-muted-foreground">Try selecting a different time range or check back later</p>
        </div>
      );
    }
    
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Device Types</CardTitle>
          <CardDescription>Sessions by device category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={formattedDeviceData}
                  cx="50%"
                  cy="50%"
                  labelLine={true}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="sessions"
                  nameKey="device"
                  label={({ device, percent }) => `${device}: ${(percent * 100).toFixed(0)}%`}
                >
                  {formattedDeviceData?.map((entry, index) => (
                    // @ts-ignore
                    <Cell key={`device-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => [`${value} sessions`, '']}
                  labelFormatter={(name) => `${name}`}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  const renderSourcesChart = () => {
    if (!sourceData || sourceData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <p className="text-muted-foreground mb-2">No traffic source data available for the selected period</p>
          <p className="text-sm text-muted-foreground">Try selecting a different time range or check back later</p>
        </div>
      );
    }
    
    // Limit to top 10 and sort by sessions
    const sortedData = [...sourceData]
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10);
    
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Top Traffic Sources</CardTitle>
          <CardDescription>Top 10 sources of all traffic</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sortedData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                <XAxis type="number" />
                <YAxis 
                  dataKey="source" 
                  type="category" 
                  tick={{ fontSize: 12 }}
                  width={120}
                />
                <Tooltip />
                <Bar 
                  dataKey="sessions" 
                  name="Sessions" 
                  fill="#011D3D"
                  radius={[0, 4, 4, 0]} 
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    );
  };
  
  const renderOverviewCards = () => {
    if (!socialData) return null;
    
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Sessions</p>
                <h3 className="text-2xl font-bold mt-1">{socialData.total.sessions || 0}</h3>
              </div>
              <div className="h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center">
                <BarChart2 className="h-6 w-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Social Media Sessions</p>
                <h3 className="text-2xl font-bold mt-1">
                  {socialData.results.reduce((sum, item) => sum + item.sessions, 0)}
                </h3>
              </div>
              <div className="h-12 w-12 bg-[#43EB3E]/10 rounded-full flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-[#43EB3E]" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Unique Users</p>
                <h3 className="text-2xl font-bold mt-1">{socialData.total.users || 0}</h3>
              </div>
              <div className="h-12 w-12 bg-blue-500/10 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  if (isLoading) {
    return (
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading analytics data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (hasError) {
    return (
      <Card className="mt-6">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-10">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
            <p className="text-red-500 text-lg font-semibold mb-2">Error loading analytics data</p>
            <p className="text-sm text-muted-foreground text-center mb-4">
              {socialData?.error || "Unable to access Google Analytics data"}
            </p>
            <div className="bg-amber-50 border border-amber-200 p-4 rounded-md max-w-lg text-sm">
              <p className="font-medium text-amber-800 mb-2">Troubleshooting steps:</p>
              <ol className="text-amber-700 space-y-2 list-decimal pl-4">
                <li>Verify that your Google Analytics account is properly configured</li>
                <li>Ensure the service account has access to the Google Analytics property</li>
                <li>Check that the GOOGLE_ANALYTICS_PRIVATE_KEY and GOOGLE_ANALYTICS_CLIENT_EMAIL are correctly set</li>
                <li>Confirm that the VITE_GA_MEASUREMENT_ID is a valid Google Analytics 4 property ID</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Social Media Traffic Analytics</h2>
        <div className="flex items-center">
          <span className="mr-2 text-sm text-muted-foreground">Time Range:</span>
          <Select
            value={timeRange}
            onValueChange={(value) => setTimeRange(value)}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="180">Last 6 months</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      {renderOverviewCards()}
      
      <Tabs defaultValue="social">
        <TabsList className="mb-4">
          <TabsTrigger value="social">Social Networks</TabsTrigger>
          <TabsTrigger value="devices">Device Types</TabsTrigger>
          <TabsTrigger value="sources">Traffic Sources</TabsTrigger>
        </TabsList>
        
        <TabsContent value="social" className="space-y-4">
          {renderSocialChart()}
        </TabsContent>
        
        <TabsContent value="devices">
          {renderDeviceChart()}
        </TabsContent>
        
        <TabsContent value="sources">
          {renderSourcesChart()}
        </TabsContent>
      </Tabs>
      
      <Separator className="my-6" />
      
      <div className="text-xs text-muted-foreground">
        <p>* Data sourced from Google Analytics for the selected time period.</p>
        <p>* Social media traffic includes referrals from recognized social platforms like Facebook, Twitter, Instagram, and LinkedIn.</p>
      </div>
    </div>
  );
};

export default SocialMediaTracker;