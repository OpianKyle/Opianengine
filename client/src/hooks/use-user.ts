import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from "zod";
import { useState, useEffect } from 'react';

const accountTypes = ["SAVINGS", "CURRENT", "CHEQUE", "CREDIT"] as const;

const baseUserSchema = z.object({
  id: z.number().optional(),
  email: z.string().email(),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().optional(),
  isAdmin: z.boolean().default(false),
  isSuperAdmin: z.boolean().default(false),
  isEnabled: z.boolean().default(true),
  points: z.number().default(0),
});

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
  bankName: z.string().nullable().optional(),
  accountType: z.enum(accountTypes).nullable().optional(),
  accountNumber: z.string().nullable().optional(),
  accountHolderName: z.string().nullable().optional(),
  branchCode: z.string().nullable().optional(),
  selectedPackage: z.string().nullable().optional(),
}).passthrough();

export type User = z.infer<typeof userSchema>;
export type AccountType = typeof accountTypes[number];

const TOKEN_STORAGE_KEY = 'auth_token';

export function useUser() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => {
    try {
      const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);
      console.log('Initial token load:', savedToken ? `${savedToken.slice(0, 10)}...` : 'missing');
      return savedToken;
    } catch (error) {
      console.error('Error reading token from storage:', error);
      return null;
    }
  });

  useEffect(() => {
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
        console.log('Token saved to storage:', `${token.slice(0, 10)}...`);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        console.log('Token removed from storage');
      }
    } catch (error) {
      console.error('Error managing token in storage:', error);
    }
  }, [token]);

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['/api/user'],
    queryFn: async () => {
      try {
        console.log('Fetching user data with token:', token ? 'present' : 'missing');
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

      // Set token if available but don't require it
      if (data.token) {
        setToken(data.token);
      }

      return userSchema.parse(data.user || data);
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['/api/user'], user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: Omit<User, 'id'>) => {
      console.log('Starting registration with data:', { ...userData, password: '[REDACTED]' });
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
        const errorData = await response.json().catch(() => ({ error: 'Registration failed' }));
        throw new Error(errorData.error || 'Registration failed');
      }

      const data = await response.json();
      console.log('Registration response:', {
        hasToken: !!data.token,
        hasUser: !!data.user
      });

      // Set token if available but don't require it
      if (data.token) {
        setToken(data.token);
      }

      // Parse and return the user data regardless of token
      return userSchema.parse(data.user || data);
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['/api/user'], user);
    },
    onError: (error: Error) => {
      console.error('Registration error:', error);
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
    registerMutation: {
      ...registerMutation,
      isPending: registerMutation.isPending || false,
    },
  };
}