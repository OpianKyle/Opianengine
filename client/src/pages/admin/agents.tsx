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
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Helper functions for package pricing and commission calculations
const getPackagePrice = (packageName: string | null): number => {
  if (!packageName) return 0;
  
  const packagePrices: Record<string, number> = {
    'OPPORTUNITY': 350,
    'MOMENTUM': 450,
    'PROSPER': 550,
    'PRESTIGE': 695,
    'PINNACLE': 825
  };
  
  return packagePrices[packageName.toUpperCase()] || 0;
};

const calculateCommission = (packageName: string | null): number => {
  if (!packageName) return 0;
  
  // Calculate 30% of package price as the commission
  const packagePrice = getPackagePrice(packageName);
  const commission = packagePrice * 0.3;
  // Return with 2 decimal places
  return Math.round(commission * 100) / 100;
};

export default function AdminAgents() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
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

  const { data: agentCustomers, isLoading: isLoadingCustomers } = useQuery({
    queryKey: [`/api/admin/agents/${selectedAgentId}/customers`],
    queryFn: async () => {
      if (!selectedAgentId) return null;
      const response = await fetch(`/api/admin/agents/${selectedAgentId}/customers`, {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch agent customers");
      return response.json();
    },
    enabled: !!selectedAgentId,
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

  const totalPointsManaged = filteredAgents.reduce((sum: number, agent: any) => {
    return sum + (parseInt(agent.totalCustomerPoints) || 0);
  }, 0);

  const selectedAgent = filteredAgents.find(agent => agent.id === selectedAgentId);

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
              {totalPointsManaged.toLocaleString()}
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
                  <TableHead>Potential Commissions</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAgents.map((agent: any) => (
                  <TableRow key={agent.id}>
                    <TableCell>{agent.firstName} {agent.lastName}</TableCell>
                    <TableCell>{agent.email}</TableCell>
                    <TableCell>{agent.totalCustomers}</TableCell>
                    <TableCell>{agent.todaySignups}</TableCell>
                    <TableCell>{(agent.totalCustomerPoints || 0).toLocaleString()}</TableCell>
                    <TableCell>R{parseFloat(agent.potentialCommissions || 0).toFixed(2)}</TableCell>
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
                        onClick={() => setSelectedAgentId(agent.id)}
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

      <Dialog open={!!selectedAgentId} onOpenChange={() => setSelectedAgentId(null)}>
        <DialogContent className="max-w-5xl bg-[#011d3d] border-[#022b5c] text-white">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-semibold text-white">
              {selectedAgent?.firstName} {selectedAgent?.lastName}'s Customers
            </DialogTitle>
            <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-300">
              <p>Total Customers: {agentCustomers?.length || 0}</p>
              <p>Potential Commissions: R{parseFloat(selectedAgent?.potentialCommissions || 0).toFixed(2)}</p>
            </div>
          </DialogHeader>

          {isLoadingCustomers ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            </div>
          ) : (
            <div className="relative">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#022b5c]">
                    <TableHead className="text-gray-300">Name</TableHead>
                    <TableHead className="text-gray-300">Email</TableHead>
                    <TableHead className="text-gray-300">Package</TableHead>
                    <TableHead className="text-gray-300">Points</TableHead>
                    <TableHead className="text-gray-300">Package Price</TableHead>
                    <TableHead className="text-gray-300">Potential Commission</TableHead>
                    <TableHead className="text-gray-300">Status</TableHead>
                    <TableHead className="text-gray-300">Created At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {agentCustomers?.map((customer: any) => (
                    <TableRow key={customer.id} className="border-[#022b5c] hover:bg-[#022b5c]/50">
                      <TableCell className="text-white">{customer.firstName} {customer.lastName}</TableCell>
                      <TableCell className="text-white">{customer.email}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="border-[#022b5c] text-white">
                          {customer.selectedPackage || 'None'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-white">{customer.points?.toLocaleString() || 0}</TableCell>
                      <TableCell className="text-white">
                        R{getPackagePrice(customer.selectedPackage)?.toFixed(2) || "0.00"}
                      </TableCell>
                      <TableCell className="text-white">
                        {customer.commissionAmount 
                          ? `R${customer.commissionAmount.toFixed(2)}` 
                          : `R${calculateCommission(customer.selectedPackage)?.toFixed(2) || "0.00"}`}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={customer.isEnabled ? "default" : "destructive"}
                          className={customer.isEnabled ? "bg-green-600 hover:bg-green-700" : ""}
                        >
                          {customer.isEnabled ? "Active" : "Disabled"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {new Date(customer.createdAt).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}