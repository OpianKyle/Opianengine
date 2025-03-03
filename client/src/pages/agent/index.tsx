import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AgentLayout from "@/components/layout/agent-layout";

export default function AgentDashboard() {
  return (
    <AgentLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Agent Dashboard</h1>
        
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Total Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Active Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Points Assigned</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">0</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AgentLayout>
  );
}
