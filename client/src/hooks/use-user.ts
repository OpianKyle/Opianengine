import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from "zod";

const accountTypes = ["SAVINGS", "CURRENT", "CHEQUE", "CREDIT"] as const;

// Base user schema with minimal required fields
const userSchema = z.object({
  id: z.number().optional(),  // Make ID optional for new users
  email: z.string().email(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  isAdmin: z.boolean().default(false),
  isSuperAdmin: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
  points: z.number().default(0),
}).and(z.object({
  // All optional fields
  referralCode: z.string().nullable().optional(),
  referredBy: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  isSouthAfrican: z.boolean().optional(),
  idNumber: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  occupation: z.string().nullable().optional(),
  employerName: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  employmentDuration: z.string().nullable().optional(),
  selectedPackage: z.string().nullable().optional(),
  bankName: z.string().nullable().optional(),
  accountType: z.enum(accountTypes).nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  accountHolderName: z.string().nullable().optional(),
  branchCode: z.string().nullable().optional(),
  hasCreditCard: z.boolean().optional(),
  signature: z.string().nullable().optional(),
}).partial()).passthrough();

export type User = z.infer<typeof userSchema>;
export type AccountType = typeof accountTypes[number];

export function useUser() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      try {
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
        return userSchema.parse(data);
      } catch (error) {
        console.error('Error fetching user:', error);
        throw error;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
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
        const errorData = await response.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();
      console.log('Login response:', data); // Debug log
      const user = data.user || data;
      return userSchema.parse(user);
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

      queryClient.removeQueries({ queryKey: ['/api/user'] });
      queryClient.setQueryData(['/api/user'], null);
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
      // Employment information
      industry?: string;
      occupation?: string;
      employerName?: string;
      jobTitle?: string;
      employmentDuration?: string;
      // Banking information
      selectedPackage?: string;
      bankName?: string;
      accountType?: AccountType;
      accountNumber?: string;
      accountHolderName?: string;
      branchCode?: string;
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

  return {
    user,
    isLoading,
    error,
    loginMutation,
    logoutMutation,
    registerMutation,
  };
}