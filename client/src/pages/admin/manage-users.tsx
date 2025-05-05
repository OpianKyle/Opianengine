import React, { useState, useMemo } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Shield,
  ShieldOff,
  Users,
  Power,
  PowerOff,
  Pencil,
  Search,
} from "lucide-react";

const userSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  isAgent: z.boolean().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

type FilterState = {
  search: string;
  status: 'all' | 'active' | 'disabled';
  role: 'all' | 'admin' | 'agent';
};

export default function AdminManagement() {
  const { data: admins, refetch, isLoading, error } = useQuery({
    queryKey: ["/api/admin/users"],
    queryFn: getQueryFn(),
    staleTime: 0,
  });

  const [filters, setFilters] = useState<FilterState>({
    search: '',
    status: 'all',
    role: 'all'
  });

  const filteredAdmins = useMemo(() => {
    if (!admins) return [];

    return admins.filter((admin: any) => {
      const searchTerms = filters.search.toLowerCase();
      const matchesSearch = 
        (admin.firstName || '').toLowerCase().includes(searchTerms) ||
        (admin.lastName || '').toLowerCase().includes(searchTerms) ||
        (admin.email || '').toLowerCase().includes(searchTerms) ||
        (admin.phoneNumber || '').includes(searchTerms);

      const matchesStatus = 
        filters.status === 'all' ||
        (filters.status === 'active' && admin.isEnabled) ||
        (filters.status === 'disabled' && !admin.isEnabled);

      const matchesRole =
        filters.role === 'all' ||
        (filters.role === 'admin' && !admin.isAgent) ||
        (filters.role === 'agent' && admin.isAgent);

      return matchesSearch && matchesStatus && matchesRole;
    });
  }, [admins, filters]);

  const { toast } = useToast();
  const form = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      password: "",
      isAgent: false,
    },
  });

  const toggleAgentMutation = useMutation({
    mutationFn: async ({ userId, isAgent }: { userId: number; isAgent: boolean }) => {
      const res = await fetch("/api/admin/users/toggle-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, isAgent }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ 
        title: "Success", 
        description: data.message || "Agent status updated successfully" 
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const createUserMutation = useMutation({
    mutationFn: async (data: UserFormData & { isAgent?: boolean }) => {
      console.log('Creating user with data:', data);
      const res = await fetch("/api/admin/users/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      refetch();
      toast({ title: "Success", description: "User created successfully" });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updateAdminMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number, data: UserFormData }) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      refetch();
      toast({ title: "Success", description: "Admin updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ userId, enabled }: { userId: number; enabled: boolean }) => {
      const res = await fetch(`/api/admin/users/${userId}/toggle-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({ title: "Success", description: "Admin status updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">User Management</h1>
        <div className="flex gap-2">
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Shield className="h-4 w-4 mr-2" />
                Create Admin
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#011d3d] border border-[#022b5c] text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Admin User</DialogTitle>
              </DialogHeader>
              <form 
                onSubmit={form.handleSubmit((data) => createUserMutation.mutate({ ...data, isAgent: false }))} 
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-white">Email</label>
                  <Input 
                    {...form.register("email")} 
                    type="email"
                    className="bg-[#011d3d] border-[#022b5c] text-white focus:ring-[#43EB3E]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-white">First Name</label>
                  <Input 
                    {...form.register("firstName")}
                    className="bg-[#011d3d] border-[#022b5c] text-white focus:ring-[#43EB3E]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-white">Last Name</label>
                  <Input 
                    {...form.register("lastName")}
                    className="bg-[#011d3d] border-[#022b5c] text-white focus:ring-[#43EB3E]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-white">Phone Number</label>
                  <Input 
                    {...form.register("phoneNumber")} 
                    type="tel"
                    className="bg-[#011d3d] border-[#022b5c] text-white focus:ring-[#43EB3E]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-white">Password</label>
                  <Input 
                    type="password" 
                    {...form.register("password")}
                    className="bg-[#011d3d] border-[#022b5c] text-white focus:ring-[#43EB3E]"
                  />
                </div>
                <Button 
                  type="submit"
                  className="w-full bg-[#43EB3E] text-white hover:bg-[#3ad936]"
                >
                  Create Admin
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Users className="h-4 w-4 mr-2" />
                Create Agent
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#011d3d] border border-[#022b5c] text-white">
              <DialogHeader>
                <DialogTitle className="text-white">Create New Agent User</DialogTitle>
              </DialogHeader>
              <form 
                onSubmit={form.handleSubmit((data) => createUserMutation.mutate({ ...data, isAgent: true }))} 
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-white">Email</label>
                  <Input 
                    {...form.register("email")} 
                    type="email"
                    className="bg-[#011d3d] border-[#022b5c] text-white focus:ring-[#43EB3E]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-white">First Name</label>
                  <Input 
                    {...form.register("firstName")}
                    className="bg-[#011d3d] border-[#022b5c] text-white focus:ring-[#43EB3E]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-white">Last Name</label>
                  <Input 
                    {...form.register("lastName")}
                    className="bg-[#011d3d] border-[#022b5c] text-white focus:ring-[#43EB3E]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-white">Phone Number</label>
                  <Input 
                    {...form.register("phoneNumber")} 
                    type="tel"
                    className="bg-[#011d3d] border-[#022b5c] text-white focus:ring-[#43EB3E]"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-white">Password</label>
                  <Input 
                    type="password" 
                    {...form.register("password")}
                    className="bg-[#011d3d] border-[#022b5c] text-white focus:ring-[#43EB3E]"
                  />
                </div>
                <Button 
                  type="submit"
                  className="w-full bg-[#43EB3E] text-white hover:bg-[#3ad936]"
                >
                  Create Agent
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Users</CardTitle>
          <div className="mt-4 space-y-4">
            <div className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search by name, email, or phone..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-9"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filters.status === 'all' ? 'secondary' : 'outline'}
                  onClick={() => setFilters(prev => ({ ...prev, status: 'all' }))}
                >
                  All Status
                </Button>
                <Button
                  variant={filters.status === 'active' ? 'secondary' : 'outline'}
                  onClick={() => setFilters(prev => ({ ...prev, status: 'active' }))}
                >
                  Active
                </Button>
                <Button
                  variant={filters.status === 'disabled' ? 'secondary' : 'outline'}
                  onClick={() => setFilters(prev => ({ ...prev, status: 'disabled' }))}
                >
                  Disabled
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={filters.role === 'all' ? 'secondary' : 'outline'}
                  onClick={() => setFilters(prev => ({ ...prev, role: 'all' }))}
                >
                  All Roles
                </Button>
                <Button
                  variant={filters.role === 'admin' ? 'secondary' : 'outline'}
                  onClick={() => setFilters(prev => ({ ...prev, role: 'admin' }))}
                >
                  Admins
                </Button>
                <Button
                  variant={filters.role === 'agent' ? 'secondary' : 'outline'}
                  onClick={() => setFilters(prev => ({ ...prev, role: 'agent' }))}
                >
                  Agents
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex justify-center items-center p-8">
              <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="ml-3">Loading users...</span>
            </div>
          )}

          {error && (
            <div className="bg-red-50 p-4 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">
                    Error loading users
                  </h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error instanceof Error ? error.message : 'Unknown error occurred'}</p>
                  </div>
                  <div className="mt-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => refetch()}
                      className="text-sm text-red-800 hover:bg-red-100"
                    >
                      Try again
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!isLoading && !error && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAdmins?.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-gray-500">
                      No users found matching your filters
                    </TableCell>
                  </TableRow>
                )}
                {filteredAdmins?.map((admin: any) => (
                  <TableRow key={admin.id}>
                    <TableCell>{admin.firstName || ''} {admin.lastName || ''}</TableCell>
                    <TableCell>{admin.email || ''}</TableCell>
                    <TableCell>{admin.phoneNumber || ''}</TableCell>
                    <TableCell>
                      {admin.isSuperAdmin ? "Super Admin" : admin.isAgent ? "Agent" : "Admin"}
                    </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        admin.isEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {admin.isEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        {!admin.isSuperAdmin && (
                          <>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm">
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Edit
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit User</DialogTitle>
                                </DialogHeader>
                                <form 
                                  onSubmit={(e) => {
                                    e.preventDefault();
                                    const formData = {
                                      email: e.currentTarget.email.value,
                                      firstName: e.currentTarget.firstName.value,
                                      lastName: e.currentTarget.lastName.value,
                                      phoneNumber: e.currentTarget.phoneNumber.value,
                                      password: e.currentTarget.password.value,
                                      isAgent: admin.isAgent 
                                    };
                                    updateAdminMutation.mutate({ userId: admin.id, data: formData });
                                  }} 
                                  className="space-y-4"
                                >
                                  <div className="space-y-2">
                                    <label>Email</label>
                                    <Input name="email" defaultValue={admin.email} />
                                  </div>
                                  <div className="space-y-2">
                                    <label>First Name</label>
                                    <Input name="firstName" defaultValue={admin.firstName} />
                                  </div>
                                  <div className="space-y-2">
                                    <label>Last Name</label>
                                    <Input name="lastName" defaultValue={admin.lastName} />
                                  </div>
                                  <div className="space-y-2">
                                    <label>Phone Number</label>
                                    <Input name="phoneNumber" defaultValue={admin.phoneNumber} />
                                  </div>
                                  <div className="space-y-2">
                                    <label>New Password (leave empty to keep current)</label>
                                    <Input type="password" name="password" />
                                  </div>
                                  <Button type="submit">Update User</Button>
                                </form>
                              </DialogContent>
                            </Dialog>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm(
                                  admin.isAgent
                                    ? "Are you sure you want to remove agent status?"
                                    : "Are you sure you want to make this user an agent?"
                                )) {
                                  toggleAgentMutation.mutate({
                                    userId: admin.id,
                                    isAgent: !admin.isAgent,
                                  });
                                }
                              }}
                            >
                              <Users className="h-4 w-4 mr-2" />
                              {admin.isAgent ? 'Remove Agent' : 'Make Agent'}
                            </Button>

                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm(
                                  admin.isEnabled
                                    ? "Are you sure you want to disable this user?"
                                    : "Are you sure you want to enable this user?"
                                )) {
                                  toggleStatusMutation.mutate({
                                    userId: admin.id,
                                    enabled: !admin.isEnabled,
                                  });
                                }
                              }}
                            >
                              {admin.isEnabled ? (
                                <PowerOff className="h-4 w-4 mr-2" />
                              ) : (
                                <Power className="h-4 w-4 mr-2" />
                              )}
                              {admin.isEnabled ? 'Disable' : 'Enable'}
                            </Button>
                          </>
                        )}
                      </div>
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