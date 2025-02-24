import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from "zod";
import { useState, useEffect } from 'react';

const accountTypes = ["SAVINGS", "CURRENT", "CHEQUE", "CREDIT"] as const;

// Base user schema with minimal required fields
const baseUserSchema = z.object({
  id: z.number().optional(),  // Make ID optional for new users
  email: z.string().email(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().optional(),
  isAdmin: z.boolean().default(false),
  isSuperAdmin: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
  points: z.number().default(0),
});

// Extended schema with all optional fields
const userSchema = baseUserSchema.extend({
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
}).passthrough();

export type User = z.infer<typeof userSchema>;
export type AccountType = typeof accountTypes[number];

export function useUser() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => {
    // Try to get token from localStorage on init
    const savedToken = localStorage.getItem('auth_token');
    console.log('Initial token from storage:', savedToken ? 'present' : 'missing');
    return savedToken;
  });

  // Persist token to localStorage when it changes
  useEffect(() => {
    if (token) {
      console.log('Saving token to storage');
      localStorage.setItem('auth_token', token);
    } else {
      console.log('Removing token from storage');
      localStorage.removeItem('auth_token');
    }
  }, [token]);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
        });

        if (response.status === 401) {
          console.log('User not authenticated, clearing token');
          setToken(null);
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
      console.log('Login response:', {
        hasToken: !!data.token,
        hasUser: !!data.user
      });

      if (data.token) {
        console.log('Setting new token from login');
        setToken(data.token);
      }

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
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
      });

      if (!response.ok) {
        throw new Error('Logout failed');
      }

      console.log('Clearing token on logout');
      setToken(null);
      queryClient.removeQueries({ queryKey: ['/api/user'] });
      queryClient.setQueryData(['/api/user'], null);
    },
  });

  return {
    user,
    token,
    isLoading,
    error,
    loginMutation,
    logoutMutation,
  };
}