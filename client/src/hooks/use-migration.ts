import { useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface MigrationResults {
  success: boolean;
  message: string;
  results?: {
    usersFound: number;
    usersProcessed: number;
    usersSkipped: number;
    errors: any[];
  };
  error?: string;
}

/**
 * Hook to execute migration operations
 * Can only be used by admin users
 */
export function useMigration() {
  // Get user and token from auth context
  const { user, token } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.is_admin || user?.is_super_admin;

  const runAgentCustomersMutation = useMutation<MigrationResults, Error, void>({
    mutationFn: async () => {
      // Add authorization header if token is available
      const customHeaders: Record<string, string> = {};
      if (token) {
        console.log("Using token for authorization", { tokenExists: !!token });
        customHeaders["Authorization"] = `Bearer ${token}`;
      } else {
        console.log("No token available for authorization");
      }
      
      const res = await apiRequest(
        "POST",
        "/api/migration/agent-customers",
        {},
        customHeaders
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || error.error || "Migration failed");
      }

      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Migration successful",
        description: `Migrated ${data.results?.usersProcessed || 0} customers. ${data.results?.usersSkipped || 0} skipped.`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Migration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    isAdmin,
    runAgentCustomersMigration: runAgentCustomersMutation,
    isLoading: runAgentCustomersMutation.isPending,
    isSuccess: runAgentCustomersMutation.isSuccess,
    error: runAgentCustomersMutation.error,
    results: runAgentCustomersMutation.data?.results,
  };
}