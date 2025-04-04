import { useQuery, useMutation, useQueryClient, UseQueryOptions } from "@tanstack/react-query";
import { useAuth, User } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

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
 * Hook for user data retrieval and actions
 * 
 * This hook provides access to the authenticated user data and related actions.
 * It normalizes boolean flags for role information to ensure consistent behavior.
 * 
 * If the user data isn't properly loaded from the server but a token exists,
 * it will attempt to load cached user data from localStorage as a fallback.
 */
export function useUser() {
  const { user, isLoading, registerMutation, logoutMutation, token } = useAuth();
  
  // Try to get cached user data from localStorage if we have a token but no user data
  const getUserFromCache = (): User | null => {
    if (token && !user) {
      try {
        const cachedUserData = localStorage.getItem('user_data_cache');
        if (cachedUserData) {
          console.log('Using cached user data from localStorage');
          return JSON.parse(cachedUserData);
        }
      } catch (e) {
        console.warn('Error getting user data from localStorage:', e);
      }
    }
    return null;
  };
  
  const effectiveUser = user || getUserFromCache();
  
  // Create normalized user role flags to make role-checking more reliable
  const normalizedUser = effectiveUser ? {
    ...effectiveUser,
    // Ensure these are always boolean values
    is_admin: Boolean(effectiveUser.is_admin),
    is_super_admin: Boolean(effectiveUser.is_super_admin),
    is_agent: Boolean(effectiveUser.is_agent),
    is_enabled: Boolean(effectiveUser.is_enabled)
  } : null;
  
  // Debug output to help diagnose user data issues
  if (token && !normalizedUser) {
    console.warn('Token exists but no user data available (not even from cache)');
  } else if (normalizedUser) {
    console.log('User data available:', normalizedUser.id, normalizedUser.email);
  }
  
  return {
    user: normalizedUser,
    isLoading,
    registerMutation,
    logoutMutation,
    isAuthenticated: !!normalizedUser && !!token,
    isAdmin: normalizedUser ? Boolean(normalizedUser.is_admin) : false,
    isSuperAdmin: normalizedUser ? Boolean(normalizedUser.is_super_admin) : false,
    isAgent: normalizedUser ? Boolean(normalizedUser.is_agent) : false,
  };
}

/**
 * Hook to update user profile
 */
export function useUserProfile() {
  const queryClient = useQueryClient();
  const { user, token } = useAuth();
  const { toast } = useToast();

  const updateProfileMutation = useMutation({
    mutationFn: async (userData: Partial<User>) => {
      const res = await apiRequest(
        "PUT",
        "/api/user/profile",
        userData
      );

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
    isUpdating: updateProfileMutation.isLoading,
    error: updateProfileMutation.error,
  };
}

/**
 * Hook to get user transactions
 */
export function useUserTransactions() {
  const { user, token } = useAuth();
  const { toast } = useToast();

  const transactionsQuery = useQuery<Transaction[]>({
    queryKey: ["/api/user/transactions"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/transactions");

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
  const { user, token } = useAuth();
  const { toast } = useToast();

  const referralsQuery = useQuery<Referral[]>({
    queryKey: ["/api/user/referrals"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/user/referrals");

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