import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { post } from "@/lib/api";
import { useAuth } from "@/hooks/use-auth";

const cancellationSchema = z.object({
  reason: z.string().min(1, "Please select a reason"),
  additionalFeedback: z.string().optional(),
});

type CancellationFormValues = z.infer<typeof cancellationSchema>;

interface CancellationDialogProps {
  open: boolean;
  onClose: () => void;
  onCancelled: () => Promise<void>;
  packageType: string;
}

export function CancellationDialog({ 
  open, 
  onClose, 
  onCancelled,
  packageType 
}: CancellationDialogProps) {
  const [submitting, setSubmitting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const form = useForm<CancellationFormValues>({
    resolver: zodResolver(cancellationSchema),
    defaultValues: {
      reason: "",
      additionalFeedback: "",
    },
  });

  const { user } = useAuth();

  const cancelMutation = useMutation({
    mutationFn: async (data: CancellationFormValues) => {
      // Get user's subscription email token
      const emailToken = user?.paystack_email_token;
      
      if (!emailToken) {
        throw new Error('Unable to cancel subscription: Missing email token. Please contact support.');
      }
      
      // Make API request to cancel subscription
      return await post('/api/subscription/cancel', {
        emailToken,
        reason: data.reason,
        feedback: data.additionalFeedback
      });
    },
    onSuccess: async () => {
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been successfully cancelled.",
        variant: "default",
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["user"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-status"] });
      
      // Close dialog and reset form
      onClose();
      form.reset();
      
      // Call parent component's callback
      await onCancelled();
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "There was an error cancelling your subscription. Please try again.",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setSubmitting(false);
    }
  });

  const onSubmit = async (data: CancellationFormValues) => {
    setSubmitting(true);
    cancelMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="bg-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-gray-900">Cancel {packageType} Subscription</DialogTitle>
          <DialogDescription className="text-gray-600">
            We're sorry to see you go. Your subscription will remain active until the end of your current billing period. Please let us know why you're cancelling so we can improve our service.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="font-medium">Reason for cancellation</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="too_expensive" id="too_expensive" />
                        <Label htmlFor="too_expensive" className="font-normal">Too expensive</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="not_useful" id="not_useful" />
                        <Label htmlFor="not_useful" className="font-normal">Not useful for my needs</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="switching" id="switching" />
                        <Label htmlFor="switching" className="font-normal">Switching to another service</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="technical_issues" id="technical_issues" />
                        <Label htmlFor="technical_issues" className="font-normal">Technical issues</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="other" id="other" />
                        <Label htmlFor="other" className="font-normal">Other</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="additionalFeedback"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="font-medium">Additional feedback (optional)</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Please let us know if there's anything else you'd like to share..."
                      className="resize-none h-24"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={submitting}>
                Keep Subscription
              </Button>
              <Button type="submit" disabled={submitting} className="bg-red-600 hover:bg-red-700 text-white">
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Cancelling...
                  </>
                ) : (
                  "Cancel Subscription"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}