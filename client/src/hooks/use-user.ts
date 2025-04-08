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
 */
export function useUser() {
  const { user, isLoading, registerMutation, logoutMutation } = useAuth();
  
  return {
    user,
    isLoading,
    registerMutation,
    logoutMutation,
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
      console.log('Updating user profile, checking environment...');
      
      // Check if in development mode with test users
      if (import.meta.env.DEV && 
          (sessionStorage.getItem('dev_mode_active') === 'true' || 
           (user?.email && user.email.includes('@example.com')))) {
        
        console.log('Using development profile update', userData);
        
        // Set dev mode flag if not already set
        if (user?.email && user.email.includes('@example.com')) {
          sessionStorage.setItem('dev_mode_active', 'true');
        }
        
        // In development mode, just return the merged user data
        return {
          ...user,
          ...userData,
        };
      }
      
      // Normal production code
      console.log('Using production profile update endpoint');
      
      try {
        const res = await apiRequest(
          "PUT",
          "/api/user-profile",
          userData
        );
        
        if (!res.ok) {
          if (res.status === 401) {
            console.error('Authentication error updating profile');
            throw new Error("You are not authenticated. Please login again.");
          }
          const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
          throw new Error(errorData.message || `Failed to update profile: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('Profile update response:', data);
        return data;
      } catch (error) {
        console.error('Error updating profile:', error);
        throw error;
      }
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
      console.log('Fetching transactions data, checking environment...');
      
      // Check if in development mode with test users
      if (import.meta.env.DEV && 
          (sessionStorage.getItem('dev_mode_active') === 'true' || 
           (user?.email && user.email.includes('@example.com')))) {
        
        console.log('Using development transactions data');
        
        // Set dev mode flag if not already set
        if (user?.email && user.email.includes('@example.com')) {
          sessionStorage.setItem('dev_mode_active', 'true');
        }
        
        // Return mock data for development
        return [
          {
            id: 1,
            user_id: user.id,
            points: 2500,
            type: 'SIGNUP',
            description: 'Initial signup bonus',
            status: 'COMPLETED',
            created_at: new Date().toISOString()
          },
          {
            id: 2,
            user_id: user.id,
            points: 500,
            type: 'REFERRAL',
            description: 'Referral bonus',
            status: 'COMPLETED',
            created_at: new Date(Date.now() - 86400000).toISOString() // 1 day ago
          }
        ];
      }
      
      // Normal production code
      console.log('Using production transactions endpoint');
      
      try {
        const res = await apiRequest("GET", "/api/user/transactions");
        
        if (!res.ok) {
          if (res.status === 401) {
            console.error('Authentication error fetching transactions');
            return [];
          }
          const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
          throw new Error(errorData.message || `Failed to fetch transactions: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('Transactions data retrieved:', data);
        return data;
      } catch (error) {
        console.error('Error fetching transactions:', error);
        throw error;
      }
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
      console.log('Fetching referrals data, checking environment...');
      
      // Check if in development mode with test users
      if (import.meta.env.DEV && 
          (sessionStorage.getItem('dev_mode_active') === 'true' || 
           (user?.email && user.email.includes('@example.com')))) {
        
        console.log('Using development referrals data');
        
        // Set dev mode flag if not already set
        if (user?.email && user.email.includes('@example.com')) {
          sessionStorage.setItem('dev_mode_active', 'true');
        }
        
        // Return mock data for development
        return [
          {
            id: 1,
            email: 'referral1@test.com',
            first_name: 'John',
            last_name: 'Doe',
            created_at: new Date().toISOString(),
            points: 2000
          },
          {
            id: 2,
            email: 'referral2@test.com',
            first_name: 'Jane',
            last_name: 'Smith',
            created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
            points: 2000
          }
        ];
      }
      
      // Normal production code
      console.log('Using production referrals endpoint');
      
      try {
        const res = await apiRequest("GET", "/api/user/referrals");
        
        if (!res.ok) {
          if (res.status === 401) {
            console.error('Authentication error fetching referrals');
            return [];
          }
          const errorData = await res.json().catch(() => ({ message: "Unknown error" }));
          throw new Error(errorData.message || `Failed to fetch referrals: ${res.status}`);
        }
        
        const data = await res.json();
        console.log('Referrals data retrieved:', data);
        return data;
      } catch (error) {
        console.error('Error fetching referrals:', error);
        throw error;
      }
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