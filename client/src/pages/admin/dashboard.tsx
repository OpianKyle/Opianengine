import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell
} from 'recharts';
import { Users, ShoppingBag, TrendingUp, Award } from 'lucide-react';
import { formatTransactionType } from "@/lib/utils";

export default function AdminDashboard() {
  const { data: customers } = useQuery({
    queryKey: ["/api/admin/customers"],
  });

  const { data: rewards } = useQuery({
    queryKey: ["/api/rewards"],
  });

  // Calculate key metrics
  const totalCustomers = customers?.length || 0;
  const totalPoints = customers?.reduce((acc: number, c: any) => acc + c.points, 0) || 0;
  const activeRewards = rewards?.filter((r: any) => r.available).length || 0;
  const totalRedemptions = customers?.reduce((acc: number, c: any) => 
    acc + c.transactions.filter((t: any) => t.type === 'REDEEMED').length, 0) || 0;

  const stats = [
    {
      title: "Total Customers",
      value: totalCustomers,
      icon: Users,
      description: "Active user accounts",
    },
    {
      title: "Active Rewards",
      value: activeRewards,
      icon: Award,
      description: "Available reward items",
    },
    {
      title: "Total Points Issued",
      value: totalPoints,
      icon: TrendingUp,
      description: "Points in circulation",
    },
    {
      title: "Total Redemptions",
      value: totalRedemptions,
      icon: ShoppingBag,
      description: "Rewards claimed",
    },
  ];

  // Prepare transaction data for charts
  const transactionData = customers?.flatMap((c: any) => 
    c.transactions.map((t: any) => ({
      date: new Date(t.createdAt).toLocaleDateString(),
      points: Math.abs(t.points),
      type: t.type,
    }))
  ) || [];

  // Group transactions by type
  const transactionsByType = transactionData.reduce((acc: any, t: any) => {
    acc[t.type] = (acc[t.type] || 0) + 1;
    return acc;
  }, {});

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
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
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
                <LineChart data={transactionData}>
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