import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Clock, Check } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Package definitions
const packages = [
  {
    name: "OPPORTUNITY",
    display: "Opportunity",
    price: 350,
    points: 2500,
    perks: [
      "Activation Points: 2,500",
      "EMS Assist",
      "Legal Assist",
      "Repatriation Cover",
      "Celebrate Life",
      "24/7 Nurse On-Call"
    ]
  },
  {
    name: "MOMENTUM",
    display: "Momentum",
    price: 450,
    points: 5000,
    perks: [
      "Activation Points: 5,000",
      "Funeral Cover: R5,000",
      "Funeral Assist",
      "EMS Assist",
      "Legal Assist",
      "Repatriation Cover",
      "Celebrate Life",
      "24/7 Nurse On-Call"
    ]
  },
  {
    name: "PROSPER",
    display: "Prosper",
    price: 550,
    points: 7500,
    perks: [
      "Activation Points: 7,500",
      "Funeral Cover: R10,000",
      "Accidental Death Cover: R20,000",
      "Funeral Assist",
      "Family Income Benefit: R5,000 x6",
      "EMS Assist",
      "Legal Assist",
      "Repatriation Cover",
      "Celebrate Life",
      "24/7 Nurse On-Call",
      "Virtual GP Assistant",
      "Medical Second Opinion"
    ]
  },
  {
    name: "PRESTIGE",
    display: "Prestige",
    price: 695,
    points: 10000,
    perks: [
      "Activation Points: 10,000",
      "Funeral Cover: R15,000",
      "Accidental Death Cover: R50,000",
      "Funeral Assist",
      "Family Income Benefit: R5,000 x6",
      "EMS Assist",
      "Legal Assist",
      "Repatriation Cover",
      "Celebrate Life",
      "24/7 Nurse On-Call",
      "Virtual GP Assistant",
      "Medical Second Opinion",
      "Crime Victim Assist",
      "Assault & Trauma Assist",
      "Emergency Medical Services"
    ]
  },
  {
    name: "PINNACLE",
    display: "Pinnacle",
    price: 825,
    points: 12500,
    perks: [
      "Activation Points: 12,500",
      "Funeral Cover: R20,000",
      "Accidental Death Cover: R100,000",
      "Funeral Assist",
      "Family Income Benefit: R5,000 x6",
      "EMS Assist",
      "Legal Assist",
      "Lawyer Assist",
      "Repatriation Cover",
      "Celebrate Life",
      "24/7 Nurse On-Call",
      "Virtual GP Assistant",
      "Medical Second Opinion",
      "Crime Victim Assist",
      "Assault & Trauma Assist",
      "Emergency Medical Services"
    ]
  }
];

// PackageCard component
const PackageCard = ({ pkg, isSelected, onSelect, anySelected }: {
  pkg: typeof packages[0],
  isSelected: boolean,
  onSelect: () => void,
  anySelected: boolean
}) => (
  <div className="w-full px-4">
    <Card
      className={`w-full h-[700px] cursor-pointer transition-all relative overflow-visible
        ${isSelected
          ? 'border-[#43EB3E] ring-2 ring-[#43EB3E] shadow-[0_0_10px_rgba(67,235,62,0.3)]'
          : anySelected
            ? 'opacity-50 hover:opacity-75'
            : 'hover:border-primary'
        }`}
      onClick={onSelect}
    >
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex justify-between items-center text-lg">
          {pkg.display}
          {isSelected && (
            <Check className="h-5 w-5 text-[#43EB3E]" />
          )}
        </CardTitle>
        <CardDescription className="text-base">R{pkg.price}/month</CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <div className="space-y-2">
          <ul className="space-y-2">
            {pkg.perks.map((perk, index) => (
              <li key={index} className="flex items-start text-sm">
                <Badge variant="outline" className="mr-2 shrink-0">✓</Badge>
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
      <div className="absolute bottom-6 left-6 right-6">
        <Button
          className={`w-full ${isSelected ? 'bg-[#43EB3E] hover:bg-[#43EB3E]' : ''}`}
          variant={isSelected ? "default" : "outline"}
        >
          {isSelected ? "Selected" : "Select Package"}
        </Button>
      </div>
    </Card>
  </div>
);

export default function CustomerProducts() {
  const queryClient = useQueryClient();
  const [pendingRequests, setPendingRequests] = useState<number[]>([]);
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const { toast } = useToast();

  // Get current profile data including selected package
  const { data: profile, isLoading } = useQuery({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const response = await fetch("/api/profile", {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("Failed to fetch profile");
      }
      return response.json();
    }
  });

  const currentPackage = packages.find(pkg => pkg.name === profile?.selectedPackage);

  // Handle package selection
  const handlePackageSelect = (packageName: string) => {
    if (packageName !== profile?.selectedPackage) {
      setSelectedPackage(packageName.toUpperCase());
      setShowPackageDialog(true);
    }
  };

  // Update profile with new package
  const updatePackageMutation = useMutation({
    mutationFn: async (packageName: string) => {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_package: packageName }),
        credentials: 'include'
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update profile");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Package Updated",
        description: "Your package has been updated successfully."
      });
      setShowPackageDialog(false);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  });

  // Confirm package change
  const confirmPackageChange = () => {
    if (selectedPackage) {
      updatePackageMutation.mutate(selectedPackage);
    }
  };

  // Regular products functionality
  const { data: products } = useQuery({
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

  return (
    <div className="space-y-6">
      <Tabs defaultValue="packages" className="w-full">
        <TabsList className="grid grid-cols-2 w-full mb-4">
          <TabsTrigger value="packages">Subscription Packages</TabsTrigger>
          <TabsTrigger value="products">Other Products</TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Available Packages</h1>
            <p className="text-muted-foreground">
              {currentPackage 
                ? `Your current package: ${currentPackage.display} (R${currentPackage.price}/month)` 
                : 'Select a subscription package that suits your needs'}
            </p>
          </div>

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
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold">Available Products</h1>
            <p className="text-muted-foreground">
              Browse our products and request comparative quotes
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {products?.map((product: any) => (
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
            {(!products || products.length === 0) && (
              <div className="col-span-full text-center py-8 text-muted-foreground">
                No products available at the moment
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Package change confirmation dialog */}
      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Package Change</DialogTitle>
            <DialogDescription>
              Are you sure you want to change your package to {selectedPackage ? packages.find(p => p.name === selectedPackage)?.display : ''}?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPackageDialog(false)}>Cancel</Button>
            <Button onClick={confirmPackageChange} disabled={updatePackageMutation.isPending}>
              {updatePackageMutation.isPending ? "Updating..." : "Confirm Change"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}