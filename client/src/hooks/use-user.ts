import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from "zod";

const accountTypes = ["SAVINGS", "CURRENT", "CHEQUE", "CREDIT"] as const;

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
  referralCode: z.string().nullable(),
  referredBy: z.string().nullable(),
  createdAt: z.string(),
  // Extended fields - all optional and nullable
  isSouthAfrican: z.boolean().optional(),
  idNumber: z.string().nullable().optional(),
  dateOfBirth: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postalCode: z.string().nullable().optional(),
  // Employment information
  industry: z.string().nullable().optional(),
  occupation: z.string().nullable().optional(),
  employerName: z.string().nullable().optional(),
  jobTitle: z.string().nullable().optional(),
  employmentDuration: z.string().nullable().optional(),
  // Banking information
  selectedPackage: z.union([z.string(), z.number()]).nullable().optional(),
  bankName: z.string().nullable().optional(),
  accountType: z.enum(accountTypes).nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  accountHolderName: z.string().nullable().optional(),
  branchCode: z.string().nullable().optional(),
  hasCreditCard: z.boolean().optional(),
  signature: z.string().nullable().optional(),
});

export type User = z.infer<typeof userSchema>;
export type AccountType = typeof accountTypes[number];

const loginResponseSchema = z.object({
  user: userSchema,
  token: z.string()
});

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
      const parsedData = loginResponseSchema.parse(data);
      return parsedData.user;
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
      selectedPackage?: number | string;
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