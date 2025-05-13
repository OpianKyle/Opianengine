import { useState } from "react";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";

const packages = [
  { id: 'OPPORTUNITY', name: 'Opportunity', price: 350 },
  { id: 'MOMENTUM', name: 'Momentum', price: 450 },
  { id: 'PROSPER', name: 'Prosper', price: 550 },
  { id: 'PRESTIGE', name: 'Prestige', price: 695 },
  { id: 'PINNACLE', name: 'Pinnacle', price: 825 }
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
  selectedPackage: z.enum(["OPPORTUNITY", "MOMENTUM", "PROSPER", "PRESTIGE", "PINNACLE"]),
  accountHolderName: z.string().min(1, "Account holder name is required"),
  bankName: z.string().min(1, "Bank name is required"),
  branchCode: z.string().min(1, "Branch code is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  accountType: z.enum(["SAVINGS", "CURRENT", "CHEQUE", "CREDIT"], { required_error: "Please select an account type" }),
  mandateAgreement: z.boolean()
    .refine(val => val === true, {
      message: "You must agree to the mandate terms"
    }),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
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

export default function CreateCustomerDialog({ open, onOpenChange }: CreateCustomerDialogProps) {
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
      selectedPackage: "OPPORTUNITY",
      accountHolderName: "",
      bankName: "",
      branchCode: "",
      accountNumber: "",
      accountType: "SAVINGS",
      mandateAgreement: false, // User must check this box before submitting
    }
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const response = await fetch("/api/agent/customers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: 'include',
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create customer");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Customer created successfully. Their temporary password is: " + data.temporaryPassword,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/agent/customers"] });
      form.reset();
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
    createCustomerMutation.mutate(data);
  };

  const today = new Date().toISOString().split('T')[0];
  const MandateText = `This signed Authority and Mandate refers to our contract dated
${today}
("the Agreement").

I / We hereby authorise you to issue and deliver payment instructions of ${
    packages.find(pkg => pkg.id === form.getValues().selectedPackage)?.price || 0
  } per month for the subscription fee to your Banker for collection against my / our abovementioned account at my / our above-mentioned Bank (or any other bank or branch to which I / we may transfer my / our account) on condition that the sum of such payment instructions will never exceed my / our obligations as as agreed to in the Agreement and commencing on 1st of each month and continuing until this Authority and Mandate is terminated by me / us by giving you notice in writing of not less than 60 ordinary working days, and sent by prepaid registered post or delivered to your address as indicated above.

The individual payment instructions so authorised to be issued must be issued and delivered as follows: ${
    packages.find(pkg => pkg.id === form.getValues().selectedPackage)?.price || 0
  } monthly for 12 months. This is an annual agreement which is automatically renewable unless canceled in writing 

In the event that the payment day falls on a Sunday, or recognised South African public holiday, the payment day will automatically be the preceding ordinary business day.

Payment Instructions due in December may be debited against my account on a earlier date

I / We understand that the withdrawals hereby authorized will be processed through a computerized system provided by the South African Banks and I also understand that details of each withdrawal will be printed on my bank statement. Each transaction will contain a number, which must be included in the said payment instruction and if provided to you should enable you to identify the Agreement. A payment reference is added to this form before the issuing of any payment instruction.
Mandate
I /We acknowledge that all payment instructions issued by you shall be treated by my / our above-mentioned Bank as if the instructions have been issued by me/us personally.

Cancellation
I /We agree that although this Authority and Mandate may be cancelled by me/us, such cancellation will not cancel the Agreement. I/We shall not be entitled to any refund of amounts which you have withdrawn while this authority was in force, if such amounts were legally owing to you.

Assignment
I/We acknowledge that this Authority and Mandate has been ceded to Netcash (Pty) Ltd as per your agreement with Netcash (Pty) Ltd, but in the absence of such assignment of the Agreement, this Authority and Mandate will be null and void.`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto bg-background border-border [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-[#43EB3E]">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-foreground">Create New Customer</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Enter customer details and have them agree to the mandate to create their account.
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
                          <SelectItem value="OPPORTUNITY">Opportunity - R350/month</SelectItem>
                          <SelectItem value="MOMENTUM">Momentum - R450/month</SelectItem>
                          <SelectItem value="PROSPER">Prosper - R550/month</SelectItem>
                          <SelectItem value="PRESTIGE">Prestige - R695/month</SelectItem>
                          <SelectItem value="PINNACLE">Pinnacle - R825/month</SelectItem>
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

            <div className="space-y-3">
              <h3 className="text-lg font-semibold border-b pb-2 text-foreground">Mandate Agreement</h3>
              <div className="border rounded-lg p-4 bg-muted space-y-3">
                <ScrollArea className="h-[300px] w-full rounded-md border p-6 bg-background [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-[#43EB3E]">
                  <div className="whitespace-pre-wrap text-foreground text-base leading-relaxed">
                    {MandateText}
                  </div>
                </ScrollArea>
                <FormField
                  control={form.control}
                  name="mandateAgreement"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 pt-2">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="border-[#43EB3E] data-[state=checked]:bg-[#43EB3E] data-[state=checked]:text-white"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="text-foreground">
                          <div className="space-y-2">
                            <p>I confirm that the customer has agreed to the above mandate</p>
                          </div>
                        </FormLabel>
                        <FormMessage />
                      </div>
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
                disabled={createCustomerMutation.isPending}
              >
                {createCustomerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Customer"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}