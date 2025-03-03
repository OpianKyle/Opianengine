import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from "zod";
import { useState, useEffect } from 'react';
import { useToast } from "@/hooks/use-toast";

const accountTypes = ["SAVINGS", "CURRENT", "CHEQUE", "CREDIT"] as const;

// Simplify boolean transformation logic
const booleanSchema = z.union([z.boolean(), z.number()]).transform(val => {
  console.log('Transforming boolean value:', { original: val, transformed: !!val });
  return !!val;
});

// Define schema with required fields and transformations
const userSchema = z.object({
  id: z.number(),
  email: z.string().email(),
  first_name: z.string().default(""),
  last_name: z.string().default(""),
  phone_number: z.string().nullable().default(null),
  is_admin: booleanSchema.default(false),
  is_agent: booleanSchema.default(false), // Add agent flag
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
}).transform(data => {
  const transformed = {
    ...data,
    // Simplify boolean transformations to use !! operator
    is_admin: !!data.is_admin,
    is_agent: !!data.is_agent,
    is_super_admin: !!data.is_super_admin,
    is_enabled: !!data.is_enabled,
    is_south_african: data.is_south_african === null ? null : !!data.is_south_african,
    has_credit_card: data.has_credit_card === null ? null : !!data.has_credit_card
  };
  console.log('User data transformation:', { 
    original: {
      is_admin: data.is_admin,
      is_super_admin: data.is_super_admin,
      is_enabled: data.is_enabled,
      type_is_admin: typeof data.is_admin,
      type_is_super_admin: typeof data.is_super_admin
    }, 
    transformed: {
      is_admin: transformed.is_admin,
      is_super_admin: transformed.is_super_admin,
      is_enabled: transformed.is_enabled,
      type_is_admin: typeof transformed.is_admin,
      type_is_super_admin: typeof transformed.is_super_admin
    }
  });
  return transformed;
});

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

        if (response.status === 401) {
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

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }

      if (data.token) {
        setToken(data.token);
      }

      // Transform the response data
      const userData = data.user || data;
      try {
        return userSchema.parse(userData);
      } catch (error) {
        console.error('Login response validation error:', error);
        throw new Error('Invalid user data received');
      }
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
        console.log('Raw registration response:', data);
        const transformedData = {
          ...data,
          is_admin: !!data.is_admin,
          is_super_admin: !!data.is_super_admin,
          is_enabled: !!data.is_enabled,
          is_south_african: data.is_south_african === null ? null : !!data.is_south_african,
          has_credit_card: data.has_credit_card === null ? null : !!data.has_credit_card
        };
        console.log('Transformed registration data:', transformedData);
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
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Logged out successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to logout",
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