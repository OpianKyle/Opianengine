import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

type CardStatus = "NOT_DELIVERED" | "OUT_FOR_DELIVERY" | "DELIVERED";

interface UpdateCardStatusParams {
  userIds: number[];
  cardStatus: CardStatus;
}

export function useCardStatusMutation() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ userIds, cardStatus }: UpdateCardStatusParams) => {
      // Send request to updated API endpoint with proper path
      const res = await apiRequest(
        "POST",
        "/api/admin/customers/update-card-status",
        { userIds, cardStatus }
      );
      return await res.json();
    },
    onSuccess: (data) => {
      // Invalidate customers query to refresh the data
      queryClient.invalidateQueries({ queryKey: ["/api/admin/customers"] });
      
      // Show success toast
      toast({
        title: "Card status updated",
        description: data.message || `Updated card status for ${data.count || "selected"} customers`,
        variant: "default",
      });
    },
    onError: (error: any) => {
      // Show error toast
      toast({
        title: "Failed to update card status",
        description: error.message || "An error occurred while updating card status",
        variant: "destructive",
      });
    },
  });
}