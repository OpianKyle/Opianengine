import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Users, TrendingUp, DollarSign } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";

export default function AdminAgents() {
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: agentStats, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/agents/stats"],
    queryFn: async () => {
      const response = await fetch("/api/admin/agents/stats", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch agent statistics");
      return response.json();
    },
  });

  const toggleAgentStatus = useMutation({
    mutationFn: async (agentId: number) => {
      const response = await fetch(`/api/admin/agents/${agentId}/toggle-status`, {
        method: 'POST',
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to update agent status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/agents/stats"] });
      toast({
        title: "Success",
        description: "Agent status updated successfully"
      });
      refetch();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  const filteredAgents = agentStats?.agents?.filter((agent: any) =>
    agent.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    agent.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Agent Management</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Agents
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentStats?.totalAgents || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Sign-ups
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentStats?.todaySignups || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Customers
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentStats?.totalCustomers || 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Points Managed
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {filteredAgents.reduce((sum: number, agent: any) => sum + (agent.totalCustomerPoints || 0), 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agent List</CardTitle>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search agents..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-4">Loading agents...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Total Customers</TableHead>
                  <TableHead>Today's Sign-ups</TableHead>
                  <TableHead>Points Managed</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.map((agent: any) => (
                  <TableRow key={agent.id}>
                    <TableCell>
                      {agent.firstName} {agent.lastName}
                    </TableCell>
                    <TableCell>{agent.email}</TableCell>
                    <TableCell>{agent.totalCustomers}</TableCell>
                    <TableCell>{agent.todaySignups}</TableCell>
                    <TableCell>{(agent.totalCustomerPoints || 0).toLocaleString()}</TableCell>
                    <TableCell>{new Date(agent.joinDate).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <Badge
                        variant={agent.isEnabled ? "default" : "destructive"}
                        className="cursor-pointer"
                        onClick={() => toggleAgentStatus.mutate(agent.id)}
                      >
                        {agent.isEnabled ? "Active" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          agent.totalCustomers > 10
                            ? "default"
                            : agent.totalCustomers > 5
                            ? "secondary"
                            : "destructive"
                        }
                      >
                        {agent.totalCustomers > 10
                          ? "High"
                          : agent.totalCustomers > 5
                          ? "Medium"
                          : "Low"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          window.location.href = `/admin/agents/${agent.id}/customers`;
                        }}
                      >
                        View Customers
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}