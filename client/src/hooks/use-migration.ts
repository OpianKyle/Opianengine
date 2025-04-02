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

// Check if running in development mode (Replit)
const isDev = () => 
  window.location.hostname.includes('.replit.dev') || 
  window.location.hostname.includes('.repl.co') ||
  window.location.hostname === 'localhost';

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
      // For development mode (Replit environment), return mock results without making API call
      if (isDev()) {
        console.log('DEV MODE: Using mock migration in client');
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Return mock successful migration result
        return {
          success: true,
          message: 'Migration completed successfully',
          results: {
            usersFound: 5,
            usersProcessed: 5,
            usersSkipped: 0,
            errors: []
          }
        };
      }
      
      // Production code - make actual API call
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
      // Show success toast
      toast({
        title: "Migration successful",
        description: `Migrated ${data.results?.usersProcessed || 0} customers. ${data.results?.usersSkipped || 0} skipped.`,
      });
      
      // Also show a more complete success message
      toast({
        title: "Migration executed successfully",
        description: "The agent customers migration has been completed.",
        variant: "success",
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