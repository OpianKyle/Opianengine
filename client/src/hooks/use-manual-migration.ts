import { useMutation } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export interface ManualMigrationResponse {
  success: boolean;
  message: string;
  results?: {
    usersFound: number;
    usersMigrated: number;
    usersSkipped: number;
    errors: number;
    output: string;
  };
}

/**
 * Hook for running manual migrations
 * These are direct DB operations that bypass the typical migration flow
 * Used for cases when standard migrations are experiencing timeout issues
 */
export function useManualMigration() {
  // Mutation for agent commission migration
  const {
    mutate: runManualMigration,
    isLoading: isManualMigrationRunning,
    isSuccess: isManualMigrationSuccess,
    data: manualMigrationResults,
    error: manualMigrationError,
    reset: resetManualMigration
  } = useMutation<ManualMigrationResponse, Error>(
    async () => {
      try {
        const res = await fetch('/api/manual-migration/agent-commissions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        if (!res.ok) {
          const errorText = await res.text();
          throw new Error(errorText || 'Failed to run manual migration');
        }

        const data = await res.json();
        
        if (data.success) {
          toast({
            title: "Manual migration completed",
            description: data.message || "The migration has been completed successfully.",
            variant: "default",
          });
        } else {
          toast({
            title: "Manual migration error",
            description: data.message || "There was an error running the migration.",
            variant: "destructive",
          });
        }
        
        return data;
      } catch (error) {
        toast({
          title: "Manual migration failed",
          description: error instanceof Error ? error.message : "An unknown error occurred",
          variant: "destructive",
        });
        throw error;
      }
    }
  );

  return {
    runManualMigration,
    isManualMigrationRunning,
    isManualMigrationSuccess,
    manualMigrationResults,
    manualMigrationError,
    resetManualMigration
  };
}