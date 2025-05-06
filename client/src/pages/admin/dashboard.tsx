import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Users, ShoppingBag, TrendingUp, Award } from 'lucide-react';
import { formatTransactionType } from "@/lib/utils";
import { getQueryFn } from "@/lib/queryClient";
import AnimatedMetric from "@/components/shared/animated-metric";

interface DashboardStats {
  totalCustomers: number;
  totalPoints: number;
  activeRewards: number;
  totalRedemptions: number;
  recentTransactions: Array<{
    date: string;
    points: number;
    type: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
  }>;
}

export default function AdminDashboard() {
  const { data: stats, isLoading, error } = useQuery<DashboardStats>({
    queryKey: ["/api/admin/dashboard/stats"],
    queryFn: getQueryFn({ on401: "throw" }),
  });

  // Skeleton UI rendering
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="space-y-2">
          <div className="h-6 w-48 bg-muted rounded animate-pulse"></div>
          <div className="h-9 w-64 bg-muted rounded animate-pulse"></div>
        </div>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={`stat-skeleton-${i}`}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-24 bg-muted rounded animate-pulse"></div>
                <div className="h-4 w-4 bg-muted rounded-full animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-7 w-16 bg-muted rounded animate-pulse mb-2"></div>
                <div className="h-3 w-32 bg-muted rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="h-5 w-48 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-muted/30 rounded flex items-center justify-center">
                <div className="h-40 w-40 rounded-full bg-muted animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="h-5 w-48 bg-muted rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] bg-muted/30 rounded flex items-center justify-center">
                <div className="h-40 w-40 rounded-full bg-muted animate-pulse"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return <div>Error loading dashboard: {error.message}</div>;
  }

  const dashboardStats = [
    {
      title: "Total Customers",
      value: stats?.totalCustomers || 0,
      icon: Users,
      description: "Active user accounts",
    },
    {
      title: "Active Rewards",
      value: stats?.activeRewards || 0,
      icon: Award,
      description: "Available reward items",
    },
    {
      title: "Total Points Issued",
      value: stats?.totalPoints || 0,
      icon: TrendingUp,
      description: "Points in circulation",
    },
    {
      title: "Total Redemptions",
      value: stats?.totalRedemptions || 0,
      icon: ShoppingBag,
      description: "Rewards claimed",
    },
  ];

  // Group transactions by type
  const transactionsByType = (stats?.recentTransactions || []).reduce((acc, t) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const pieChartData = Object.entries(transactionsByType).map(([type, value]) => ({
    name: formatTransactionType(type),
    value,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28'];

  // Get current date
  const currentDate = new Date();
  const timeOfDay = currentDate.getHours() < 12 ? 'morning' : currentDate.getHours() < 17 ? 'afternoon' : 'evening';

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-muted-foreground">
          Good {timeOfDay},
        </h2>
        <h1 className="text-3xl font-bold text-[#1b75bc]">Analytics Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {dashboardStats.map((stat, index) => (
          <AnimatedMetric
            key={stat.title}
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            description={stat.description}
            isLoading={isLoading}
            delay={100 + (index * 150)} // Stagger the animations
            colorScheme={
              index === 0 ? 'primary' :
              index === 1 ? 'success' :
              index === 2 ? 'warning' :
              'default'
            }
          />
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Points Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={stats?.recentTransactions || []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="points" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction Types Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {pieChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}