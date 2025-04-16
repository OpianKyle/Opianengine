import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, UserPlus, MoreHorizontal, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import CreateCustomerDialog from "@/components/agent/create-customer-dialog";
import EditCustomerDialog from "@/components/agent/edit-customer-dialog";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

// Helper function to get package color
function getPackageColor(packageName: string) {
  switch (packageName?.toUpperCase()) {
    case 'OPPORTUNITY':
      return 'bg-blue-100 text-blue-800';
    case 'MOMENTUM':
      return 'bg-green-100 text-green-800';
    case 'PROSPER':
      return 'bg-yellow-100 text-yellow-800';
    case 'PRESTIGE':
      return 'bg-purple-100 text-purple-800';
    case 'PINNACLE':
      return 'bg-red-100 text-red-800';
    // Legacy package names for backward compatibility
    case 'BEGINNER':
      return 'bg-blue-100 text-blue-800';
    case 'NOVICE':
      return 'bg-green-100 text-green-800';
    case 'ACTIVE':
      return 'bg-yellow-100 text-yellow-800';
    case 'PROFESSIONAL':
      return 'bg-purple-100 text-purple-800';
    case 'EXPERT':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export default function AgentCustomers() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const { toast } = useToast();

  const { data: customers, isLoading } = useQuery({
    queryKey: ["/api/agent/customers"],
    queryFn: async () => {
      const response = await fetch("/api/agent/customers", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  const toggleCustomerStatusMutation = useMutation({
    mutationFn: async ({ customerId, enabled }: { customerId: number; enabled: boolean }) => {
      const response = await fetch(`/api/agent/customers/${customerId}/toggle-status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
        credentials: 'include'
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/customers"] });
      toast({ 
        title: "Success", 
        description: "Customer status updated successfully" 
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  const deleteCustomerMutation = useMutation({
    mutationFn: async (customerId: number) => {
      const response = await fetch(`/api/agent/customers/${customerId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) throw new Error(await response.text());
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/customers"] });
      toast({ 
        title: "Success", 
        description: "Customer deleted successfully" 
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message
      });
    }
  });

  const filteredCustomers = customers?.filter((customer: any) =>
    customer.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    customer.email?.toLowerCase().includes(searchTerm.toLowerCase())
  ) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">My Customers</h1>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Create Customer
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search customers..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array(5).fill(0).map((_, i) => (
                  <TableRow key={`skeleton-${i}`}>
                    <TableCell><div className="h-5 w-32 bg-muted rounded animate-pulse"></div></TableCell>
                    <TableCell><div className="h-5 w-40 bg-muted rounded animate-pulse"></div></TableCell>
                    <TableCell><div className="h-5 w-24 bg-muted rounded animate-pulse"></div></TableCell>
                    <TableCell><div className="h-5 w-20 bg-muted rounded animate-pulse"></div></TableCell>
                    <TableCell><div className="h-5 w-12 bg-muted rounded animate-pulse"></div></TableCell>
                    <TableCell><div className="h-5 w-16 bg-muted rounded animate-pulse"></div></TableCell>
                    <TableCell className="text-right">
                      <div className="h-5 w-8 bg-muted rounded animate-pulse ml-auto"></div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer: any) => (
                  <TableRow key={customer.id}>
                    <TableCell>{customer.firstName} {customer.lastName}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phoneNumber}</TableCell>
                    <TableCell>
                      {customer.selectedPackage ? (
                        <Badge className={`${getPackageColor(customer.selectedPackage)}`}>
                          {customer.selectedPackage}
                        </Badge>
                      ) : (
                        <span className="text-gray-400">No Package</span>
                      )}
                    </TableCell>
                    <TableCell>{customer.points}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          customer.isEnabled
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {customer.isEnabled ? "Active" : "Disabled"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if (confirm(
                                customer.isEnabled
                                  ? "Are you sure you want to disable this customer?"
                                  : "Are you sure you want to enable this customer?"
                              )) {
                                toggleCustomerStatusMutation.mutate({
                                  customerId: customer.id,
                                  enabled: !customer.isEnabled
                                });
                              }
                            }}
                          >
                            {customer.isEnabled ? (
                              <PowerOff className="mr-2 h-4 w-4" />
                            ) : (
                              <Power className="mr-2 h-4 w-4" />
                            )}
                            {customer.isEnabled ? "Disable" : "Enable"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this customer? This action cannot be undone.")) {
                                deleteCustomerMutation.mutate(customer.id);
                              }
                            }}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
      <CreateCustomerDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
      />
      <EditCustomerDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        customer={selectedCustomer}
      />
    </div>
  );
}