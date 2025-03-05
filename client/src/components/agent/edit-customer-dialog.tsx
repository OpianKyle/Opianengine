import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const packages = [
  { id: 'BEGINNER', name: 'Beginner', price: 550 },
  { id: 'NOVICE', name: 'Novice', price: 750 },
  { id: 'ACTIVE', name: 'Active', price: 950 },
  { id: 'PROFESSIONAL', name: 'Professional', price: 1150 },
  { id: 'EXPERT', name: 'Expert', price: 1350 },
];

const customerSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  isSouthAfrican: z.boolean(),
  idNumber: z.string().min(1, "ID Number is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["male", "female", "other"], { required_error: "Please select a gender" }),
  mobileNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  occupation: z.string().min(1, "Occupation is required"),
  industry: z.string().min(1, "Industry is required"),
  addressLine1: z.string().min(1, "Address is required"),
  suburb: z.string().min(1, "Suburb is required"),
  postalCode: z.string().min(4, "Postal code must be at least 4 characters"),
  hasCreditCard: z.boolean(),
  selectedPackage: z.enum(["BEGINNER", "NOVICE", "ACTIVE", "PROFESSIONAL", "EXPERT"]),
  accountHolderName: z.string().min(1, "Account holder name is required"),
  bankName: z.string().min(1, "Bank name is required"),
  branchCode: z.string().min(1, "Branch code is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  accountType: z.enum(["SAVINGS", "CURRENT", "CHEQUE", "CREDIT"], { required_error: "Please select an account type" }),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface EditCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: CustomerFormData & { id: number } | null;
}

const accountTypes = ["SAVINGS", "CURRENT", "CHEQUE", "CREDIT"];

const industries = [
  "Agriculture",
  "Construction",
  "Education",
  "Finance",
  "Healthcare",
  "Information Technology",
  "Manufacturing",
  "Mining",
  "Retail",
  "Services",
  "Transport",
  "Other"
];

export default function EditCustomerDialog({ open, onOpenChange, customer }: EditCustomerDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      isSouthAfrican: false,
      idNumber: "",
      dateOfBirth: "",
      gender: "male",
      mobileNumber: "",
      occupation: "",
      industry: "",
      addressLine1: "",
      suburb: "",
      postalCode: "",
      hasCreditCard: false,
      selectedPackage: "BEGINNER",
      accountHolderName: "",
      bankName: "",
      branchCode: "",
      accountNumber: "",
      accountType: "SAVINGS",
    }
  });

  // Load customer data when dialog opens
  useEffect(() => {
    if (customer && open) {
      // Format date to YYYY-MM-DD for the date input
      const formattedDate = customer.dateOfBirth ? 
        new Date(customer.dateOfBirth).toISOString().split('T')[0] : '';

      form.reset({
        email: customer.email || "",
        firstName: customer.firstName || "",
        lastName: customer.lastName || "",
        isSouthAfrican: customer.isSouthAfrican || false,
        idNumber: customer.idNumber || "",
        dateOfBirth: formattedDate,
        gender: customer.gender || "male",
        mobileNumber: customer.mobileNumber || "",
        occupation: customer.occupation || "",
        industry: customer.industry || "",
        addressLine1: customer.addressLine1 || "",
        suburb: customer.suburb || "",
        postalCode: customer.postalCode || "",
        hasCreditCard: customer.hasCreditCard || false,
        selectedPackage: customer.selectedPackage || "BEGINNER",
        accountHolderName: customer.accountHolderName || "",
        bankName: customer.bankName || "",
        branchCode: customer.branchCode || "",
        accountNumber: customer.accountNumber || "",
        accountType: customer.accountType || "SAVINGS",
      });
    }
  }, [customer, open, form]);

  const updateCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const response = await fetch(`/api/agent/customers/${customer?.id}/update`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify({
          ...data,
          // Map form fields to API fields
          phoneNumber: data.mobileNumber,
          address: data.addressLine1
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update customer");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/customers"] });
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CustomerFormData) => {
    updateCustomerMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto bg-background border-border [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-[#43EB3E]">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-foreground">Edit Customer</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Update customer details and information.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold border-b pb-2 text-foreground">Personal Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                        <Input type="email" {...field} />
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
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="idNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ID Number/Passport</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="isSouthAfrican"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 h-10 px-3 border rounded-md mt-6">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-[#43EB3E] data-[state=checked]:bg-[#43EB3E] data-[state=checked]:text-white"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">South African citizen</FormLabel>
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
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Gender" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold border-b pb-2 text-foreground">Employment & Address Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                <FormField
                  control={form.control}
                  name="industry"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Industry</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Industry" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {industries.map(industry => (
                            <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="addressLine1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
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
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold border-b pb-2 text-foreground">Package & Financial Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <FormField
                  control={form.control}
                  name="selectedPackage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Package</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a package" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="BEGINNER">Beginner - R550/month</SelectItem>
                          <SelectItem value="NOVICE">Novice - R750/month</SelectItem>
                          <SelectItem value="ACTIVE">Active - R950/month</SelectItem>
                          <SelectItem value="PROFESSIONAL">Professional - R1150/month</SelectItem>
                          <SelectItem value="EXPERT">Expert - R1350/month</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="hasCreditCard"
                  render={({ field }) => (
                    <FormItem className="flex items-center space-x-2 h-10 px-3 border rounded-md mt-6">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-[#43EB3E] data-[state=checked]:bg-[#43EB3E] data-[state=checked]:text-white"
                        />
                      </FormControl>
                      <FormLabel className="!mt-0">Do you own a credit card?</FormLabel>
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="space-y-3">
              <h3 className="text-lg font-semibold border-b pb-2 text-foreground">Banking Details</h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <FormField
                  control={form.control}
                  name="accountHolderName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Holder Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
                  name="branchCode"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Branch Code</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
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
                  name="accountType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Account Type</FormLabel>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select Account Type" />
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
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updateCustomerMutation.isPending}
              >
                {updateCustomerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  "Update Customer"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}