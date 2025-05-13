import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Clock, Loader2, Check } from "lucide-react";
import { useState } from "react";
import { Separator } from "@/components/ui/separator";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PackageCard, packages } from "@/components/shared/package-card";

export default function CustomerProducts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [pendingRequests, setPendingRequests] = useState<number[]>([]);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  // Fetch user profile data
  const { data: profile, isLoading: isProfileLoading } = useQuery({
    queryKey: ["/api/customer/profile"],
    queryFn: async () => {
      const response = await fetch("/api/customer/profile", {
        credentials: 'include',
      });
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      return response.json();
    },
  });

  const { data: products, isLoading: isProductsLoading } = useQuery({
    queryKey: ["/api/products/customer"],
    queryFn: async () => {
      const response = await fetch("/api/products/customer", {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        if (response.headers.get('content-type')?.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.message || "Failed to fetch products");
        }
        throw new Error("Failed to fetch products");
      }
      return response.json();
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (packageName: string) => {
      const response = await fetch("/api/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          selected_package: packageName,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorMessage: string;

        if (contentType?.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || 'Failed to update package';
        } else {
          errorMessage = 'Failed to update package. Please try again.';
        }

        throw new Error(errorMessage);
      }

      return await response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/user"], (oldData: any) => ({
        ...oldData,
        ...data,
      }));
      queryClient.invalidateQueries({ queryKey: ["/api/customer/profile"] });
      toast({
        title: "Success",
        description: "Package updated successfully",
      });
      setShowPackageDialog(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const quoteRequestMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await fetch("/api/quote-requests", {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
          'Accept': 'application/json'
        },
        body: JSON.stringify({ productId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to submit quote request");
      }

      return data;
    },
    onSuccess: (_, productId) => {
      setPendingRequests(prev => [...prev, productId]);
      toast({
        title: "Success",
        description: "Your quote request has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handlePackageSelect = (packageName: string) => {
    if (packageName !== profile?.selectedPackage) {
      setSelectedPackage(packageName);
      setShowPackageDialog(true);
    }
  };

  const confirmPackageChange = () => {
    if (selectedPackage) {
      updateProfileMutation.mutate(selectedPackage);
    }
  };

  const currentPackage = packages.find(pkg => pkg.name === profile?.selectedPackage);
  const newPackage = packages.find(pkg => pkg.name === selectedPackage);

  if (isProfileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Package selection section */}
      {/* Current Package Display - Prominent section at the top */}
      {currentPackage && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-lg p-6 mb-6 shadow-lg">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h2 className="text-2xl font-bold mb-1">Your Current Package: {currentPackage.display}</h2>
              <p className="text-lg opacity-90">R{currentPackage.price}/month with {currentPackage.points.toLocaleString()} activation points</p>
            </div>
            <div className="flex items-center bg-white/20 backdrop-blur-sm rounded-lg px-4 py-2">
              <Check className="h-5 w-5 mr-2 text-green-400" />
              <span className="font-semibold">Active Package</span>
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Package Benefits:</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {currentPackage.perks.slice(0, 8).map((perk, index) => (
                <div key={index} className="flex items-center">
                  <span className="inline-block mr-1 text-green-400">✓</span>
                  <span className="text-sm">{perk}</span>
                </div>
              ))}
              {currentPackage.perks.length > 8 && (
                <div className="text-sm font-medium">+{currentPackage.perks.length - 8} more benefits</div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        <h1 className="text-3xl font-bold">Available Packages</h1>
        <p className="text-muted-foreground">
          Browse our packages and select the one that fits your needs
        </p>
        
        <Card>
          <CardHeader>
            <CardTitle>Package Selection</CardTitle>
            <CardDescription>
              {currentPackage 
                ? "Switch to a different package by selecting from the options below"
                : "Choose your first package from the options below"}
            </CardDescription>
          </CardHeader>
          <CardContent className="p-2 sm:p-6">
            <div className="relative w-full">
              <Carousel className="w-full">
                <CarouselContent className="-ml-2 sm:-ml-4">
                  {packages.map((pkg) => (
                    <CarouselItem key={pkg.name} className="pl-2 sm:pl-4 basis-full sm:basis-1/2 lg:basis-1/3">
                      <PackageCard
                        pkg={pkg}
                        isSelected={pkg.name === profile?.selectedPackage}
                        anySelected={!!profile?.selectedPackage}
                        onSelect={() => handlePackageSelect(pkg.name)}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <div className="hidden sm:block">
                  <CarouselPrevious className="-left-4 sm:-left-12" />
                  <CarouselNext className="-right-4 sm:-right-12" />
                </div>
              </Carousel>
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator className="my-6" />

      {/* Insurance products section */}
      <div className="space-y-3">
        <h2 className="text-2xl font-bold">Insurance Products</h2>
        <p className="text-muted-foreground">
          Browse our products and request comparative quotes
        </p>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isProductsLoading ? (
            Array(3).fill(0).map((_, index) => (
              <Card key={index} className="flex flex-col">
                <CardHeader>
                  <div className="h-6 w-1/2 animate-pulse bg-muted rounded mb-2"></div>
                  <div className="h-4 w-3/4 animate-pulse bg-muted rounded"></div>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="h-8 w-full animate-pulse bg-muted rounded mt-4"></div>
                </CardContent>
              </Card>
            ))
          ) : products?.map((product: any) => (
            <Card key={product.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{product.name}</CardTitle>
                <CardDescription>{product.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <Button 
                  className="w-full"
                  onClick={() => quoteRequestMutation.mutate(product.id)}
                  disabled={pendingRequests.includes(product.id) || quoteRequestMutation.isPending}
                  variant={pendingRequests.includes(product.id) ? "secondary" : "default"}
                >
                  {pendingRequests.includes(product.id) ? (
                    <>
                      <Clock className="w-4 h-4 mr-2" />
                      Request Pending
                    </>
                  ) : quoteRequestMutation.isPending ? (
                    "Submitting..."
                  ) : (
                    <>
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Request Quote
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
          {(!isProductsLoading && (!products || products.length === 0)) && (
            <div className="col-span-full text-center py-8 text-muted-foreground">
              No products available at the moment
            </div>
          )}
        </div>
      </div>

      {/* Package Change Confirmation Dialog */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Package Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to change your package from 
              {currentPackage ? ` ${currentPackage.display} (R${currentPackage.price}/month)` : ' your current package'} to 
              {newPackage ? ` ${newPackage.display} (R${newPackage.price}/month)` : ' the selected package'}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-start flex flex-col sm:flex-row gap-2 mt-4">
            <Button type="button" variant="default" onClick={confirmPackageChange} disabled={updateProfileMutation.isPending}>
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                "Confirm Change"
              )}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowPackageDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}