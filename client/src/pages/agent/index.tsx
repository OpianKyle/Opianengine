import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

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
  
  // Query to fetch the agent's commissions with optimizations
  const { data: commissionData, isLoading: isCommissionsLoading } = useQuery({
    queryKey: ['/api/referral/agent/commissions'],
    queryFn: async () => {
      const response = await fetch('/api/referral/agent/commissions');
      if (!response.ok) {
        throw new Error('Failed to fetch commissions');
      }
      const data = await response.json();
      console.log('Commission data received:', data);
      return data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes before refetching (server cache is 5 minutes)
    gcTime: 5 * 60 * 1000, // 5 minutes before removing from cache (cacheTime is renamed to gcTime in React Query v5)
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });
  
  // Extract and filter commissions based on the selected type
  const allCommissions: Commission[] = commissionData?.commissions || [];
  const commissions = filterType === 'all' 
    ? allCommissions 
    : allCommissions.filter((c: Commission) => 
        filterType === 'upfront' ? !c.isRenewal : c.isRenewal
      );

  // Query to fetch the agent statistics
  const { data: statistics, isLoading: isStatsLoading } = useQuery<AgentStatistics>({
    queryKey: ['/api/agent/statistics'],
    queryFn: async () => {
      const response = await fetch('/api/agent/statistics');
      if (!response.ok) {
        throw new Error('Failed to fetch agent statistics');
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes before refetching
    gcTime: 5 * 60 * 1000, // 5 minutes before removing from cache
    refetchOnWindowFocus: false,
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
        <Card className="bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-16 animate-pulse bg-muted rounded"></div>
            ) : (
              <p className="text-2xl font-bold">{statistics?.totalCustomers || 0}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Active Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-16 animate-pulse bg-muted rounded"></div>
            ) : (
              <p className="text-2xl font-bold">{statistics?.activeCustomers || 0}</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Total Points Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-8 w-24 animate-pulse bg-muted rounded"></div>
            ) : (
              <p className="text-2xl font-bold">{statistics?.totalPoints?.toLocaleString() || 0}</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Commission Dashboard Section */}
      <Card>
        <CardHeader>
          <CardTitle>Commission Dashboard</CardTitle>
          <CardDescription>
            Track your commission earnings from referrals and renewals.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <Card 
              className={`cursor-pointer hover:shadow-md transition-shadow ${filterType === 'upfront' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFilterType(filterType === 'upfront' ? 'all' : 'upfront')}
            >
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Upfront Sign Ups (30%)</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <>
                    <div className="h-8 w-20 animate-pulse bg-muted rounded mb-2"></div>
                    <div className="h-3 w-32 animate-pulse bg-muted rounded"></div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      R{calculateTotalCommission(false).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      From {allCommissions.filter((c: Commission) => !c.isRenewal).length} customer registrations
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card 
              className={`cursor-pointer hover:shadow-md transition-shadow ${filterType === 'renewal' ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setFilterType(filterType === 'renewal' ? 'all' : 'renewal')}
            >
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Renewals (10%)</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <>
                    <div className="h-8 w-20 animate-pulse bg-muted rounded mb-2"></div>
                    <div className="h-3 w-32 animate-pulse bg-muted rounded"></div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      R{calculateTotalCommission(true).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      From {allCommissions.filter((c: Commission) => c.isRenewal).length} customer renewals
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="bg-primary/5">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Potential Commissions</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <>
                    <div className="h-8 w-20 animate-pulse bg-muted rounded mb-2"></div>
                    <div className="h-3 w-32 animate-pulse bg-muted rounded"></div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      R{(calculateTotalCommission(false) + calculateTotalCommission(true)).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      From {allCommissions.length} transactions
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <>
                    <div className="h-8 w-16 animate-pulse bg-muted rounded mb-2"></div>
                    <div className="h-3 w-32 animate-pulse bg-muted rounded"></div>
                  </>
                ) : (
                  <>
                    <div className="text-2xl font-bold">
                      {allCommissions.length > 0 ? 
                        `${((allCommissions.filter((c: Commission) => !c.isRenewal).length / 
                        Math.max(allCommissions.length, 1)) * 100).toFixed(1)}%` : 
                        '0%'}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Of leads converted to customers
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
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