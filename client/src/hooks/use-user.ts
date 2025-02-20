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
});

export type User = z.infer<typeof userSchema>;

const loginResponseSchema = z.object({
  user: userSchema,
  token: z.string()
});

export function useUser() {
  const queryClient = useQueryClient();
  const tokenKey = 'auth_token';
  const tokenExpiryKey = 'token_expiry';

  // Helper functions for token management
  const getStoredToken = () => localStorage.getItem(tokenKey);
  const getTokenExpiry = () => {
    const expiry = localStorage.getItem(tokenExpiryKey);
    return expiry ? new Date(expiry) : null;
  };

  const setToken = (token: string) => {
    localStorage.setItem(tokenKey, token);
    // Set token expiry to 6 days from now (1 day before actual expiry)
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 6);
    localStorage.setItem(tokenExpiryKey, expiry.toISOString());
  };

  const clearToken = () => {
    localStorage.removeItem(tokenKey);
    localStorage.removeItem(tokenExpiryKey);
  };

  // Check if token needs refresh (less than 1 day until expiry)
  const shouldRefreshToken = () => {
    const expiry = getTokenExpiry();
    if (!expiry) return false;
    const now = new Date();
    return expiry <= now;
  };

  const { data: user, isLoading, error, refetch } = useQuery({
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
          clearToken();
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

  const refreshToken = async () => {
    try {
      const response = await fetch('/api/refresh-token', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = await response.json();
      setToken(data.token);
      return data.token;
    } catch (error) {
      console.error('Error refreshing token:', error);
      clearToken();
      throw error;
    }
  };

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
      setToken(loginResponse.token);
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

      clearToken();
      queryClient.removeQueries({ queryKey: ['/api/user'] });
      queryClient.setQueryData(['/api/user'], null);
    },
  });

  // Attempt to refresh token if needed
  if (shouldRefreshToken() && user) {
    refreshToken().catch(() => {
      // If refresh fails, clear user data
      clearToken();
      queryClient.setQueryData(['/api/user'], null);
    });
  }

  return {
    user,
    isLoading,
    error,
    token: getStoredToken(),
    refreshToken,
    loginMutation,
    logoutMutation,
    registerMutation,
  };
}