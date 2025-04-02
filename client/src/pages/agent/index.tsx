import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

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
}

export default function AgentDashboard() {
  // Query to fetch the agent's commissions with optimizations
  const { data: commissions = [], isLoading: isCommissionsLoading } = useQuery({
    queryKey: ['/api/referral/agent/commissions'],
    queryFn: async () => {
      const response = await fetch('/api/referral/agent/commissions');
      if (!response.ok) {
        throw new Error('Failed to fetch commissions');
      }
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes before refetching (server cache is 5 minutes)
    gcTime: 5 * 60 * 1000, // 5 minutes before removing from cache (cacheTime is renamed to gcTime in React Query v5)
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });

  const calculateTotalCommission = (isRenewal: boolean = false) => {
    return commissions
      .filter(commission => commission.isRenewal === isRenewal)
      .reduce((sum, commission) => sum + commission.commissionAmount, 0);
  };

  if (isCommissionsLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading commission data...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full">
      <h1 className="text-3xl font-bold">Agent Dashboard</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Total Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Active Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
          </CardContent>
        </Card>

        <Card className="bg-white/5 backdrop-blur-sm">
          <CardHeader>
            <CardTitle>Total Points Assigned</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">0</p>
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
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">First-time Signups (30%)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R{calculateTotalCommission(false).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {commissions.filter(c => !c.isRenewal).length} customer registrations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Renewals (10%)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R{calculateTotalCommission(true).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {commissions.filter(c => c.isRenewal).length} customer renewals
                </p>
              </CardContent>
            </Card>

            <Card className="bg-primary/5">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  R{(calculateTotalCommission(false) + calculateTotalCommission(true)).toFixed(2)}
                </div>
                <p className="text-xs text-muted-foreground">
                  From {commissions.length} transactions
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {commissions.length > 0 ? 
                    `${((commissions.filter(c => !c.isRenewal).length / 
                    Math.max(commissions.length, 1)) * 100).toFixed(1)}%` : 
                    '0%'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Of leads converted to customers
                </p>
              </CardContent>
            </Card>
          </div>

          {commissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Customer</th>
                    <th className="text-left p-2">Package</th>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Type</th>
                    <th className="text-right p-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {commissions.map((commission) => (
                    <tr key={commission.id} className="border-b hover:bg-muted/50">
                      <td className="p-2">{commission.customerName}</td>
                      <td className="p-2">{commission.packageName}</td>
                      <td className="p-2">{new Date(commission.commissionDate).toLocaleDateString()}</td>
                      <td className="p-2">
                        {commission.isRenewal ? (
                          <span className="text-amber-500">Renewal (10%)</span>
                        ) : (
                          <span className="text-green-500">New (30%)</span>
                        )}
                      </td>
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