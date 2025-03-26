import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from "zod";
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";
import { cleanupWebSockets } from "@/lib/utils";

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

// Helper function to safely parse JSON responses
async function parseResponse(response: Response) {
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }
  return null;
}

// Helper function for making API requests with retries
async function fetchWithRetry(url: string, options: RequestInit, retries = 3, delay = 1000) {
  const defaultOptions: RequestInit = {
    credentials: 'include',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
    ...options,
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    }
  };

  for (let i = 0; i < retries; i++) {
    try {
      console.log('Making request to:', url, {
        method: options.method,
        hasCredentials: defaultOptions.credentials === 'include',
        hasToken: !!(defaultOptions.headers as any)?.Authorization
      });

      const response = await fetch(url, defaultOptions);

      // For logout, we don't care about the response content
      if (url.includes('/api/logout')) {
        return true;
      }

      // Handle 401 specifically
      if (response.status === 401) {
        console.log('Unauthorized response received');
        return null;
      }

      if (!response.ok) {
        const data = await parseResponse(response);
        throw new Error(data?.error || `HTTP error! status: ${response.status}`);
      }

      const data = await parseResponse(response);
      if (!data && !url.includes('/api/logout')) {
        throw new Error('Invalid response format');
      }

      return data;
    } catch (error) {
      console.error('Request failed:', error);
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
}

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
        const data = await fetchWithRetry('/api/user', {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
        });

        if (data === null) {
          setToken(null);
          return null;
        }

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
      const data = await fetchWithRetry('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials),
      });

      if (!data) {
        throw new Error('Login failed');
      }

      if (data.token) {
        setToken(data.token);
      }

      return userSchema.parse(data.user || data);
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['/api/user'], user);
      toast({
        title: "Success",
        description: "Logged in successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to login",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // First show loading state
      toast({
        title: "Logging out",
        description: "Please wait...",
      });

      try {
        // Always cleanup before making the request
        cleanupWebSockets();
        queryClient.clear();
        queryClient.setQueryData(['/api/user'], null);
        setToken(null);

        // Make the logout request - don't wait for it
        await fetchWithRetry('/api/logout', {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
          },
        });
      } catch (error) {
        console.error('Logout request failed:', error);
        // Continue with client-side cleanup even if server request fails
      }

      // Force a page reload to clear all state
      window.location.href = '/';
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    },
    onError: (error: Error) => {
      // Only show error if it's not related to session expiry
      if (!error.message.includes('401') && !error.message.includes('Invalid response format')) {
        toast({
          variant: "destructive",
          title: "Warning",
          description: "Some cleanup operations failed, but you have been logged out.",
        });
      }
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