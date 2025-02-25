import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from "zod";
import { useState, useEffect } from 'react';

const accountTypes = ["SAVINGS", "CURRENT", "CHEQUE", "CREDIT"] as const;

const baseUserSchema = z.object({
  id: z.number().optional(),
  email: z.string().email(),
  first_name: z.string().min(1, "First name is required"),
  last_name: z.string().min(1, "Last name is required"),
  phone_number: z.string().optional(),
  is_admin: z.boolean().default(false),
  is_super_admin: z.boolean().default(false),
  is_enabled: z.boolean().default(true),
  points: z.number().default(0),
});

const userSchema = baseUserSchema.extend({
  referral_code: z.string().nullable().optional(),
  referred_by: z.string().nullable().optional(),
  created_at: z.string().optional(),
  is_south_african: z.boolean().optional(),
  id_number: z.string().nullable().optional(),
  date_of_birth: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  postal_code: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  occupation: z.string().nullable().optional(),
  bank_name: z.string().nullable().optional(),
  account_type: z.enum(accountTypes).nullable().optional(),
  account_number: z.string().nullable().optional(),
  account_holder_name: z.string().nullable().optional(),
  branch_code: z.string().nullable().optional(),
  selected_package: z.string().nullable().optional(),
  gender: z.string().nullable(),
  has_credit_card: z.boolean().optional(),
}).passthrough();

export type User = z.infer<typeof userSchema>;
export type AccountType = typeof accountTypes[number];

const TOKEN_STORAGE_KEY = 'auth_token';

export function useUser() {
  const queryClient = useQueryClient();
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem(TOKEN_STORAGE_KEY);
    } catch (error) {
      console.error('Error reading token from storage:', error);
      return null;
    }
  });

  useEffect(() => {
    try {
      if (token) {
        localStorage.setItem(TOKEN_STORAGE_KEY, token);
      } else {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
      }
    } catch (error) {
      console.error('Error managing token in storage:', error);
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
          setToken(null);
          return null;
        }

        if (!response.ok) {
          throw new Error(`Failed to fetch user: ${response.statusText}`);
        }

        const data = await response.json();
        try {
          return userSchema.parse(data);
        } catch (error) {
          console.warn('User schema validation warning:', error);
          return data;
        }
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.token) {
        setToken(data.token);
      }

      try {
        return userSchema.parse(data.user || data);
      } catch (error) {
        console.warn('User schema validation warning:', error);
        return data.user || data;
      }
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['/api/user'], user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: any) => {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      if (data.token) {
        setToken(data.token);
      }

      try {
        return userSchema.parse(data);
      } catch (error) {
        console.warn('User schema validation warning:', error);
        return data;
      }
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
    registerMutation,
  };
}