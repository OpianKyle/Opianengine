import { useState } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Power, PowerOff, TrendingUp, Plus, Package, MoreHorizontal, Download, Upload, Loader2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import cn from 'classnames';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  idNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  industry: z.string().optional(),
  occupation: z.string().optional(),
  bankName: z.string().optional(),
  accountType: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolderName: z.string().optional(),
  branchCode: z.string().optional(),
  selectedPackage: z.string().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

const getTierInfo = (points: number): { name: string; color: string; nextTier?: { name: string; pointsNeeded: number } } => {
  if (points >= 150000) {
    return {
      name: 'Platinum',
      color: 'bg-gradient-to-r from-purple-400 to-gray-300 text-white'
    };
  }
  if (points >= 100000) {
    return {
      name: 'Gold',
      color: 'bg-yellow-500 text-white',
      nextTier: { name: 'Platinum', pointsNeeded: 150000 - points }
    };
  }
  if (points >= 50000) {
    return {
      name: 'Purple',
      color: 'bg-purple-500 text-white',
      nextTier: { name: 'Gold', pointsNeeded: 100000 - points }
    };
  }
  if (points >= 10000) {
    return {
      name: 'Silver',
      color: 'bg-gray-400 text-white',
      nextTier: { name: 'Purple', pointsNeeded: 50000 - points }
    };
  }
  return {
    name: 'Bronze',
    color: 'bg-amber-600 text-white',
    nextTier: { name: 'Silver', pointsNeeded: 10000 - points }
  };
};

export default function AdminCustomers() {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { data: customers } = useQuery({
    queryKey: ["/api/admin/customers"],
    queryFn: async () => {
      const response = await fetch("/api/admin/customers", {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("Failed to fetch customers");
      }
      return response.json();
    }
  });

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products", {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      return response.json();
    },
    select: (data) => {
      return data?.map((product: any) => ({
        ...product,
        activities: product.activities || []
      }));
    }
  });

  const { toast } = useToast();

  const editDetailsForm = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      phoneNumber: "",
      idNumber: "",
      dateOfBirth: "",
      address: "",
      city: "",
      postalCode: "",
      industry: "",
      occupation: "",
      bankName: "",
      accountType: "",
      accountNumber: "",
      accountHolderName: "",
      branchCode: "",
      selectedPackage: "",
    },
  });

  const handleEditUser = (customer: any) => {
    editDetailsForm.reset({
      email: customer.email || "",
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      phoneNumber: customer.phoneNumber || "",
      idNumber: customer.idNumber || "",
      dateOfBirth: customer.dateOfBirth || "",
      address: customer.address || "",
      city: customer.city || "",
      postalCode: customer.postalCode || "",
      industry: customer.industry || "",
      occupation: customer.occupation || "",
      bankName: customer.bankName || "",
      accountType: customer.accountType || "",
      accountNumber: customer.accountNumber || "",
      accountHolderName: customer.accountHolderName || "",
      branchCode: customer.branchCode || "",
      selectedPackage: customer.selectedPackage || "",
    });
  };

  const updateUserDetailsMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: any }) => {
      const res = await fetch(`/api/admin/users/${userId}/details`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({ title: "Success", description: "User details updated successfully" });
      editDetailsForm.reset();
      setEditDialogOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const toggleUserStatusMutation = useMutation({
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({ title: "Success", description: "User status updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const assignProductMutation = useMutation({
    mutationFn: async ({ productId, userId }: { productId: number; userId: number }) => {
      const res = await fetch(`/api/products/${productId}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({ title: "Success", description: "Product assigned successfully" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const unassignProductMutation = useMutation({
    mutationFn: async ({ productId, userId }: { productId: number; userId: number }) => {
      const res = await fetch(`/api/products/${productId}/unassign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({ title: "Success", description: "Product unassigned successfully" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const exportCustomersMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/admin/customers/export", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to export customers");
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'customers.csv';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Customers exported successfully" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const importCustomersMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch("/api/admin/customers/import", {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!response.ok) throw new Error("Failed to import customers");
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({
        title: "Import Complete",
        description: `Successfully imported ${data.success} customers. ${data.failed} failed.`
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

  const assignPointsMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number, data: PointsFormData }) => {
      const res = await fetch("/api/admin/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          points: data.points,
          description: data.description,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/logs"] });
      toast({ title: "Success", description: "Points assigned successfully" });
      pointsForm.reset();
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const pointsSchema = z.object({
    points: z.number().min(1, "Points must be greater than 0"),
    description: z.string().min(1, "Description is required"),
    selectedActivities: z.array(z.number()).optional(),
    posPoints: z.number().min(0).optional(),
    posBaseValue: z.number().min(0).optional()
  });

  type PointsFormData = z.infer<typeof pointsSchema>;

  const pointsForm = useForm<PointsFormData>({
    resolver: zodResolver(pointsSchema),
    defaultValues: {
      points: 0,
      description: "",
      selectedActivities: [],
      posPoints: 0,
      posBaseValue: 0
    },
  });

  const getPointsMultiplier = (points: number, type: string): number => {
    if (type === 'premium') {
      return points >= 50000 ? 2 : 1;
    } else if (type === 'card') {
      return points >= 100000 ? 3 : 2;
    } else if (type === 'pos') {
      return points >= 10000 ? 1.5 : 1;
    }
    return 1;
  };


  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Customer Management</h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => exportCustomersMutation.mutate()}
            disabled={exportCustomersMutation.isPending}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <label className="cursor-pointer">
            <Input
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  importCustomersMutation.mutate(file);
                }
              }}
            />
            <Button variant="outline" asChild>
              <span>
                <Upload className="mr-2 h-4 w-4" />
                Import CSV
              </span>
            </Button>
          </label>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Package</TableHead>
                <TableHead>Tier</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned Products</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers?.map((customer: any) => {
                const tierInfo = getTierInfo(customer.points);
                return (
                  <TableRow
                    key={customer.id}
                    className={cn(
                      !customer.isEnabled && "opacity-60 bg-muted/50"
                    )}
                  >
                    <TableCell>{customer.firstName} {customer.lastName}</TableCell>
                    <TableCell>{customer.email}</TableCell>
                    <TableCell>{customer.phoneNumber}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">
                        {customer.selectedPackage || 'No Package'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge className={`${tierInfo.color}`}>
                          {tierInfo.name}
                        </Badge>
                        {tierInfo.nextTier && (
                          <p className="text-xs text-muted-foreground">
                            {tierInfo.nextTier.pointsNeeded.toLocaleString()} points to {tierInfo.nextTier.name}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{customer.points.toLocaleString()}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        customer.isEnabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {customer.isEnabled ? 'Active' : 'Disabled'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <ScrollArea className="h-[100px]">
                        <div className="space-x-1">
                          {customer.productAssignments?.map((assignment: any) => (
                            <Badge
                              key={assignment.id}
                              variant="secondary"
                              className="cursor-pointer hover:bg-destructive/20"
                              onClick={() => {
                                if (confirm('Are you sure you want to unassign this product?')) {
                                  unassignProductMutation.mutate({
                                    productId: assignment.product.id,
                                    userId: customer.id
                                  });
                                }
                              }}
                            >
                              {assignment.product.name} ×
                            </Badge>
                          ))}
                          {(!customer.productAssignments || customer.productAssignments.length === 0) && (
                            <span className="text-sm text-muted-foreground">No products assigned</span>
                          )}
                        </div>
                      </ScrollArea>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                            <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => {
                                e.preventDefault();
                                handleEditUser(customer);
                                setEditDialogOpen(true);
                              }}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Details
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl bg-[#011d3d] border-[#022b5c] text-white">
                              <DialogHeader>
                                <DialogTitle className="text-[#43EB3E]">Edit Details - {customer.firstName} {customer.lastName}</DialogTitle>
                              </DialogHeader>
                              <Form {...editDetailsForm}>
                                <form onSubmit={editDetailsForm.handleSubmit((data) =>
                                  updateUserDetailsMutation.mutate({ userId: customer.id, data })
                                )}>
                                  <div className="grid grid-cols-2 gap-4">
                                    <FormField
                                      control={editDetailsForm.control}
                                      name="firstName"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-white">First Name</FormLabel>
                                          <FormControl>
                                            <Input {...field} className="bg-[#022b5c] border-[#043875] text-white" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    {/* ...rest of the form fields */}
                                    <FormField
                                      control={editDetailsForm.control}
                                      name="selectedPackage"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-white">Package</FormLabel>
                                          <FormControl>
                                            <select {...field} className="w-full p-2 rounded bg-[#022b5c] border-[#043875] text-white">
                                              <option value="">Select Package</option>
                                              <option value="BEGINNER">BEGINNER</option>
                                              <option value="NOVICE">NOVICE</option>
                                              <option value="ACTIVE">ACTIVE</option>
                                              <option value="PROFESSIONAL">PROFESSIONAL</option>
                                              <option value="EXPERT">EXPERT</option>
                                            </select>
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <DialogFooter>
                                    <Button type="submit" disabled={updateUserDetailsMutation.isPending} className="bg-[#43EB3E] text-white hover:bg-[#3ad936]">
                                      {updateUserDetailsMutation.isPending ? (
                                        <>
                                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                          Saving...
                                        </>
                                      ) : (
                                        'Save Changes'
                                      )}
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>
                          <DropdownMenuItem
                            onClick={() => {
                              if (confirm('Are you sure you want to toggle this user\'s status?')) {
                                toggleUserStatusMutation.mutate({
                                  userId: customer.id,
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
                            <span>{customer.isEnabled ? 'Disable' : 'Enable'} User</span>
                          </DropdownMenuItem>
                          <Dialog>
                            <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Package className="mr-2 h-4 w-4" />
                                Assign Product
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent className="bg-[#011d3d] border-[#022b5c] text-white">
                              <DialogHeader>
                                <DialogTitle className="text-[#43EB3E]">Assign Products to {customer.firstName}</DialogTitle>
                              </DialogHeader>
                              <div className="grid gap-4">
                                {products?.map((product: any) => {
                                  const isAssigned = customer.productAssignments?.some(
                                    (a: any) => a.product.id === product.id
                                  );
                                  return (
                                    <div
                                      key={product.id}
                                      className="flex items-center justify-between p-4 rounded-lg border border-[#043875]"
                                    >
                                      <div>
                                        <h3 className="font-medium">{product.name}</h3>
                                        <p className="text-sm text-muted-foreground">
                                          {product.description}
                                        </p>
                                      </div>
                                      <Button
                                        variant={isAssigned ? "secondary" : "default"}
                                        onClick={() => {
                                          if (isAssigned) {
                                            if (confirm('Are you sure you want to unassign this product?')) {
                                              unassignProductMutation.mutate({
                                                productId: product.id,
                                                userId: customer.id
                                              });
                                            }
                                          } else {
                                            assignProductMutation.mutate({
                                              productId: product.id,
                                              userId: customer.id
                                            });
                                          }
                                        }}
                                      >
                                        {isAssigned ? 'Unassign' : 'Assign'}
                                      </Button>
                                    </div>
                                  );
                                })}
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Dialog>
                            <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <TrendingUp className="mr-2 h-4 w-4" />
                                Assign Points
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent className="max-w-md bg-[#011d3d] border-[#022b5c] text-white">
                              <DialogHeader>
                                <DialogTitle className="text-[#43EB3E]">
                                  Assign Points - {customer.firstName} {customer.lastName}
                                </DialogTitle>
                              </DialogHeader>
                              <Form {...pointsForm}>
                                <form
                                  onSubmit={pointsForm.handleSubmit((data) =>
                                    assignPointsMutation.mutate({ userId: customer.id, data })
                                  )}
                                  className="space-y-4"
                                >
                                  <FormField
                                    control={pointsForm.control}
                                    name="points"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-white">Points</FormLabel>
                                        <FormControl>
                                          <Input
                                            type="number"
                                            {...field}
                                            onChange={(e) => field.onChange(Number(e.target.value))}
                                            className="bg-[#022b5c] border-[#043875] text-white"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <FormField
                                    control={pointsForm.control}
                                    name="description"
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormLabel className="text-white">Description</FormLabel>
                                        <FormControl>
                                          <Input
                                            {...field}
                                            className="bg-[#022b5c] border-[#043875] text-white"
                                          />
                                        </FormControl>
                                        <FormMessage />
                                      </FormItem>
                                    )}
                                  />
                                  <DialogFooter>
                                    <Button
                                      type="submit"
                                      disabled={assignPointsMutation.isPending}
                                      className="bg-[#43EB3E] text-black hover:bg-[#43EB3E]/90"
                                    >
                                      {assignPointsMutation.isPending && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      )}
                                      Assign Points
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </Form>
                            </DialogContent>
                          </Dialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}