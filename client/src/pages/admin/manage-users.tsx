import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Shield, ShieldOff, UserPlus, Pencil, Power, PowerOff, Search, Users } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useMemo } from "react";

const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  password: z.string().min(6, "Password must be at least 6 characters").optional(),
  isAgent: z.boolean().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

type FilterState = {
  search: string;
  status: 'all' | 'active' | 'disabled';
  role: 'all' | 'admin' | 'agent';
};

export default function AdminManagement() {
  const { data: admins, refetch } = useQuery({
    queryKey: ["/api/admin/users"],
    staleTime: 0,
    queryFn: async () => {
      const response = await fetch("/api/admin/users", {
        credentials: "include",
        headers: {
          "Accept": "application/json"
        }
      });
      
      if (!response.ok) {
        if (response.status === 401) {
          throw new Error("Unauthorized: Please log in again");
        }
        throw new Error(`Failed to fetch users: ${response.status}`);
      }
      
      return response.json();
    }
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
        admin.firstName?.toLowerCase().includes(searchTerms) ||
        admin.lastName?.toLowerCase().includes(searchTerms) ||
        admin.email?.toLowerCase().includes(searchTerms) ||
        admin.phoneNumber?.includes(searchTerms);

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
              {filteredAdmins?.map((admin: any) => (
                <TableRow key={admin.id}>
                  <TableCell>{admin.firstName} {admin.lastName}</TableCell>
                  <TableCell>{admin.email}</TableCell>
                  <TableCell>{admin.phoneNumber}</TableCell>
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
                                    isAgent: admin.isAgent //Added isAgent
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

                          {!admin.isAgent && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                if (confirm(
                                  "Are you sure? This will permanently remove this admin user."
                                )) {
                                  toggleAgentMutation.mutate({
                                    userId: admin.id,
                                    isAgent: false,
                                  });
                                }
                              }}
                            >
                              <ShieldOff className="h-4 w-4 mr-2" />
                              Remove Admin
                            </Button>
                          )}

                          {!admin.isAdmin && (
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
                          )}

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
        </CardContent>
      </Card>
    </div>
  );
}