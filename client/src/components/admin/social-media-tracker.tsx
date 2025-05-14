import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Loader2, TrendingUp, Users, BarChart2, AlertTriangle, RefreshCw, Download, Globe, Monitor, Smartphone, Tablet, Facebook, Twitter, Instagram, Linkedin, Youtube, Search, MessagesSquare, ArrowUpDown, MessageCircle, Share2, Mail } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { saveAs } from 'file-saver';

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

// Type definition for items we'll export
type ExportItem = {
  name?: string;
  source?: string;
  device?: string;
  sessions: number;
  users?: number;
  percentage?: number;
  color?: string;
};

// Color mapping for different social networks and traffic sources
const SOCIAL_COLORS = {
  facebook: '#1877F2',
  twitter: '#1DA1F2',
  instagram: '#E4405F',
  linkedin: '#0A66C2',
  pinterest: '#BD081C',
  youtube: '#FF0000',
  google: '#4285F4',
  reddit: '#FF4500',
  tiktok: '#000000',
  medium: '#00AB6C',
  direct: '#6B7280',
  referral: '#2563EB',
  organic: '#16A34A',
  email: '#8B5CF6',
  paid: '#F59E0B',
  other: '#9CA3AF',
};

// Device type colors
const DEVICE_COLORS = {
  desktop: '#2563EB',
  mobile: '#16A34A',
  tablet: '#8B5CF6',
  other: '#9CA3AF',
};

// Function to get an appropriate icon for a source
const getSourceIcon = (source: string) => {
  const sourceLower = source.toLowerCase();
  
  if (sourceLower.includes('facebook')) return <Facebook className="text-[#1877F2]" />;
  if (sourceLower.includes('twitter') || sourceLower.includes('x.com')) return <Twitter className="text-[#1DA1F2]" />;
  if (sourceLower.includes('instagram')) return <Instagram className="text-[#E4405F]" />;
  if (sourceLower.includes('linkedin')) return <Linkedin className="text-[#0A66C2]" />;
  if (sourceLower.includes('pinterest')) return <Share2 className="text-[#BD081C]" />;
  if (sourceLower.includes('youtube')) return <Youtube className="text-[#FF0000]" />;
  if (sourceLower.includes('google')) return <Search className="text-[#4285F4]" />;
  if (sourceLower.includes('reddit')) return <MessageCircle className="text-[#FF4500]" />;
  if (sourceLower.includes('medium')) return <MessagesSquare className="text-[#00AB6C]" />;
  if (sourceLower.includes('email') || sourceLower.includes('mail')) return <Mail className="text-[#8B5CF6]" />;
  if (sourceLower.includes('direct')) return <ArrowUpDown className="text-[#6B7280]" />;
  
  // Default icon for other sources
  return <Globe className="text-gray-500" />;
};

// Function to get device type icon
const getDeviceIcon = (device: string) => {
  const deviceLower = device.toLowerCase();
  
  if (deviceLower.includes('desktop')) return <Monitor className="text-[#2563EB]" />;
  if (deviceLower.includes('mobile')) return <Smartphone className="text-[#16A34A]" />;
  if (deviceLower.includes('tablet')) return <Tablet className="text-[#8B5CF6]" />;
  
  // Default icon
  return <Globe className="text-gray-500" />;
};

// Function to get a color for a source
const getSourceColor = (source: string): string => {
  const sourceLower = source.toLowerCase();
  
  if (sourceLower.includes('facebook')) return SOCIAL_COLORS.facebook;
  if (sourceLower.includes('twitter') || sourceLower.includes('x.com')) return SOCIAL_COLORS.twitter;
  if (sourceLower.includes('instagram')) return SOCIAL_COLORS.instagram;
  if (sourceLower.includes('linkedin')) return SOCIAL_COLORS.linkedin;
  if (sourceLower.includes('pinterest')) return SOCIAL_COLORS.pinterest;
  if (sourceLower.includes('youtube')) return SOCIAL_COLORS.youtube;
  if (sourceLower.includes('google')) return SOCIAL_COLORS.google;
  if (sourceLower.includes('reddit')) return SOCIAL_COLORS.reddit;
  if (sourceLower.includes('tiktok')) return SOCIAL_COLORS.tiktok;
  if (sourceLower.includes('medium')) return SOCIAL_COLORS.medium;
  if (sourceLower.includes('direct')) return SOCIAL_COLORS.direct;
  if (sourceLower.includes('referral')) return SOCIAL_COLORS.referral;
  if (sourceLower.includes('organic')) return SOCIAL_COLORS.organic;
  if (sourceLower.includes('email')) return SOCIAL_COLORS.email;
  if (sourceLower.includes('paid')) return SOCIAL_COLORS.paid;
  
  // Default color for other sources
  return SOCIAL_COLORS.other;
};

// Helper function to convert array data to CSV format
const convertToCSV = (data: ExportItem[], headers: string[]) => {
  if (!data || data.length === 0) return '';
  
  // Create the CSV header row
  const headerRow = headers.join(',');
  
  // Create the data rows
  const dataRows = data.map(item => {
    return headers.map(header => {
      // Handle special case for header mappings
      let value = '';
      
      switch (header) {
        case 'Network':
          value = item.name || item.source || item.device || '';
          break;
        case 'Sessions':
          value = item.sessions || 0;
          break;
        case 'Users':
          value = item.users || 0;
          break;
        case 'Percentage':
          // This will be calculated on export
          value = '';
          break;
        default:
          // For any other headers, try to get the value from the item
          value = item[header.toLowerCase()] || '';
      }
      
      // Quote strings containing commas
      const stringValue = String(value);
      return stringValue.includes(',') ? `"${stringValue}"` : stringValue;
    }).join(',');
  });
  
  // Combine header and data rows
  return [headerRow, ...dataRows].join('\n');
};

const SocialMediaTracker: React.FC = () => {
  const [timeRange, setTimeRange] = useState<string>('30');
  
  const { data: socialData, isLoading: socialLoading, error: socialError } = useQuery<SocialTrafficData>({
    queryKey: ['/api/analytics/social-traffic', timeRange],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/analytics/social-traffic?days=${timeRange}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || `API request failed with status: ${res.status}`);
        }
        return await res.json();
      } catch (err) {
        console.error('Social traffic API error:', err);
        throw err;
      }
    },
  });
  
  const { data: deviceData, isLoading: deviceLoading } = useQuery<DeviceType[]>({
    queryKey: ['/api/analytics/device-types', timeRange],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/analytics/device-types?days=${timeRange}`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || `API request failed with status: ${res.status}`);
        }
        return await res.json();
      } catch (err) {
        console.error('Device types API error:', err);
        throw err;
      }
    },
  });
  
  const { data: sourceData, isLoading: sourceLoading } = useQuery<TrafficSource[]>({
    queryKey: ['/api/analytics/traffic-sources', timeRange],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/analytics/traffic-sources?days=${timeRange}&limit=10`);
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || `API request failed with status: ${res.status}`);
        }
        return await res.json();
      } catch (err) {
        console.error('Traffic sources API error:', err);
        throw err;
      }
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
      <div className="space-y-6">
        {/* Data Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Social Traffic Data</CardTitle>
            <CardDescription>Detailed session data by social network</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Network</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">Users</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {socialData?.results.map((network) => {
                  const percentage = socialData.total.sessions 
                    ? ((network.sessions / socialData.total.sessions) * 100).toFixed(1) 
                    : '0.0';
                    
                  return (
                    <TableRow key={network.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-6 h-6 flex items-center justify-center">
                            {getSourceIcon(network.name)}
                          </span>
                          <span>{network.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{network.sessions}</TableCell>
                      <TableCell className="text-right">{network.users}</TableCell>
                      <TableCell className="text-right">{percentage}%</TableCell>
                    </TableRow>
                  );
                })}
                {/* Total Row */}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold">{socialData.total.sessions}</TableCell>
                  <TableCell className="text-right font-semibold">{socialData.total.users}</TableCell>
                  <TableCell className="text-right font-semibold">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Charts */}
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
                      data={socialData?.results.filter(item => item.sessions > 0)}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="sessions"
                      nameKey="name"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {socialData?.results?.filter(item => item.sessions > 0).map((entry) => (
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
                    data={socialData?.results.filter(item => item.sessions > 0)}
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
    
    // Calculate total sessions for percentages
    const totalSessions = deviceData.reduce((sum, device) => sum + device.sessions, 0);
    
    return (
      <div className="space-y-6">
        {/* Device Data Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Device Types</CardTitle>
            <CardDescription>Sessions by device category</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Device Type</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {formattedDeviceData?.map((device, index) => {
                  const percentage = totalSessions 
                    ? ((device.sessions / totalSessions) * 100).toFixed(1) 
                    : '0.0';
                    
                  return (
                    <TableRow key={`device-row-${index}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-6 h-6 flex items-center justify-center">
                            {getDeviceIcon(device.device)}
                          </span>
                          <span>{device.device}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{device.sessions}</TableCell>
                      <TableCell className="text-right">{percentage}%</TableCell>
                    </TableRow>
                  );
                })}
                {/* Total Row */}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold">{totalSessions}</TableCell>
                  <TableCell className="text-right font-semibold">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Device Distribution</CardTitle>
            <CardDescription>Visual breakdown by device type</CardDescription>
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
      </div>
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
    
    // Calculate total for percentages
    const totalSessions = sortedData.reduce((sum, source) => sum + source.sessions, 0);
    
    return (
      <div className="space-y-6">
        {/* Traffic Sources Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Top Traffic Sources</CardTitle>
            <CardDescription>Top 10 sources of all traffic</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Traffic Source</TableHead>
                  <TableHead className="text-right">Sessions</TableHead>
                  <TableHead className="text-right">% of Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedData.map((source, index) => {
                  const percentage = totalSessions 
                    ? ((source.sessions / totalSessions) * 100).toFixed(1) 
                    : '0.0';
                    
                  return (
                    <TableRow key={`source-${index}`}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="inline-block w-6 h-6 flex items-center justify-center">
                            {getSourceIcon(source.source)}
                          </span>
                          <span className="font-medium">{source.source}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{source.sessions}</TableCell>
                      <TableCell className="text-right">{percentage}%</TableCell>
                    </TableRow>
                  );
                })}
                {/* Total Row */}
                <TableRow className="bg-muted/50">
                  <TableCell className="font-semibold">Total</TableCell>
                  <TableCell className="text-right font-semibold">{totalSessions}</TableCell>
                  <TableCell className="text-right font-semibold">100%</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        
        {/* Visual Chart */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Traffic Sources Visualization</CardTitle>
            <CardDescription>Visual breakdown of traffic by source</CardDescription>
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
      </div>
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
                <li className="font-medium">Add the Google service account to your GA4 property:
                  <div className="mt-1 p-2 bg-white rounded border border-amber-100">
                    <p className="break-all font-mono text-xs">social-tracker@opianrewards-459707.iam.gserviceaccount.com</p>
                    <p className="text-xs mt-1">Go to: GA4 Admin → Access Management → Add → Add users</p>
                    <p className="text-xs mt-1">Give it "Editor" permissions</p>
                  </div>
                </li>
                <li>Verify that your Google Analytics account is properly configured</li>
                <li>Check that your credentials file is properly set up in the server</li>
                <li>Confirm that the GA_PROPERTY_ID is set to your numeric property ID</li>
              </ol>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  // Function to refresh the data
  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ['/api/analytics/social-traffic'] });
    queryClient.invalidateQueries({ queryKey: ['/api/analytics/device-types'] });
    queryClient.invalidateQueries({ queryKey: ['/api/analytics/traffic-sources'] });
  };
  
  // Function to export social media data to CSV
  const exportSocialData = () => {
    if (!socialData || !socialData.results || socialData.results.length === 0) return;
    
    const totalSessions = socialData.total.sessions;
    
    // Add percentage calculations to data
    const exportData = socialData.results.map(item => ({
      ...item,
      percentage: totalSessions ? Number(((item.sessions / totalSessions) * 100).toFixed(1)) : 0
    }));
    
    // Define headers for CSV
    const headers = ['Network', 'Sessions', 'Users', 'Percentage'];
    
    // Convert data to CSV
    const csvContent = convertToCSV(exportData, headers);
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `social-media-traffic-${timeRange}-days.csv`);
  };
  
  // Function to export device data to CSV
  const exportDeviceData = () => {
    if (!deviceData || deviceData.length === 0) return;
    
    const totalSessions = deviceData.reduce((sum, device) => sum + device.sessions, 0);
    
    // Add percentage calculations to data
    const exportData = deviceData.map(item => ({
      ...item,
      percentage: totalSessions ? Number(((item.sessions / totalSessions) * 100).toFixed(1)) : 0
    }));
    
    // Define headers for CSV
    const headers = ['Network', 'Sessions', 'Percentage'];
    
    // Convert data to CSV
    const csvContent = convertToCSV(exportData, headers);
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `device-types-${timeRange}-days.csv`);
  };
  
  // Function to export traffic sources data to CSV
  const exportSourcesData = () => {
    if (!sourceData || sourceData.length === 0) return;
    
    // Sort and limit to top 10
    const sortedData = [...sourceData]
      .sort((a, b) => b.sessions - a.sessions)
      .slice(0, 10);
    
    const totalSessions = sortedData.reduce((sum, source) => sum + source.sessions, 0);
    
    // Add percentage calculations to data
    const exportData = sortedData.map(item => ({
      ...item,
      percentage: totalSessions ? Number(((item.sessions / totalSessions) * 100).toFixed(1)) : 0
    }));
    
    // Define headers for CSV
    const headers = ['Network', 'Sessions', 'Percentage'];
    
    // Convert data to CSV
    const csvContent = convertToCSV(exportData, headers);
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    saveAs(blob, `traffic-sources-${timeRange}-days.csv`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Social Media Traffic Analytics</h2>
        <div className="flex items-center space-x-4">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshData}
            disabled={isLoading}
            className="flex items-center"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          
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
      </div>
      
      {renderOverviewCards()}
      
      <Tabs defaultValue="social">
        <TabsList className="mb-4">
          <TabsTrigger value="social">Social Networks</TabsTrigger>
          <TabsTrigger value="devices">Device Types</TabsTrigger>
          <TabsTrigger value="sources">Traffic Sources</TabsTrigger>
        </TabsList>
        
        <TabsContent value="social" className="space-y-4">
          <div className="flex justify-end mb-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportSocialData}
              disabled={!socialData || !socialData.results || socialData.results.length === 0}
              className="flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          {renderSocialChart()}
        </TabsContent>
        
        <TabsContent value="devices">
          <div className="flex justify-end mb-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportDeviceData}
              disabled={!deviceData || deviceData.length === 0}
              className="flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          {renderDeviceChart()}
        </TabsContent>
        
        <TabsContent value="sources">
          <div className="flex justify-end mb-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportSourcesData}
              disabled={!sourceData || sourceData.length === 0}
              className="flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
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