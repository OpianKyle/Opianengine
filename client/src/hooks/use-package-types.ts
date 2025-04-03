import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "./use-toast";

// Hook to update package types in the agent_commissions table
export function usePackageTypes() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updatePackageTypesMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/package-types/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update package types");
      }

      return await response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries that might be affected by this change
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/agents/commissions"],
      });
      
      // Show success message
      toast({
        title: "Package Types Updated",
        description: "Package types have been successfully standardized in the database.",
        variant: "success",
      });
    },
    onError: (error: Error) => {
      console.error("Error updating package types:", error);
      
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update package types. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    updatePackageTypes: updatePackageTypesMutation.mutate,
    isUpdating: updatePackageTypesMutation.isPending,
    isSuccess: updatePackageTypesMutation.isSuccess,
    isError: updatePackageTypesMutation.isError,
    error: updatePackageTypesMutation.error,
    reset: updatePackageTypesMutation.reset,
  };
}