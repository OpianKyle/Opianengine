import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useUser } from "@/hooks/use-user";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Match the account types with the database schema
const accountTypes = ["SAVINGS", "CURRENT", "CHEQUE", "CREDIT"] as const;

const profileSchema = z.object({
  email: z.string().email("Invalid email address"),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone_number: z.string().min(1, "Mobile number is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  postal_code: z.string().min(1, "Postal code is required"),
  id_number: z.string().min(1, "ID number is required"),
  date_of_birth: z.string().min(1, "Date of birth is required"),
  industry: z.string().min(1, "Industry is required"),
  occupation: z.string().min(1, "Occupation is required"),
  is_south_african: z.boolean(),
  selected_package: z.string(),
  bank_name: z.string().min(1, "Bank name is required"),
  account_type: z.enum(accountTypes),
  account_number: z.string().min(1, "Account number is required"),
  has_credit_card: z.boolean(),
  password: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const packages = [
  {
    name: "BEGINNER",
    display: "Beginner",
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
    name: "NOVICE",
    display: "Novice",
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
    name: "ACTIVE",
    display: "Active",
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
    name: "PROFESSIONAL",
    display: "Professional",
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
    name: "EXPERT",
    display: "Expert",
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

export default function ProfilePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  useEffect(() => {
    if (user?.selected_package) {
      setSelectedPackage(user.selected_package);
    }
  }, [user]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: user?.email || "",
      first_name: user?.first_name || "",
      last_name: user?.last_name || "",
      phone_number: user?.phone_number || "",
      address: user?.address || "",
      city: user?.city || "",
      postal_code: user?.postal_code || "",
      id_number: user?.id_number || "",
      date_of_birth: user?.date_of_birth || "",
      industry: user?.industry || "",
      occupation: user?.occupation || "",
      is_south_african: user?.is_south_african || false,
      selected_package: user?.selected_package || "BEGINNER",
      bank_name: user?.bank_name || "",
      account_type: user?.account_type as ProfileFormData['account_type'] || "SAVINGS",
      account_number: user?.account_number || "",
      has_credit_card: user?.has_credit_card || false,
      password: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await fetch("/api/user", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          // Combine address lines -  No longer needed with address_line2 removed
          address: data.address,
        }),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorMessage: string;

        if (contentType?.includes("application/json")) {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || 'Failed to update profile';
        } else {
          errorMessage = 'Failed to update profile. Please try again.';
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
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Success",
        description: "Profile updated successfully",
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

  const handlePackageSelect = (packageName: string) => {
    if (packageName !== user?.selected_package) {
      setSelectedPackage(packageName.toUpperCase());
      setShowPackageDialog(true);
    }
  };

  const confirmPackageChange = () => {
    const currentValues = form.getValues();
    updateProfileMutation.mutate({
      ...currentValues,
      selected_package: selectedPackage || "BEGINNER",
    });
  };

  if (!user) {
    return null;
  }

  const currentPackage = packages.find(pkg => pkg.name === user?.selected_package);
  const newPackage = packages.find(pkg => pkg.name === selectedPackage);

  return (
    <div className="w-full min-h-full">
      <div className="space-y-0.5 px-4 sm:px-6 mb-4">
        <h2 className="text-2xl font-bold tracking-tight">Profile Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and set your personal preferences.
        </p>
      </div>

      <Separator className="my-4" />

      <div className="px-4 sm:px-6 space-y-4 pb-20 lg:pb-6">
        <Card>
          <CardHeader>
            <CardTitle>Package Selection</CardTitle>
            <CardDescription>
              Your current package: {currentPackage ? `${currentPackage.display} (R${currentPackage.price}/month)` : 'No package selected'}
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
                        isSelected={pkg.name === user?.selected_package}
                        anySelected={!!user?.selected_package}
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

        <Form {...form}>
          <form onSubmit={form.handleSubmit(data => updateProfileMutation.mutate(data))}>
            <Card>
              <CardHeader>
                <CardTitle>Personal Information</CardTitle>
                <CardDescription>Update your personal and account information</CardDescription>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col space-y-4">
                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="first_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="w-full" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="last_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="w-full" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" disabled className="w-full" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input {...field} type="tel" className="w-full" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator className="my-4" />

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="id_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID Number</FormLabel>
                          <FormControl>
                            <Input {...field} className="w-full" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="date_of_birth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date of Birth</FormLabel>
                          <FormControl>
                            <Input {...field} type="date" className="w-full" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-1">
                    <FormField
                      control={form.control}
                      name="is_south_african"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>South African Citizen</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator className="my-4" />

                  <div className="grid gap-4 grid-cols-1">
                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Input {...field} className="w-full" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>City</FormLabel>
                          <FormControl>
                            <Input {...field} className="w-full" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="postal_code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Postal Code</FormLabel>
                          <FormControl>
                            <Input {...field} className="w-full" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator className="my-4" />

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="industry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Industry</FormLabel>
                          <FormControl>
                            <Input {...field} className="w-full" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="occupation"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Occupation</FormLabel>
                          <FormControl>
                            <Input {...field} className="w-full" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator className="my-4" />

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="bank_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Bank Name</FormLabel>
                          <FormControl>
                            <Input {...field} className="w-full" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="account_type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Type</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select account type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {accountTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type.charAt(0) + type.slice(1).toLowerCase()}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="account_number"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Number</FormLabel>
                          <FormControl>
                            <Input {...field} className="w-full" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="has_credit_card"
                      render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center justify-between">
                            <FormLabel>Has Credit Card</FormLabel>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator className="my-4" />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Password (leave empty to keep current)</FormLabel>
                        <FormControl>
                          <Input
                            type="password"
                            {...field}
                            autoComplete="new-password"
                            className="w-full"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="mt-4 w-full sm:w-auto"
                    disabled={updateProfileMutation.isPending}
                  >
                    {updateProfileMutation.isPending ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </form>
        </Form>
      </div>

      <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Confirm Package Change</DialogTitle>
            <DialogDescription>
              {currentPackage && newPackage ? (
                <>
                  You are about to change your package from {currentPackage.display} (R{currentPackage.price}/month) to {newPackage.display} (R{newPackage.price}/month).
                  <br /><br />
                  {newPackage.price > currentPackage.price ? (
                    <>
                      This will increase your monthly payment by R{newPackage.price - currentPackage.price}.
                      <br /><br />
                    </>
                  ) : newPackage.price < currentPackage.price ? (
                    <>
                      This will decrease your monthly payment by R{currentPackage.price - newPackage.price}.
                      <br /><br />
                    </>
                  ) : null}
                  This change will update your monthly debit order mandate. A new mandate agreement will be sent to you via email.
                </>
              ) : (
                'Package information not available'
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShowPackageDialog(false)} className="w-full sm:w-auto">Cancel</Button>
            <Button onClick={confirmPackageChange} disabled={updateProfileMutation.isPending} className="w-full sm:w-auto">
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Updating...
                </>
              ) : (
                'Confirm Change'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}