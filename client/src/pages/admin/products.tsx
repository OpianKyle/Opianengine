import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Plus, Pencil, Power, PowerOff, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction, AlertDialogTrigger } from "@/components/ui/alert-dialog";

const activityTypes = [
  "PRODUCT_ACTIVATION",
  "PREMIUM_PAYMENT",
  "CARD_BALANCE",
  "UPGRADE",
  "RENEWAL"
] as const;

const productSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  activities: z.array(z.object({
    type: z.enum(activityTypes),
    pointsValue: z.number().min(0, "Points value must be positive"),
  })),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function ProductManagement() {
  const { data: products = [], refetch } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const { toast } = useToast();
  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      activities: activityTypes.map(type => ({
        type,
        pointsValue: type === "PREMIUM_PAYMENT" || type === "CARD_BALANCE" ? 0 : 0,
      })),
    },
  });

  const editForm = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      activities: activityTypes.map(type => ({
        type,
        pointsValue: type === "PREMIUM_PAYMENT" || type === "CARD_BALANCE" ? 0 : 0,
      })),
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const filteredActivities = data.activities.map(activity => ({
        ...activity,
        pointsValue: activity.type === "PREMIUM_PAYMENT" || activity.type === "CARD_BALANCE"
          ? 0
          : activity.pointsValue
      }));

      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, activities: filteredActivities }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Success", description: "Product created successfully" });
      form.reset();
      setIsCreateOpen(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({ id, ...data }: { id: number } & ProductFormData) => {
      const filteredActivities = data.activities.map(activity => ({
        ...activity,
        pointsValue: activity.type === "PREMIUM_PAYMENT" || activity.type === "CARD_BALANCE"
          ? 0
          : activity.pointsValue
      }));

      const res = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, activities: filteredActivities }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({ title: "Success", description: "Product updated successfully" });
      editForm.reset();
      setIsEditOpen(false);
      setEditingProduct(null);
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
    mutationFn: async ({ id, enabled }: { id: number; enabled: boolean }) => {
      const res = await fetch(`/api/products/${id}/toggle-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Success", description: "Product status updated successfully" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      toast({ title: "Success", description: "Product deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const onEdit = (product: any) => {
    setEditingProduct(product);
    editForm.reset({
      name: product.name,
      description: product.description,
      activities: activityTypes.map(type => {
        const activity = product.activities.find((a: any) => a.type === type);
        return {
          type,
          pointsValue: activity ? activity.pointsValue : 0,
        };
      }),
    });
    setIsEditOpen(true);
  };

  const renderActivitiesForm = (formContext: any, isEdit: boolean = false) => (
    <div className="space-y-4">
      {activityTypes.map((type, index) => {
        const isPointsManaged = type === "PREMIUM_PAYMENT" || type === "CARD_BALANCE";
        return (
          <div key={type} className="grid grid-cols-2 gap-4 items-center">
            <label className="font-medium text-white">
              {type.split('_').map(word =>
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
              ).join(' ')} points:
            </label>
            <div className="flex items-center space-x-2">
              <Input
                type="number"
                disabled={isPointsManaged}
                {...formContext.register(`activities.${index}.pointsValue`, { valueAsNumber: true })}
                className="bg-[#011d3d] border-[#022b5c] text-white focus:ring-[#43EB3E] disabled:opacity-50"
              />
              {isPointsManaged && (
                <span className="text-sm text-[#43EB3E]">
                  (Managed in customer assignments)
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Product Management</h1>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#43EB3E] hover:bg-[#3AD936] text-black">
              <Plus className="h-4 w-4 mr-2" />
              Create Product
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#011d3d] border border-[#022b5c] text-white sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-white">Create New Product</DialogTitle>
            </DialogHeader>
            <form
              onSubmit={form.handleSubmit((data) => createProductMutation.mutate(data))}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Name</label>
                <Input
                  {...form.register("name")}
                  className="bg-[#011d3d] border-[#022b5c] text-white focus:ring-[#43EB3E]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-white">Description</label>
                <Input
                  {...form.register("description")}
                  className="bg-[#011d3d] border-[#022b5c] text-white focus:ring-[#43EB3E]"
                />
              </div>
              <Tabs defaultValue="activities" className="w-full">
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white">Activity Points</h3>
                </div>
                <TabsContent value="activities" className="mt-2">
                  {renderActivitiesForm(form)}
                </TabsContent>
              </Tabs>
              <Button
                type="submit"
                className="w-full bg-[#43EB3E] hover:bg-[#3AD936] text-black"
              >
                Create Product
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="bg-[#011d3d] border border-[#022b5c] text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-white">Edit Product</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={editForm.handleSubmit((data) =>
              editingProduct && updateProductMutation.mutate({ id: editingProduct.id, ...data })
            )}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Name</label>
              <Input
                {...editForm.register("name")}
                className="bg-[#011d3d] border-[#022b5c] text-white focus:ring-[#43EB3E]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-white">Description</label>
              <Input
                {...editForm.register("description")}
                className="bg-[#011d3d] border-[#022b5c] text-white focus:ring-[#43EB3E]"
              />
            </div>
            <Tabs defaultValue="activities" className="w-full">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">Activity Points</h3>
              </div>
              <TabsContent value="activities" className="mt-2">
                <div className="space-y-4">
                  {activityTypes.map((type, index) => {
                    const isPointsManaged = type === "PREMIUM_PAYMENT" || type === "CARD_BALANCE";
                    return (
                      <div key={type} className="grid grid-cols-2 gap-4 items-center">
                        <label className="font-medium text-white">
                          {type.split('_').map((word: string) =>
                            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                          ).join(' ')} points:
                        </label>
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            disabled={isPointsManaged}
                            {...editForm.register(`activities.${index}.pointsValue`, { valueAsNumber: true })}
                            className="bg-[#011d3d] border-[#022b5c] text-white focus:ring-[#43EB3E] disabled:opacity-50"
                          />
                          {isPointsManaged && (
                            <span className="text-sm text-[#43EB3E]">
                              (Managed in customer assignments)
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </TabsContent>
            </Tabs>
            <Button
              type="submit"
              className="w-full bg-[#43EB3E] hover:bg-[#3AD936] text-black"
            >
              Update Product
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Card className="bg-[#011d3d] border-[#022b5c]">
        <CardHeader>
          <CardTitle className="text-white">All Products</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-[#022b5c]">
                <TableHead className="text-white">Name</TableHead>
                <TableHead className="text-white">Description</TableHead>
                <TableHead className="text-white">Activities</TableHead>
                <TableHead className="text-white">Status</TableHead>
                <TableHead className="text-white">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product: any) => (
                <TableRow key={product.id} className="border-[#022b5c]">
                  <TableCell className="text-white">{product.name}</TableCell>
                  <TableCell className="text-white">{product.description}</TableCell>
                  <TableCell>
                    <ScrollArea className="h-20">
                      {product.activities?.map((activity: any) => (
                        <div key={activity.type} className="flex items-center space-x-2 mb-1">
                          <Badge variant="outline" className="border-[#022b5c] text-white">
                            {activity.type.split('_').map(word =>
                              word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
                            ).join(' ')}
                          </Badge>
                          <span className="text-white">
                            {activity.type === "PREMIUM_PAYMENT" || activity.type === "CARD_BALANCE"
                              ? "(Managed in customer assignments)"
                              : `${activity.pointsValue} points`
                            }
                          </span>
                        </div>
                      ))}
                    </ScrollArea>
                  </TableCell>
                  <TableCell>
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      product.isEnabled ? 'bg-[#43EB3E]/20 text-[#43EB3E]' : 'bg-red-500/20 text-red-500'
                    }`}>
                      {product.isEnabled ? 'Active' : 'Disabled'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(product)}
                        className="border-[#022b5c] text-white hover:bg-[#022b5c]"
                      >
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm(
                            product.isEnabled
                              ? "Are you sure you want to disable this product?"
                              : "Are you sure you want to enable this product?"
                          )) {
                            toggleStatusMutation.mutate({
                              id: product.id,
                              enabled: !product.isEnabled,
                            });
                          }
                        }}
                        className="border-[#022b5c] text-white hover:bg-[#022b5c]"
                      >
                        {product.isEnabled ? (
                          <PowerOff className="h-4 w-4 mr-2" />
                        ) : (
                          <Power className="h-4 w-4 mr-2" />
                        )}
                        {product.isEnabled ? 'Disable' : 'Enable'}
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="destructive"
                            size="sm"
                            className="bg-red-500/20 text-red-500 hover:bg-red-500/30"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="bg-[#011d3d] border border-[#022b5c]">
                          <AlertDialogHeader>
                            <AlertDialogTitle className="text-white">Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription className="text-gray-300">
                              This action cannot be undone. This will permanently delete the product
                              and remove all associated data.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="bg-transparent border-[#022b5c] text-white hover:bg-[#022b5c]">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteProductMutation.mutate(product.id)}
                              className="bg-red-500/20 text-red-500 hover:bg-red-500/30"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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