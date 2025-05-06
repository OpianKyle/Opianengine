import { useState } from 'react';
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Power, PowerOff, TrendingUp, Plus, Package, MoreHorizontal, Download, Upload, Loader2, Mail, ChevronLeft, ChevronRight } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import cn from 'classnames';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion";

const genderEnum = ["male", "female", "other"] as const;

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
  selectedPackage: z.enum(["OPPORTUNITY", "MOMENTUM", "PROSPER", "PRESTIGE", "PINNACLE"]).optional(),
  gender: z.enum(genderEnum).nullable(),
  hasCreditCard: z.boolean().optional(),
  isSouthAfrican: z.boolean().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

const getTierInfo = (points: number): { name: string; color: string; nextTier?: { name: string; pointsNeeded: number } } => {
  const numPoints = typeof points === 'number' ? points : Number(points || 0);

  if (numPoints >= 150000) {
    return {
      name: 'Platinum',
      color: 'bg-gradient-to-r from-purple-400 to-gray-300 text-white'
    };
  }
  if (numPoints >= 100000) {
    return {
      name: 'Gold',
      color: 'bg-yellow-500 text-white',
      nextTier: { name: 'Platinum', pointsNeeded: 150000 - numPoints }
    };
  }
  if (numPoints >= 50000) {
    return {
      name: 'Purple',
      color: 'bg-purple-500 text-white',
      nextTier: { name: 'Gold', pointsNeeded: 100000 - numPoints }
    };
  }
  if (numPoints >= 10000) {
    return {
      name: 'Silver',
      color: 'bg-gray-400 text-white',
      nextTier: { name: 'Purple', pointsNeeded: 50000 - numPoints }
    };
  }
  return {
    name: 'Bronze',
    color: 'bg-amber-600 text-white',
    nextTier: { name: 'Silver', pointsNeeded: 10000 - numPoints }
  };
};

const getPointsMultiplier = (points: number, type: 'premium' | 'card' | 'pos'): number => {
  if (points >= 150000) { // Platinum
    return type === 'pos' ? 2.5 : type === 'premium' ? 2.5 : 0.5;
  }
  if (points >= 100000) { // Gold
    return type === 'pos' ? 2.0 : type === 'premium' ? 2.0 : 0.25;
  }
  if (points >= 50000) { // Purple
    return type === 'pos' ? 1.5 : type === 'premium' ? 1.5 : 0.10;
  }
  if (points >= 10000) { // Silver
    return type === 'pos' ? 1.0 : type === 'premium' ? 1.0 : 0.05;
  }
  return type === 'pos' ? 0 : 0; // Bronze
};

const AssignProductsDialog = ({ customer, onClose }: { customer: any; onClose: () => void }) => {
  const { data: availableProducts = [] } = useQuery({
    queryKey: ["/api/admin/products/available"],
    queryFn: async () => {
      const response = await fetch("/api/admin/products/available", {
        credentials: 'include'
      });
      if (!response.ok) throw new Error("Failed to fetch available products");
      return response.json();
    }
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
      onClose();
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

  // Check if a product is assigned to the customer
  const isProductAssigned = (productId: number) => {
    return customer.assignedProducts?.some((p: any) => p.id === productId) ?? false;
  };

  return (
    <DialogContent
      className="max-w-2xl bg-[#011d3d] border-[#022b5c] text-white"
      aria-describedby="assign-products-description"
    >
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold text-[#43EB3E]">
          Assign Products - {customer.firstName} {customer.lastName}
        </DialogTitle>
        <DialogDescription id="assign-products-description" className="text-gray-300">
          Select products to assign to this customer. Assigned products will affect their points and rewards.
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="h-[400px] pr-4">
        <div className="space-y-4">
          {availableProducts.map((product: any) => {
            const assigned = isProductAssigned(product.id);
            const isPending = assignProductMutation.isPending || unassignProductMutation.isPending;

            return (
              <div
                key={product.id}
                className="p-4 border border-[#022b5c] rounded-lg hover:bg-[#022b5c]/50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                    <p className="text-sm text-gray-300">{product.description}</p>
                  </div>
                  <Button
                    onClick={() => {
                      if (assigned) {
                        unassignProductMutation.mutate({ productId: product.id, userId: customer.id });
                      } else {
                        assignProductMutation.mutate({ productId: product.id, userId: customer.id });
                      }
                    }}
                    className={cn(
                      "relative group transition-all duration-200",
                      assigned
                        ? "bg-green-600 hover:bg-red-500 text-white"
                        : "bg-[#43EB3E] hover:bg-[#3AD936] text-black"
                    )}
                    disabled={isPending}
                  >
                    {isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {assigned ? "Unassigning..." : "Assigning..."}
                      </>
                    ) : (
                      <>
                        <Package className="mr-2 h-4 w-4" />
                        <span className="group-hover:hidden">
                          {assigned ? "Assigned" : "Assign"}
                        </span>
                        <span className="hidden group-hover:inline">
                          {assigned ? "Unassign" : "Assign"}
                        </span>
                      </>
                    )}
                  </Button>
                </div>
                {product.activities?.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {product.activities.map((activity: any) => (
                      <Badge
                        key={activity.id}
                        variant="outline"
                        className="border-[#022b5c] text-white"
                      >
                        {activity.type}: {activity.pointsValue} points
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </DialogContent>
  );
};

export default function AdminCustomers() {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [pointsDialogOpen, setPointsDialogOpen] = useState(false);
  const [showAssignProducts, setShowAssignProducts] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  
  const { data: customersResponse, isLoading: isCustomersLoading, isError: isCustomersError, error: customersError } = useQuery({
    queryKey: ["/api/admin/customers", page, limit],
    queryFn: async () => {
      console.time('customersQuery');
      const response = await fetch(`/api/admin/customers?page=${page}&limit=${limit}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("Failed to fetch customers");
      }
      const data = await response.json();
      console.timeEnd('customersQuery');
      return data;
    },
    staleTime: 1000 * 60 * 1, // 1 minute
    retryDelay: 1000
  });
  
  // Extract data and pagination info
  const customers = customersResponse?.data || [];
  const pagination = customersResponse?.pagination || { page: 1, limit: 50, totalItems: 0, totalPages: 1 };

  const { data: products, isLoading: isProductsLoading } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      console.time('productsQuery');
      const response = await fetch("/api/products", {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("Failed to fetch products");
      }
      const data = await response.json();
      console.timeEnd('productsQuery');
      return data;
    },
    select: (data) => {
      return data?.map((product: any) => ({
        ...product,
        activities: product.activities || []
      }));
    },
    staleTime: 1000 * 60 * 3, // 3 minutes
    retryDelay: 1000
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
      selectedPackage: "OPPORTUNITY",
      gender: null,
      hasCreditCard: false,
      isSouthAfrican: false,
    },
  });

  const handleEditUser = (customer: any) => {
    setSelectedCustomer(customer);
    const formattedDate = customer.dateOfBirth ?
      new Date(customer.dateOfBirth).toISOString().split('T')[0] : '';

    editDetailsForm.reset({
      email: customer.email || "",
      firstName: customer.firstName || "",
      lastName: customer.lastName || "",
      phoneNumber: customer.phoneNumber || "",
      idNumber: customer.idNumber || "",
      dateOfBirth: formattedDate,
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
      selectedPackage: (customer.selectedPackage?.toUpperCase() as "OPPORTUNITY" | "MOMENTUM" | "PROSPER" | "PRESTIGE" | "PINNACLE") || "OPPORTUNITY",
      gender: (customer.gender as typeof genderEnum[number]) || null,
      hasCreditCard: Boolean(customer.hasCreditCard),
      isSouthAfrican: Boolean(customer.isSouthAfrican),
    });
    setEditDialogOpen(true);
  };

  const updateUserDetailsMutation = useMutation({
    mutationFn: async ({ userId, data }: { userId: number; data: UserFormData }) => {
      const res = await fetch(`/api/admin/users/${userId}/details`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          selectedPackage: data.selectedPackage?.toUpperCase()
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers", page, limit] });
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers", page, limit] });
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

  const sendFundCardEmailMutation = useMutation({
    mutationFn: async (customerId: number) => {
      const res = await fetch(`/api/admin/customers/${customerId}/send-fund-card-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ 
        title: "Success", 
        description: "Fund card email sent successfully" 
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
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers", page, limit] });
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
      const activityPoints = data.selectedActivities?.reduce((sum, activityId) => {
        const activity = products?.flatMap(p => p.activities).find(a => a.id === activityId);
        return sum + (activity?.pointsValue || 0);
      }, 0) || 0;

      const totalPoints = activityPoints + (data.posPoints || 0);

      const activityDescriptions = data.selectedActivities?.map(activityId => {
        const activity = products?.flatMap(p => p.activities).find(a => a.id === activityId);
        return activity?.type;
      }).filter(Boolean) || [];

      let description = data.description;
      if (activityDescriptions.length > 0) {
        description += ` (Activities: ${activityDescriptions.join(", ")})`;
      }
      if (data.posPoints > 0) {
        description += ` (POS Value: R${data.posBaseValue})`;
      }

      const res = await fetch("/api/admin/points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          points: totalPoints,
          description: description,
        }),
      });

      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers", page, limit] });
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

  type PointsFormData = {
    selectedActivities?: number[];
    posPoints: number;
    posBaseValue: number;
    description: string;
    points: number;
  };

  const pointsSchema = z.object({
    selectedActivities: z.array(z.number()).optional(),
    posPoints: z.number().min(0, "POS points must be 0 or greater"),
    posBaseValue: z.number().min(0, "POS base value must be 0 or greater"),
    description: z.string().min(1, "Description is required"),
    points: z.number().min(0, "Total points must be 0 or greater"),
  });


  const pointsForm = useForm<PointsFormData>({
    resolver: zodResolver(pointsSchema),
    defaultValues: {
      selectedActivities: [],
      posPoints: 0,
      posBaseValue: 0,
      description: "",
      points: 0,
    },
  });
  
  // Pagination component to be reused at top and bottom
  const PaginationControls = ({ totalItems }: { totalItems: number }) => (
    <div className="flex items-center justify-between">
      <div className="text-sm text-muted-foreground">
        Showing {(page - 1) * limit + 1} to {Math.min(page * limit, totalItems)} of {totalItems} customers
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.max(1, p - 1))}
          disabled={page === 1 || isCustomersLoading}
        >
          <ChevronLeft className="h-4 w-4" />
          <span className="sr-only">Previous Page</span>
        </Button>
        <div className="flex items-center">
          <span className="text-sm font-medium mr-2">Page</span>
          <Input
            type="number"
            min={1}
            max={Math.ceil(totalItems / limit)}
            value={page}
            onChange={(e) => {
              const value = parseInt(e.target.value);
              if (value && value > 0 && value <= Math.ceil(totalItems / limit)) {
                setPage(value);
              }
            }}
            className="w-16 h-8"
          />
          <span className="text-sm font-medium mx-2">of {Math.ceil(totalItems / limit)}</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(p => Math.min(Math.ceil(totalItems / limit), p + 1))}
          disabled={page === Math.ceil(totalItems / limit) || isCustomersLoading}
        >
          <ChevronRight className="h-4 w-4" />
          <span className="sr-only">Next Page</span>
        </Button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 h-full flex flex-col max-h-[calc(100vh-6rem)]">
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

      <Card className="flex-1 flex flex-col min-h-0">
        <CardHeader className="flex flex-col gap-4 flex-shrink-0">
          <div className="flex flex-row items-center justify-between">
            <CardTitle>All Customers</CardTitle>
            {isCustomersLoading && (
              <div className="flex items-center text-muted-foreground text-sm">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading customers data...
              </div>
            )}
          </div>
          
          {!isCustomersError && customersResponse && (
            <PaginationControls totalItems={pagination.totalItems} />
          )}
        </CardHeader>
        <CardContent className="flex-1 min-h-0 flex flex-col">
          {isCustomersError ? (
            <div className="flex flex-col items-center justify-center py-10 text-destructive">
              <p className="text-center mb-4">Failed to load customers</p>
              <Button 
                variant="outline" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/customers", page, limit] })}
              >
                Retry
              </Button>
            </div>
          ) : (
            <div className="flex-1 min-h-0 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
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
                  {isCustomersLoading && !customers.length ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mt-2">Loading customer data...</p>
                      </TableCell>
                    </TableRow>
                  ) : !customers.length ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-24 text-center">
                        No customers found.
                      </TableCell>
                    </TableRow>
                  ) : 
                    customers.map((customer: any) => {
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
                          <TableCell>
                            {typeof customer.points === 'number'
                              ? customer.points.toLocaleString()
                              : Number(customer.points || 0).toLocaleString()}
                          </TableCell>
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
                                {customer.assignedProducts?.length > 0 ? (
                                  customer.assignedProducts.map((product: any) => (
                                    <Badge
                                      key={product.id}
                                      variant="secondary"
                                      className="cursor-pointer hover:bg-destructive/20"
                                      onClick={() => {
                                        if (confirm('Are you sure you want to unassign this product?')) {
                                          unassignProductMutation.mutate({
                                            productId: product.id,
                                            userId: customer.id
                                          });
                                        }
                                      }}
                                    >
                                      {product.name} ×
                                    </Badge>
                                  ))
                                ) : (
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
                                    }}>
                                      <Pencil className="mr-2 h-4 w-4" />
                                      Edit Details
                                    </DropdownMenuItem>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-5xl bg-[#011d3d] border-[#022b5c] text-white overflow-hidden">
                                    <DialogHeader>
                                      <DialogTitle className="text-[#43EB3E]">Edit Details - {customer.firstName} {customer.lastName}</DialogTitle>
                                    </DialogHeader>
                                    <Form {...editDetailsForm}>
                                      <form onSubmit={editDetailsForm.handleSubmit((data) =>
                                        updateUserDetailsMutation.mutate({ userId: selectedCustomer.id, data })
                                      )}>
                                        <div className="grid grid-cols-4 gap-4 max-h-[70vh] overflow-y-auto p-4 [&::-webkit-scrollbar]:w-[8px] [&::-webkit-scrollbar-track]:bg-[rgba(1,29,61,0.6)] [&::-webkit-scrollbar-thumb]:bg-[#43EB3E] [&::-webkit-scrollbar-thumb]:rounded-[4px]">
                                          <div className="col-span-4">
                                            <h3 className="text-lg font-semibold mb-2 text-[#43EB3E]">Personal Information</h3>
                                          </div>
                                          <FormField
                                            control={editDetailsForm.control}
                                            name="selectedPackage"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel className="text-white">Package</FormLabel>
                                                <FormControl>
                                                  <select
                                                    {...field}
                                                    className="w-full p-2 rounded bg-[#022b5c] border-[#043875] text-white"
                                                  >
                                                    <option value="OPPORTUNITY">OPPORTUNITY</option>
                                                    <option value="MOMENTUM">MOMENTUM</option>
                                                    <option value="PROSPER">PROSPER</option>
                                                    <option value="PRESTIGE">PRESTIGE</option>
                                                    <option value="PINNACLE">PINNACLE</option>
                                                  </select>
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
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
                                          <FormField
                                            control={editDetailsForm.control}
                                            name="lastName"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel className="text-white">Last Name</FormLabel>
                                                <FormControl>
                                                  <Input {...field} className="bg-[#022b5c] border-[#043875] text-white" />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          <FormField
                                            control={editDetailsForm.control}
                                            name="email"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel className="text-white">Email</FormLabel>
                                                <FormControl>
                                                  <Input {...field} className="bg-[#022b5c] border-[#043875] text-white" />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          <FormField
                                            control={editDetailsForm.control}
                                            name="phoneNumber"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel className="text-white">Phone Number</FormLabel>
                                                <FormControl>
                                                  <Input {...field} className="bg-[#022b5c] border-[#043875] text-white" />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          <FormField
                                            control={editDetailsForm.control}
                                            name="gender"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel className="text-white">Gender</FormLabel>
                                                <FormControl>
                                                  <select
                                                    {...field}
                                                    value={field.value || ""}
                                                    className="w-full p-2 rounded bg-[#022b5c] border-[#043875] text-white"
                                                  >
                                                    <option value="">Select Gender</option>
                                                    {genderEnum.map((gender) => (
                                                      <option key={gender} value={gender}>
                                                        {gender.charAt(0).toUpperCase() + gender.slice(1)}
                                                      </option>
                                                    ))}
                                                  </select>
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          <FormField
                                            control={editDetailsForm.control}
                                            name="dateOfBirth"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel className="text-white">Date of Birth</FormLabel>
                                                <FormControl>
                                                  <Input {...field} type="date" className="bg-[#022b5c] border-[#043875] text-white" />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />
                                          <FormField
                                            control={editDetailsForm.control}
                                            name="idNumber"
                                            render={({ field }) => (
                                              <FormItem>
                                                <FormLabel className="text-white">ID Number</FormLabel>
                                                <FormControl>
                                                  <Input {...field} className="bg-[#022b5c] border-[#043875] text-white" />
                                                </FormControl>
                                                <FormMessage />
                                              </FormItem>
                                            )}
                                          />

                                    <div className="col-span-4 mt-4">
                                      <h3 className="text-lg font-semibold mb-2 text-[#43EB3E]">Address Information</h3>
                                    </div>
                                    <FormField
                                      control={editDetailsForm.control}
                                      name="address"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-white">Address</FormLabel>
                                          <FormControl>
                                            <Input {...field} className="bg-[#022b5c] border-[#043875] text-white" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={editDetailsForm.control}
                                      name="city"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-white">City</FormLabel>
                                          <FormControl>
                                            <Input {...field} className="bg-[#022b5c] border-[#043875] text-white" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={editDetailsForm.control}
                                      name="postalCode"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-white">Postal Code</FormLabel>
                                          <FormControl>
                                            <Input {...field} className="bg-[#022b5c] border-[#043875] text-white" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={editDetailsForm.control}
                                      name="isSouthAfrican"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-white">Is South African</FormLabel>
                                          <FormControl>
                                            <Checkbox
                                              checked={field.value}
                                              onCheckedChange={field.onChange}
                                              className="bg-[#022b5c] border-[#043875]"
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <div className="col-span-4 mt-4">
                                      <h3 className="text-lg font-semibold mb-2 text-[#43EB3E]">Employment Information</h3>
                                    </div>
                                    <FormField
                                      control={editDetailsForm.control}
                                      name="industry"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-white">Industry</FormLabel>
                                          <FormControl>
                                            <Input {...field} className="bg-[#022b5c] border-[#043875] text-white" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={editDetailsForm.control}
                                      name="occupation"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-white">Occupation</FormLabel>
                                          <FormControl>
                                            <Input {...field} className="bg-[#022b5c] border-[#043875] text-white" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />

                                    <div className="col-span-4 mt-4">
                                      <h3 className="text-lg font-semibold mb-2 text-[#43EB3E]">Banking Information</h3>
                                    </div>
                                    <FormField
                                      control={editDetailsForm.control}
                                      name="bankName"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-white">Bank Name</FormLabel>
                                          <FormControl>
                                            <Input {...field} className="bg-[#022b5c] border-[#043875] text-white" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={editDetailsForm.control}
                                      name="accountType"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-white">Account Type</FormLabel>
                                          <FormControl>
                                            <Input {...field} className="bg-[#022b5c] border-[#043875] text-white" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={editDetailsForm.control}
                                      name="accountNumber"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-white">Account Number</FormLabel>
                                          <FormControl>
                                            <Input {...field} className="bg-[#022b5c] border-[#043875] text-white" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={editDetailsForm.control}
                                      name="accountHolderName"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-white">Account Holder Name</FormLabel>
                                          <FormControl>
                                            <Input {...field} className="bg-[#022b5c] border-[#043875] text-white" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={editDetailsForm.control}
                                      name="branchCode"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-white">Branch Code</FormLabel>
                                          <FormControl>
                                            <Input {...field} className="bg-[#022b5c] border-[#043875] text-white" />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                    <FormField
                                      control={editDetailsForm.control}
                                      name="hasCreditCard"
                                      render={({ field }) => (
                                        <FormItem>
                                          <FormLabel className="text-white">Has Credit Card</FormLabel>
                                          <FormControl>
                                            <Checkbox
                                              checked={field.value}
                                              onCheckedChange={field.onChange}
                                              className="bg-[#022b5c] border-[#043875]"
                                            />
                                          </FormControl>
                                          <FormMessage />
                                        </FormItem>
                                      )}
                                    />
                                  </div>
                                  <DialogFooter className="px-4 pb-4">
                                    <Button type="submit" disabled={updateUserDetailsMutation.isPending}>
                                      {updateUserDetailsMutation.isPending && (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      )}
                                      Save Changes
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
                          <DropdownMenuItem
                            onSelect={(e) => {
                              e.preventDefault();
                              setSelectedCustomer(customer);
                              setShowAssignProducts(true);
                            }}
                          >
                            <Package className="mr-2 h-4 w-4" />
                            Assign Product
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if (confirm('Send fund card email to this customer?')) {
                                sendFundCardEmailMutation.mutate(customer.id);
                              }
                            }}
                          >
                            <Mail className="mr-2 h-4 w-4" />
                            Send Fund Card Email
                          </DropdownMenuItem>
                          <Dialog open={showAssignProducts} onOpenChange={setShowAssignProducts}>
                            {selectedCustomer && (
                              <AssignProductsDialog
                                customer={selectedCustomer}
                                onClose={() => {
                                  setShowAssignProducts(false);
                                  setSelectedCustomer(null);
                                }}
                              />
                            )}
                          </Dialog>
                          <Dialog open={pointsDialogOpen} onOpenChange={setPointsDialogOpen}>
                            <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => {
                                e.preventDefault();
                                setSelectedCustomer(customer);
                                setPointsDialogOpen(true);
                              }}>
                                <TrendingUp className="mr-2 h-4 w-4" />
                                Assign Points
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent className="max-w-5xl bg-[#011d3d] border-[#022b5c] text-white overflow-hidden">
                              <DialogHeader>
                                <DialogTitle className="text-[#43EB3E]">Assign Points to {customer.firstName}</DialogTitle>
                                <div className="flex items-center gap-2 mt-2">
                                  <span className="text-sm text-muted-foreground">Current Tier:</span>
                                  <Badge className={`${getTierInfo(customer.points).color}`}>
                                    {getTierInfo(customer.points).name}
                                  </Badge>
                                  {getTierInfo(customer.points).nextTier && (
                                    <span className="text-xs text-muted-foreground">
                                      ({getTierInfo(customer.points).nextTier?.pointsNeeded.toLocaleString()} points to {getTierInfo(customer.points).nextTier?.name})
                                    </span>
                                  )}
                                </div>
                              </DialogHeader>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-6">
                                  <h3 className="text-lg font-semibold">Product Activities</h3>
                                  <ScrollArea className="h-[400px] pr-4">
                                    <div className="space-y-4">
                                      {customer.assignedProducts?.map((product: any) => (
                                        <Accordion type="single" collapsible key={product.id}>
                                          <AccordionItem value="activities">
                                            <AccordionTrigger className="p-3 bg-accent/50 rounded-lg hover:no-underline">
                                              <div className="flex justify-between items-center w-full pr-4">
                                                <div className="text-left">
                                                  <p className="font-medium">{product.name}</p>
                                                  <p className="text-sm text-muted-foreground">
                                                    {product.description}
                                                  </p>
                                                </div>
                                                {pointsForm.watch("selectedActivities")?.some(id =>
                                                  product.activities?.some((a: any) => a.id === id)
                                                ) && (
                                                  <Badge variant="secondary" className="ml-2">
                                                    {product.activities?.filter((a: any) =>
                                                      pointsForm.watch("selectedActivities")?.includes(a.id)
                                                    ).length} selected
                                                  </Badge>
                                                )}
                                              </div>
                                            </AccordionTrigger>
                                            <AccordionContent>
                                              <div className="space-y-2 pt-2">
                                                {product.activities?.map((activity: any) => {
                                                  const isSystemActivity = activity.type === "SYSTEM_ACTIVATION";
                                                  if (isSystemActivity) return null;

                                                  const isPremiumOrCard = activity.type === "PREMIUM_PAYMENT" || activity.type === "CARD_BALANCE";
                                                  const multiplierType = activity.type === "PREMIUM_PAYMENT" ? 'premium' : 'card';
                                                  const pointsMultiplier = getPointsMultiplier(customer.points, multiplierType);

                                                  return (
                                                    <div
                                                      key={activity.id}
                                                      className="flex items-center justify-between p-2 pl-6 border rounded-lg"
                                                    >
                                                      <div className="flex items-center space-x-2">
                                                        <Checkbox
                                                          id={`activity-${activity.id}`}
                                                          checked={pointsForm.watch("selectedActivities")?.includes(activity.id)}
                                                          onCheckedChange={(checked) => {
                                                            const currentSelected = pointsForm.getValues("selectedActivities") || [];
                                                            const currentPoints = pointsForm.getValues("points") || 0;

                                                            if (checked) {
                                                              pointsForm.setValue("selectedActivities", [...currentSelected, activity.id]);
                                                              if (!isPremiumOrCard) {
                                                                pointsForm.setValue("points", currentPoints + activity.pointsValue);
                                                              }
                                                              const description = `Points for ${activity.type.toLowerCase().replace('_', ' ')} activity`;
                                                              if (!pointsForm.getValues("description")) {
                                                                pointsForm.setValue("description", description);
                                                              }
                                                            } else {
                                                              pointsForm.setValue(
                                                                "selectedActivities",
                                                                currentSelected.filter(id => id !== activity.id)
                                                              );
                                                              if (!isPremiumOrCard) {
                                                                pointsForm.setValue("points", currentPoints - activity.pointsValue);
                                                              } else {
                                                                const oldValue = activity.currentValue || 0;
                                                                pointsForm.setValue("points", currentPoints - oldValue);
                                                                activity.currentValue = 0;
                                                                activity.baseValue = 0;
                                                              }
                                                            }
                                                          }}
                                                        />
                                                        <label
                                                          htmlFor={`activity-${activity.id}`}
                                                          className="text-sm font-medium"
                                                        >
                                                          {activity.type.replace('_', ' ')}
                                                          {isPremiumOrCard && pointsMultiplier > 0 && (
                                                            <span className="ml-2 text-xs text-muted-foreground">
                                                              (×{pointsMultiplier})
                                                            </span>
                                                          )}
                                                        </label>
                                                      </div>
                                                      {isPremiumOrCard ? (
                                                        <div className="flex items-center space-x-2">
                                                          <Input
                                                            type="number"
                                                            className="w-32"
                                                            placeholder="Enter points"
                                                            disabled={!pointsForm.watch("selectedActivities")?.includes(activity.id)}
                                                            onChange={(e) => {
                                                              const baseValue = parseInt(e.target.value) || 0;
                                                              const multipliedValue = Math.floor(baseValue * pointsMultiplier);
                                                              const currentPoints = pointsForm.getValues("points") || 0;
                                                              const oldValue = activity.currentValue || 0;
                                                              pointsForm.setValue("points", currentPoints - oldValue + multipliedValue);
                                                              activity.currentValue = multipliedValue;
                                                              activity.baseValue = baseValue;
                                                            }}
                                                          />
                                                          {pointsMultiplier > 0 && (
                                                            <span className="text-sm text-muted-foreground">
                                                              = {activity.currentValue || 0} points
                                                            </span>
                                                          )}
                                                        </div>
                                                      ) : (
                                                        <span className="text-sm font-semibold">
                                                          {activity.pointsValue} points
                                                        </span>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </AccordionContent>
                                          </AccordionItem>
                                        </Accordion>
                                      ))}
                                    </div>
                                  </ScrollArea>

                                  <div className="pt-4 border-t">
                                    <h3 className="text-lg font-semibold mb-4">POS Points Allocation</h3>
                                    <div className="space-y-4">
                                      <div className="space-y-2">
                                        <label className="text-sm font-medium">
                                          POS Points
                                          {getPointsMultiplier(customer.points, 'pos') > 0 && (
                                            <span className="ml-2 text-xs text-muted-foreground">
                                              (×{getPointsMultiplier(customer.points, 'pos')})
                                            </span>
                                          )}
                                        </label>
                                        <div className="flex items-center space-x-2">
                                          <Input
                                            type="number"
                                            min="0"
                                            placeholder="Enter POS points"
                                            onChange={(e) => {
                                              const baseValue = parseInt(e.target.value) || 0;
                                              const multiplier = getPointsMultiplier(customer.points, 'pos');
                                              const multipliedValue = Math.floor(baseValue * multiplier);
                                              const currentPoints = pointsForm.getValues("points") || 0;
                                              const oldPosPoints = pointsForm.getValues("posPoints") || 0;
                                              pointsForm.setValue("points", currentPoints - oldPosPoints + multipliedValue);
                                              pointsForm.setValue("posPoints", multipliedValue);
                                              pointsForm.setValue("posBaseValue", baseValue);
                                            }}
                                          />
                                          {getPointsMultiplier(customer.points, 'pos') > 0 && (
                                            <span className="text-sm text-muted-foreground">
                                              = {pointsForm.watch("posPoints") || 0} points
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="space-y-6">
                                  <div className="space-y-4">
                                    <h3 className="text-lg font-semibold">Points Summary</h3>

                                    <div className="space-y-4 bg-accent/20 p-4 rounded-lg">
                                      {customer.assignedProducts?.map((product: any) => (
                                        <div key={product.id}>
                                          {product.activities
                                            ?.filter((activity: any) => pointsForm.watch("selectedActivities")?.includes(activity.id))
                                            .map((activity: any) => (
                                              <div key={activity.id} className="flex justify-between items-center py-2">
                                                <span className="text-sm">
                                                  {product.name} - {activity.type.replace('_', ' ')}
                                                  {(activity.type === "PREMIUM_PAYMENT" || activity.type === "CARD_BALANCE") && (
                                                    <span className="text-xs text-muted-foreground ml-1">
                                                      (Base: {activity.baseValue || 0})
                                                    </span>
                                                  )}
                                                </span>
                                                <span className="font-medium">
                                                  {activity.currentValue || activity.pointsValue} points
                                                </span>
                                              </div>
                                            ))}
                                        </div>
                                      ))}

                                      {pointsForm.watch("posPoints") > 0 && (
                                        <div className="flex justify-between items-center py-2 border-t">
                                          <span className="text-sm">
                                            POS Points
                                            <span className="text-xs text-muted-foreground ml-1">
                                              (Base: {pointsForm.watch("posBaseValue") || 0})
                                            </span>
                                          </span>
                                          <span className="font-medium">{pointsForm.watch("posPoints")} points</span>
                                        </div>
                                      )}

                                      <div className="flex justify-between items-center pt-4 border-t border-t-2">
                                        <span className="font-semibold">Total Points</span>
                                        <span className="text-2xl font-bold">
                                          {pointsForm.watch("points")}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="space-y-2">
                                      <label>Description <span className="text-red-500">*</span></label>
                                      <Input
                                        {...pointsForm.register("description")}
                                        placeholder="Enter description for points allocation"
                                      />
                                      {pointsForm.formState.errors.description && (
                                        <p className="text-sm text-red-500">
                                          {pointsForm.formState.errors.description.message}
                                        </p>
                                      )}
                                    </div>

                                    <Button
                                      type="submit"
                                      className="w-full"
                                      disabled={!pointsForm.watch("points") || !pointsForm.watch("description")}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        const formData = pointsForm.getValues();
                                        if (!formData.description) {
                                          toast({
                                            variant: "destructive",
                                            title: "Error",
                                            description: "Please provide a description for the points adjustment"
                                          });
                                          return;
                                        }
                                        assignPointsMutation.mutate({
                                          userId: customer.id,
                                          data: {
                                            points: formData.points,
                                            description: formData.description,
                                            selectedActivities: formData.selectedActivities,
                                            posPoints: formData.posPoints,
                                            posBaseValue: formData.posBaseValue
                                          }
                                        });
                                      }}
                                    >
                                      Assign {pointsForm.watch("points")} Points
                                    </Button>
                                  </div>
                                </div>
                              </div>
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
              
              {/* Pagination Controls */}
              {pagination.totalItems > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <PaginationControls totalItems={pagination.totalItems} />
                  <Select value={limit.toString()} onValueChange={(value) => {
                    setLimit(parseInt(value));
                    setPage(1);
                  }}>
                    <SelectTrigger className="w-[100px]">
                      <SelectValue placeholder="Per page" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10 per page</SelectItem>
                      <SelectItem value="25">25 per page</SelectItem>
                      <SelectItem value="50">50 per page</SelectItem>
                      <SelectItem value="100">100 per page</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}