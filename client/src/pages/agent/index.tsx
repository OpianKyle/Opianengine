import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { Loader2, Users, UserCheck, Award } from 'lucide-react';
import { useState } from 'react';
import AnimatedMetric from "@/components/shared/animated-metric";

// Commission record type
interface Commission {
  id: number;
  customerId: number;
  agentId: number;
  customerName: string;
  packageName: string;
  isRenewal: boolean;
  commissionAmount: number;
  commissionDate: string;
  paidOut: boolean;
  packagePrice: number;
  email: string;
}

// Agent statistics type
interface AgentStatistics {
  totalCustomers: number;
  activeCustomers: number;
  totalPoints: number;
  totalCommissions: number;
  packageDistribution: Record<string, number>;
}

export default function AgentDashboard() {
  // State for filtering commissions by type
  const [filterType, setFilterType] = useState<'all' | 'upfront' | 'renewal'>('all');
  // State to track manual refresh
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Query to fetch the agent's commissions with optimizations
  const { data: commissionData, isLoading: isCommissionsLoading, refetch: refetchCommissions } = useQuery({
    queryKey: ['/api/referral/agent/commissions'],
    queryFn: async () => {
      console.log('Fetching fresh commission data...');
      // Add timestamp to ensure no caching at the browser level
      const response = await fetch(`/api/referral/agent/commissions?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch commissions');
      }
      const data = await response.json();
      console.log('Commission data received:', data);
      return data;
    },
    staleTime: 0, // Always consider data stale immediately
    gcTime: 5 * 60 * 1000, // 5 minutes before removing from cache
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });
  
  // Extract and filter commissions based on the selected type
  console.log('Raw commission data received:', commissionData);
  
  const allCommissions: Commission[] = commissionData?.commissions || [];
  console.log('Extracted commissions array:', allCommissions);
  
  const commissions = filterType === 'all' 
    ? allCommissions 
    : allCommissions.filter((c: Commission) => 
        filterType === 'upfront' ? !c.isRenewal : c.isRenewal
      );
      
  console.log('Filtered commissions:', commissions);

  // Query to fetch the agent statistics with fresh data
  const { data: statistics, isLoading: isStatsLoading, refetch: refetchStatistics } = useQuery<AgentStatistics>({
    queryKey: ['/api/agent/statistics'],
    queryFn: async () => {
      console.log('Fetching fresh agent statistics...');
      // Add timestamp to ensure no caching at the browser level
      const response = await fetch(`/api/agent/statistics?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch agent statistics');
      }
      const data = await response.json();
      console.log('Agent statistics received:', data);
      return data;
    },
    staleTime: 0, // Always consider data stale immediately
    gcTime: 5 * 60 * 1000, // 5 minutes before removing from cache
    refetchOnWindowFocus: true, // Refetch when window regains focus
  });

  const calculateTotalCommission = (isRenewal: boolean = false): number => {
    return commissions
      .filter((commission: Commission) => commission.isRenewal === isRenewal)
      .reduce((sum: number, commission: Commission) => sum + commission.commissionAmount, 0);
  };

  // Instead of showing a full page loader, we'll render the dashboard with skeleton placeholders
  const isLoading = isCommissionsLoading || isStatsLoading;

  return (
    <div className="space-y-6 h-full">
      <h1 className="text-3xl font-bold">Agent Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <AnimatedMetric
          title="Total Customers"
          value={statistics?.totalCustomers || 0}
          icon={Users}
          description="All customers assigned to you"
          isLoading={isLoading}
          delay={100}
          colorScheme="primary"
        />
        
        <AnimatedMetric
          title="Active Customers"
          value={statistics?.activeCustomers || 0}
          icon={UserCheck}
          description="Customers with active packages"
          isLoading={isLoading}
          delay={250}
          colorScheme="success"
        />
        
        <AnimatedMetric
          title="Total Points Assigned"
          value={statistics?.totalPoints || 0}
          icon={Award}
          description="Points assigned to your customers"
          isLoading={isLoading}
          delay={400}
          colorScheme="warning"
        />
      </div>

      {/* Commission Dashboard Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div>
            <CardTitle>Commission Dashboard</CardTitle>
            <CardDescription>
              Track your commission earnings from referrals and renewals.
            </CardDescription>
          </div>
          <button
            onClick={async () => {
              setIsRefreshing(true);
              try {
                await Promise.all([
                  refetchCommissions(),
                  // Also refetch statistics when refreshing commissions
                  refetchStatistics(),
                ]);
                console.log("Manually refreshed commission and statistics data");
              } catch (error) {
                console.error("Error refreshing data:", error);
              } finally {
                setIsRefreshing(false);
              }
            }}
            disabled={isLoading || isRefreshing}
            className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-9 px-4 py-2"
          >
            {isRefreshing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Refreshing...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" className="-ml-0.5 mr-1.5 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Refresh Data
              </>
            )}
          </button>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <div 
              className={`cursor-pointer ${filterType === 'upfront' ? 'ring-2 ring-primary rounded-lg' : ''}`}
              onClick={() => setFilterType(filterType === 'upfront' ? 'all' : 'upfront')}
            >
              <AnimatedMetric
                title="Upfront Sign Ups (30%)"
                value={calculateTotalCommission(false)}
                prefix="R"
                formatter={(val) => val.toFixed(2)}
                description={`From ${allCommissions.filter((c: Commission) => !c.isRenewal).length} customer registrations`}
                isLoading={isLoading}
                delay={100}
                colorScheme={filterType === 'upfront' ? 'primary' : 'default'}
                className="hover:shadow-md transition-shadow"
              />
            </div>

            <div 
              className={`cursor-pointer ${filterType === 'renewal' ? 'ring-2 ring-primary rounded-lg' : ''}`}
              onClick={() => setFilterType(filterType === 'renewal' ? 'all' : 'renewal')}
            >
              <AnimatedMetric
                title="Renewals (10%)"
                value={calculateTotalCommission(true)}
                prefix="R"
                formatter={(val) => val.toFixed(2)}
                description={`From ${allCommissions.filter((c: Commission) => c.isRenewal).length} customer renewals`}
                isLoading={isLoading}
                delay={250}
                colorScheme={filterType === 'renewal' ? 'primary' : 'default'}
                className="hover:shadow-md transition-shadow"
              />
            </div>

            <AnimatedMetric
              title="Potential Commissions"
              value={calculateTotalCommission(false) + calculateTotalCommission(true)}
              prefix="R"
              formatter={(val) => val.toFixed(2)}
              description={`From ${allCommissions.length} transactions`}
              isLoading={isLoading}
              delay={400}
              colorScheme="success"
              className="bg-primary/5"
            />

            <AnimatedMetric
              title="Conversion Rate"
              value={allCommissions.length > 0 ? 
                ((allCommissions.filter((c: Commission) => !c.isRenewal).length / 
                Math.max(allCommissions.length, 1)) * 100) : 0}
              suffix="%"
              formatter={(val) => val.toFixed(1)}
              description="Of leads converted to customers"
              isLoading={isLoading}
              delay={550}
              colorScheme="warning"
            />
          </div>
          
          {/* Filter status indicator */}
          {filterType !== 'all' && (
            <div className="mb-4 p-2 bg-muted/30 rounded-md text-sm flex items-center justify-between">
              <span>
                Showing {filterType === 'upfront' ? 'Upfront Sign Ups' : 'Renewals'} only 
                ({commissions.length} of {allCommissions.length})
              </span>
              <button 
                className="text-primary hover:underline"
                onClick={() => setFilterType('all')}
              >
                Clear filter
              </button>
            </div>
          )}

          {isLoading ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Customer</th>
                    <th className="text-left p-2">Package</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-right p-2">Package Price</th>
                    <th className="text-right p-2">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2"><div className="h-4 w-32 animate-pulse bg-muted rounded"></div></td>
                      <td className="p-2"><div className="h-4 w-24 animate-pulse bg-muted rounded"></div></td>
                      <td className="p-2"><div className="h-4 w-24 animate-pulse bg-muted rounded"></div></td>
                      <td className="p-2"><div className="h-4 w-20 animate-pulse bg-muted rounded"></div></td>
                      <td className="p-2 text-right"><div className="h-4 w-16 ml-auto animate-pulse bg-muted rounded"></div></td>
                      <td className="p-2 text-right"><div className="h-4 w-16 ml-auto animate-pulse bg-muted rounded"></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : commissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Customer</th>
                    <th className="text-left p-2">Package</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-right p-2">Package Price</th>
                    <th className="text-right p-2">Commission</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((commission: Commission) => (
                    <tr key={commission.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">{commission.customerName}</td>
                      <td className="p-2">{commission.packageName}</td>
                      <td className="p-2">{new Date(commission.commissionDate).toLocaleDateString()}</td>
                      <td className="p-2">
                        {commission.isRenewal ? (
                          <span className="text-amber-500">Renewal (10%)</span>
                        ) : (
                          <span className="text-green-500">Upfront (30%)</span>
                        )}
                      </td>
                      <td className="p-2 text-right">R{commission.packagePrice?.toFixed(2) || "0.00"}</td>
                      <td className="p-2 text-right">R{commission.commissionAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No commission records yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}