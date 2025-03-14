import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function AgentDashboard() {
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
    </div>
  );
}