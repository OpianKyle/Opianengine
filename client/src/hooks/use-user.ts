import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from "zod";

const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phoneNumber: z.string(),
  isAdmin: z.boolean().default(false),
  isSuperAdmin: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
  points: z.number().default(0),
  referralCode: z.string().nullable().optional(),
  referredBy: z.string().nullable().optional(),
  createdAt: z.string(),
  // Extended fields
  isSouthAfrican: z.boolean().optional(),
  idNumber: z.string().optional(),
  dateOfBirth: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  employerName: z.string().optional(),
  jobTitle: z.string().optional(),
  employmentDuration: z.string().optional(),
  bankName: z.string().optional(),
  accountType: z.string().optional(),
  accountNumber: z.string().optional(),
  hasCreditCard: z.boolean().optional(),
  signature: z.string().optional(),
});

export type User = z.infer<typeof userSchema>;

const loginResponseSchema = z.object({
  user: userSchema,
  token: z.string()
});

export function useUser() {
  const queryClient = useQueryClient();
  const tokenKey = 'auth_token';

  // Helper function to get stored token
  const getStoredToken = () => localStorage.getItem(tokenKey);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      try {
        console.log('Fetching user data...');
        const response = await fetch('/api/user', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (response.status === 401) {
          console.log('User not authenticated');
          return null;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('User data received:', data);
        return userSchema.parse(data);
      } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Login failed');
      }

      const data = await response.json();
      const loginResponse = loginResponseSchema.parse(data);
      localStorage.setItem(tokenKey, loginResponse.token);
      return loginResponse.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['/api/user'], user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: { 
      email: string; 
      password: string; 
      firstName: string; 
      lastName: string; 
      phoneNumber: string;
      isAdmin?: boolean;
      isSuperAdmin?: boolean;
      // Extended fields
      isSouthAfrican?: boolean;
      idNumber?: string;
      dateOfBirth?: string;
      address?: string;
      city?: string;
      postalCode?: string;
      employerName?: string;
      jobTitle?: string;
      employmentDuration?: string;
      bankName?: string;
      accountType?: string;
      accountNumber?: string;
      hasCreditCard?: boolean;
      signature?: string;
    }) => {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Registration failed');
      }

      const data = await response.json();
      return userSchema.parse(data);
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['/api/user'], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      // Clear token from localStorage
      localStorage.removeItem(tokenKey);

      // Clear all user-related queries
      queryClient.removeQueries({ queryKey: ['/api/user'] });
      queryClient.setQueryData(['/api/user'], null);
    },
  });

  return {
    user,
    isLoading,
    error,
    token: getStoredToken(),
    loginMutation,
    logoutMutation,
    registerMutation,
  };
}