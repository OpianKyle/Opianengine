import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from "zod";
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
//import { cleanupWebSockets } from "@/lib/utils";

const accountTypes = ["SAVINGS", "CURRENT", "CHEQUE", "CREDIT"] as const;

// Simplify boolean transformation logic without excessive logging
const booleanSchema = z.union([z.boolean(), z.number()]).transform(val => !!val);

// Define schema with required fields and transformations
const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  first_name: z.string().default(""),
  last_name: z.string().default(""),
  phone_number: z.string().nullable().default(null),
  is_admin: booleanSchema.default(false),
  is_agent: booleanSchema.default(false),
  is_super_admin: booleanSchema.default(false),
  is_enabled: booleanSchema.default(true),
  points: z.number().default(0),
  referral_code: z.string().nullable().default(null),
  referred_by: z.string().nullable().default(null),
  created_at: z.string().nullable().default(null),
  is_south_african: booleanSchema.nullable().default(null),
  id_number: z.string().nullable().default(null),
  date_of_birth: z.string().nullable().default(null),
  address: z.string().nullable().default(null),
  city: z.string().nullable().default(null),
  postal_code: z.string().nullable().default(null),
  industry: z.string().nullable().default(null),
  occupation: z.string().nullable().default(null),
  bank_name: z.string().nullable().default(null),
  account_type: z.enum(accountTypes).nullable().default(null),
  account_number: z.string().nullable().default(null),
  account_holder_name: z.string().nullable().default(null),
  branch_code: z.string().nullable().default(null),
  selected_package: z.string().nullable().default(null),
  gender: z.string().nullable().default(null),
  has_credit_card: booleanSchema.nullable().default(null),
  signature: z.string().nullable().default(null)
}).transform(data => ({
  ...data,
  // Transform booleans without logging
  is_admin: !!data.is_admin,
  is_agent: !!data.is_agent,
  is_super_admin: !!data.is_super_admin,
  is_enabled: !!data.is_enabled,
  is_south_african: data.is_south_african === null ? null : !!data.is_south_african,
  has_credit_card: data.has_credit_card === null ? null : !!data.has_credit_card
}));

export type User = z.infer<typeof userSchema>;
export type AccountType = typeof accountTypes[number];

const TOKEN_STORAGE_KEY = 'auth_token';


export function useUser() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
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

        if (!response.ok) {
          if (response.status === 401) {
            setToken(null);
            return null;
          }
          throw new Error('Failed to fetch user data');
        }

        const data = await response.json();
        return userSchema.parse(data);
      } catch (error) {
        console.error('Error fetching user:', error);
        // Only throw non-auth errors
        if (error instanceof Error && !error.message.includes('401')) {
          throw error;
        }
        return null;
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on 401s
      if (error instanceof Error && error.message.includes('401')) {
        return false;
      }
      return failureCount < 3;
    },
    staleTime: 5 * 60 * 1000,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(errorData.error || 'Login failed');
      }

      const data = await response.json();

      if (data.token) {
        setToken(data.token);
      }

      return userSchema.parse(data);
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['/api/user'], user);
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
    },
    onError: (error: Error) => {
      console.error('Login error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to login",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        // Always cleanup state first
        queryClient.clear();
        queryClient.setQueryData(['/api/user'], null);
        setToken(null);

        // Make the logout request - don't wait for it
        await fetch('/api/logout', {
          method: 'POST',
          credentials: 'include',
        });
      } catch (error) {
        console.error('Logout error:', error);
      }

      // Force a page reload to clear all state
      window.location.href = '/auth';
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Warning",
        description: "Some cleanup operations failed, but you have been logged out.",
      });
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
        // Pre-transform boolean fields before validation
        const transformedData = {
          ...data,
          is_admin: !!data.is_admin,
          is_super_admin: !!data.is_super_admin,
          is_enabled: !!data.is_enabled,
          is_south_african: data.is_south_african === null ? null : !!data.is_south_african,
          has_credit_card: data.has_credit_card === null ? null : !!data.has_credit_card
        };
        return userSchema.parse(transformedData);
      } catch (error) {
        console.error('Registration response validation error:', error);
        throw new Error('Invalid user data received');
      }
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['/api/user'], user);
      toast({
        title: "Success",
        description: "Registration successful",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Registration failed",
      });
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