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
      console.log('Card status update successful, running enhanced cache invalidation');
      
      // Stage 1: Force refetch by removing all customer queries from cache
      queryClient.removeQueries({ queryKey: ["/api/admin/customers"] });
      
      // Stage 2: Invalidate all customer queries to trigger refetch with fresh data
      queryClient.invalidateQueries({ 
        queryKey: ["/api/admin/customers"],
        refetchType: 'all', // Force immediate refetch
        exact: false // Include all queries that start with this key
      });
      
      // Stage 3: Multiple delayed refetches to catch any race conditions
      // First delayed refetch
      setTimeout(() => {
        console.log('Running first delayed refetch after card status update');
        queryClient.invalidateQueries({ 
          queryKey: ["/api/admin/customers"],
          refetchType: 'all',
          exact: false
        });
      }, 300);
      
      // Second delayed refetch with longer timeout
      setTimeout(() => {
        console.log('Running second delayed refetch after card status update');
        queryClient.invalidateQueries({ 
          queryKey: ["/api/admin/customers"],
          refetchType: 'all',
          exact: false
        });
      }, 1000);
      
      // Final delayed refetch to ensure data is eventually consistent
      setTimeout(() => {
        console.log('Running final delayed refetch after card status update');
        queryClient.invalidateQueries({ 
          queryKey: ["/api/admin/customers"],
          refetchType: 'all',
          exact: false
        });
      }, 2500);
      
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