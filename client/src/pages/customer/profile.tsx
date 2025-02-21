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

// Update packages to match registration
const packages = [
  {
    name: "BEGINNER",
    display: "Beginner",
    price: 350,
    points: 5000,
    perks: [
      "Activation Points: 5000",
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
    points: 10000,
    perks: [
      "Activation Points: 10 000",
      "Funeral Cover: R5 000",
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
    points: 15000,
    perks: [
      "Activation Points: 15 000",
      "Funeral Cover: R10 000",
      "Accidental Death Cover: R20 000",
      "Funeral Assist",
      "Family Income Benefit: R5 000 x6",
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
    points: 20000,
    perks: [
      "Activation Points: 20 000",
      "Funeral Cover: R15 000",
      "Accidental Death Cover: R50 000",
      "Funeral Assist",
      "Family Income Benefit: R5 000 x6",
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
    points: 25000,
    perks: [
      "Activation Points: 25 000",
      "Funeral Cover: R20 000",
      "Accidental Death Cover: R100 000",
      "Funeral Assist",
      "Family Income Benefit: R5 000 x6",
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
      className={`w-full cursor-pointer transition-all relative
        ${isSelected
          ? 'border-[#43EB3E] ring-2 ring-[#43EB3E] shadow-[0_0_10px_rgba(67,235,62,0.3)]'
          : anySelected
            ? 'opacity-50 hover:opacity-75'
            : 'hover:border-primary'
        }`}
      onClick={onSelect}
    >
      <CardHeader className="p-8">
        <CardTitle className="flex justify-between items-center text-2xl mb-2">
          {pkg.display}
          {isSelected && (
            <Check className="h-6 w-6 text-[#43EB3E]" />
          )}
        </CardTitle>
        <CardDescription className="text-xl font-semibold">R{pkg.price}/month</CardDescription>
      </CardHeader>
      <CardContent className="p-8">
        <div className="space-y-6">
          <ul className="space-y-4">
            {pkg.perks.map((perk, index) => (
              <li key={index} className="flex items-start text-base">
                <Badge variant="outline" className="mr-3 mt-1 shrink-0">✓</Badge>
                <span>{perk}</span>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  </div>
);

// Match the account types with the database schema
const accountTypes = ["SAVINGS", "CURRENT", "CHEQUE", "CREDIT"] as const;

const profileSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  mobileNumber: z.string().min(1, "Mobile number is required"),
  addressLine1: z.string().min(1, "Address is required"),
  addressLine2: z.string().optional(),
  suburb: z.string().min(1, "Suburb is required"),
  postalCode: z.string().min(1, "Postal code is required"),
  idNumber: z.string().min(1, "ID number is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  industry: z.string().min(1, "Industry is required"),
  occupation: z.string().min(1, "Occupation is required"),
  isSouthAfrican: z.boolean(),
  selectedPackage: z.string(),
  bankName: z.string().min(1, "Bank name is required"),
  accountType: z.enum(accountTypes),
  accountNumber: z.string().min(1, "Account number is required"),
  hasCreditCard: z.boolean(),
  password: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function ProfilePage() {
  const { user } = useUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  useEffect(() => {
    // Update selected package when user data is loaded
    if (user?.selectedPackage) {
      setSelectedPackage(user.selectedPackage);
    }
  }, [user]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: user?.email || "",
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      mobileNumber: user?.phoneNumber || "",
      addressLine1: user?.address?.split('\n')[0] || "",
      addressLine2: user?.address?.split('\n')[1] || "",
      suburb: user?.city || "",
      postalCode: user?.postalCode || "",
      idNumber: user?.idNumber || "",
      dateOfBirth: user?.dateOfBirth || "",
      industry: user?.industry || "",
      occupation: user?.occupation || "",
      isSouthAfrican: user?.isSouthAfrican || false,
      selectedPackage: user?.selectedPackage || "BEGINNER",
      bankName: user?.bankName || "",
      accountType: (user?.accountType as ProfileFormData['accountType']) || "SAVINGS",
      accountNumber: user?.accountNumber || "",
      hasCreditCard: user?.hasCreditCard || false,
      password: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      try {
        // Simplify the payload to match the database schema
        const payload = {
          firstName: data.firstName,
          lastName: data.lastName,
          phoneNumber: data.mobileNumber,
          address: data.addressLine1 + (data.addressLine2 ? `\n${data.addressLine2}` : ''),
          city: data.suburb,
          postalCode: data.postalCode,
          idNumber: data.idNumber,
          dateOfBirth: data.dateOfBirth,
          industry: data.industry,
          occupation: data.occupation,
          isSouthAfrican: data.isSouthAfrican,
          selectedPackage: data.selectedPackage.toUpperCase(), //Convert to uppercase before sending
          bankName: data.bankName,
          accountType: data.accountType,
          accountNumber: data.accountNumber,
          hasCreditCard: data.hasCreditCard,
          ...(data.password ? { password: data.password } : {})
        };

        const response = await fetch("/api/user", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: 'include',
          body: JSON.stringify(payload),
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
      } catch (error) {
        console.error('Profile update error:', error);
        throw error instanceof Error ? error : new Error('An unexpected error occurred');
      }
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
    if (packageName !== user?.selectedPackage) {
      setSelectedPackage(packageName.toUpperCase()); //Convert to uppercase immediately
      setShowPackageDialog(true);
    }
  };

  const confirmPackageChange = () => {
    const currentValues = form.getValues();
    updateProfileMutation.mutate({
      ...currentValues,
      selectedPackage: selectedPackage || "BEGINNER",
    });
  };

  if (!user) {
    return null;
  }

  const currentPackage = packages.find(pkg => pkg.name === user?.selectedPackage);
  const newPackage = packages.find(pkg => pkg.name === selectedPackage);

  return (
    <div className="space-y-6">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Profile Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and set your personal preferences.
        </p>
      </div>

      <Separator />

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Package Selection</CardTitle>
            <CardDescription>
              Your current package: {currentPackage ? `${currentPackage.display} (R${currentPackage.price}/month)` : 'No package selected'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="relative px-12 overflow-visible">
              <Carousel className="w-full">
                <CarouselContent className="-ml-4">
                  {packages.map((pkg) => (
                    <CarouselItem key={pkg.name} className="pl-4 basis-full lg:basis-1/2 xl:basis-1/3">
                      <PackageCard
                        pkg={pkg}
                        isSelected={pkg.name === user?.selectedPackage}
                        anySelected={!!user?.selectedPackage}
                        onSelect={() => handlePackageSelect(pkg.name)}
                      />
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="absolute -left-12 -translate-y-1/2" />
                <CarouselNext className="absolute -right-12 -translate-y-1/2" />
              </Carousel>
            </div>
          </CardContent>
        </Card>

        <Dialog open={showPackageDialog} onOpenChange={setShowPackageDialog}>
          <DialogContent>
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
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPackageDialog(false)}>Cancel</Button>
              <Button onClick={confirmPackageChange} disabled={updateProfileMutation.isPending}>
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

        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>Update your personal and account information</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(data => updateProfileMutation.mutate(data))} className="space-y-6">
                {/* Basic Information */}
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input {...field} type="email" disabled />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="mobileNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input {...field} type="tel" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Identity Information */}
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="idNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ID Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="dateOfBirth"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Date of Birth</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="isSouthAfrican"
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

                <Separator />

                {/* Address Information */}
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="addressLine1"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 1</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="addressLine2"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Address Line 2 (Optional)</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="suburb"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Suburb</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Postal Code</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Employment Information */}
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="industry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Industry</FormLabel>
                        <FormControl>
                          <Input {...field} />
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
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Banking Information */}
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="bankName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bank Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="accountType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Type</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
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

                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="hasCreditCard"
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

                <Separator />

                {/* Password Change */}
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
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full"
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
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}