import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
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

// Package types moved to products page

export default function ProfilePage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [showPackageDialog, setShowPackageDialog] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  // Fetch user profile data
  const { data: profile, isLoading } = useQuery({
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

  useEffect(() => {
    if (profile?.selectedPackage) {
      setSelectedPackage(profile.selectedPackage);
    }
  }, [profile]);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      email: profile?.email || "",
      first_name: profile?.firstName || "",
      last_name: profile?.lastName || "",
      phone_number: profile?.phoneNumber || "",
      address: profile?.address || "",
      city: profile?.city || "",
      postal_code: profile?.postalCode || "",
      id_number: profile?.idNumber || "",
      date_of_birth: profile?.dateOfBirth || "",
      industry: profile?.industry || "",
      occupation: profile?.occupation || "",
      is_south_african: profile?.isSouthAfrican || false,
      selected_package: profile?.selectedPackage || "BEGINNER",
      bank_name: profile?.bankName || "",
      account_type: profile?.accountType as ProfileFormData['account_type'] || "SAVINGS",
      account_number: profile?.accountNumber || "",
      has_credit_card: profile?.hasCreditCard || false,
      password: "",
    },
  });

  // Reset form when profile data is loaded
  useEffect(() => {
    if (profile) {
      form.reset({
        email: profile.email,
        first_name: profile.firstName,
        last_name: profile.lastName,
        phone_number: profile.phoneNumber,
        address: profile.address,
        city: profile.city,
        postal_code: profile.postalCode,
        id_number: profile.idNumber,
        date_of_birth: profile.dateOfBirth,
        industry: profile.industry,
        occupation: profile.occupation,
        is_south_african: profile.isSouthAfrican,
        selected_package: profile.selectedPackage,
        bank_name: profile.bankName,
        account_type: profile.accountType as ProfileFormData['account_type'],
        account_number: profile.accountNumber,
        has_credit_card: profile.hasCreditCard,
        password: "",
      });
    }
  }, [profile, form]);

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
    if (packageName !== profile?.selectedPackage) {
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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium">Subscription Package</h3>
            <p className="text-sm text-muted-foreground">
              {profile?.selectedPackage 
                ? `Current package: ${profile.selectedPackage}` 
                : 'No package selected'}
            </p>
          </div>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/customer/products'}
          >
            View Packages
          </Button>
        </div>

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
                                className="scale-125"
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
                                className="scale-125"
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

      {/* Package selection dialog removed - now handled in the products page */}
    </div>
  );
}