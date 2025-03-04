import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const packages = [
  { id: 'BEGINNER', name: 'Beginner', price: 550 },
  { id: 'NOVICE', name: 'Novice', price: 750 },
  { id: 'ACTIVE', name: 'Active', price: 950 },
  { id: 'PROFESSIONAL', name: 'Professional', price: 1150 },
  { id: 'EXPERT', name: 'Expert', price: 1350 },
];

const customerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  industry: z.string().min(1, "Industry is required"),
  occupation: z.string().min(1, "Occupation is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  postalCode: z.string().min(4, "Postal code must be at least 4 characters"),
  selectedPackage: z.enum(["BEGINNER", "NOVICE", "ACTIVE", "PROFESSIONAL", "EXPERT"]),
  mandateAgreement: z.literal(true, {
    errorMap: () => ({ message: "You must agree to the mandate terms" }),
  }),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CreateCustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateCustomerDialog({ open, onOpenChange }: CreateCustomerDialogProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      industry: "",
      occupation: "",
      address: "",
      city: "",
      postalCode: "",
      selectedPackage: "BEGINNER",
      mandateAgreement: false,
    }
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const response = await fetch("/api/agent/customers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to create customer");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Customer created successfully",
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
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Customer</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
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
              <FormField
                control={form.control}
                name="address"
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
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
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
              <FormField
                control={form.control}
                name="selectedPackage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Package</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
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
            </div>

            {/* Mandate Agreement Section */}
            <div className="border rounded-lg p-4 bg-muted/50 space-y-4">
              <h3 className="font-medium">Customer Mandate Agreement</h3>
              <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                <div className="whitespace-pre-wrap">
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
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>
                        I confirm that the customer has agreed to the above mandate
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
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