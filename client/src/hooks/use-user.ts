import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { useAuth, User } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

// Define interfaces for our API responses
interface Transaction {
  id: number;
  user_id: number;
  points: number;
  type: string;
  description: string;
  status: string;
  created_at: string;
}

interface Referral {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  created_at: string;
  points: number;
}

/**
 * Hook to update user profile
 */
export function useUserProfile() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  const updateProfileMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update profile");
      }

      return await res.json();
    },
    onSuccess: (updatedUser) => {
      // Update the user data in cache
      queryClient.setQueryData(["/api/user"], (oldData: User | undefined) => {
        if (!oldData) return updatedUser;
        return { ...oldData, ...updatedUser };
      });

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    user,
    updateProfile: updateProfileMutation.mutate,
    isUpdating: updateProfileMutation.isPending,
    error: updateProfileMutation.error,
  };
}

/**
 * Hook to get user transactions
 */
export function useUserTransactions() {
  const { user } = useAuth();
  const { toast } = useToast();

  const transactionsQuery = useQuery<Transaction[]>({
    queryKey: ["/api/user/transactions"],
    queryFn: async () => {
      const res = await fetch("/api/user/transactions", {
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to fetch transactions");
      }

      return await res.json();
    },
    enabled: !!user, // Only fetch if user is logged in
  });

  // Handle errors separately
  if (transactionsQuery.error) {
    toast({
      title: "Error fetching transactions",
      description: (transactionsQuery.error as Error).message,
      variant: "destructive",
    });
  }

  return {
    transactions: transactionsQuery.data || [],
    isLoading: transactionsQuery.isLoading,
    error: transactionsQuery.error,
  };
}

/**
 * Hook to get user's referrals
 */
export function useUserReferrals() {
  const { user } = useAuth();
  const { toast } = useToast();

  const referralsQuery = useQuery<Referral[]>({
    queryKey: ["/api/user/referrals"],
    queryFn: async () => {
      const res = await fetch("/api/user/referrals", {
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to fetch referrals");
      }

      return await res.json();
    },
    enabled: !!user, // Only fetch if user is logged in
  });
  
  // Handle errors separately
  if (referralsQuery.error) {
    toast({
      title: "Error fetching referrals",
      description: (referralsQuery.error as Error).message,
      variant: "destructive",
    });
  }

  return {
    referrals: referralsQuery.data || [],
    isLoading: referralsQuery.isLoading,
    error: referralsQuery.error,
    referralCode: user?.referral_code || "",
  };
}