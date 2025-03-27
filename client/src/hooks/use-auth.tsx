import { ReactNode, createContext, useContext, useState, useCallback, useRef } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { cleanupWebSockets } from "@/lib/utils";

// Define a unified User type that supports both snake_case (server) and camelCase (client) formats
type User = {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  phone_number: string | null;
  is_agent: boolean;
  is_admin: boolean;
  is_super_admin: boolean;
  is_enabled: boolean;
  points: number;
  referral_code: string | null;
  referred_by: string | null;
  // Add client-side aliases for compatibility
  isAgent?: boolean;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  firstName?: string;
  lastName?: string;
};

// Define types for registration with referral support
type RegisterData = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  mobileNumber?: string;
  referralCode?: string;
  selectedPackage?: string;
  signature?: string;
};

type LoginData = {
  email: string;
  password: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
};

const AuthContext = createContext<AuthContextType | null>(null);

// API request helper with credentials
async function apiRequest(method: string, url: string, data?: any) {
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json"
    },
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(errorData.error || `${method} request to ${url} failed`);
  }

  return response;
}

// Normalize user data to ensure both snake_case and camelCase fields
function normalizeUser(userData: any): User {
  if (!userData) return null as unknown as User;
  
  return {
    ...userData,
    // Ensure snake_case fields are available
    first_name: userData.first_name || userData.firstName || '',
    last_name: userData.last_name || userData.lastName || '',
    is_admin: userData.is_admin || userData.isAdmin || false,
    is_super_admin: userData.is_super_admin || userData.isSuperAdmin || false,
    is_agent: userData.is_agent || userData.isAgent || false,
    
    // Ensure camelCase fields are available
    firstName: userData.firstName || userData.first_name || '',
    lastName: userData.lastName || userData.last_name || '',
    isAdmin: userData.isAdmin || userData.is_admin || false,
    isSuperAdmin: userData.isSuperAdmin || userData.is_super_admin || false,
    isAgent: userData.isAgent || userData.is_agent || false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isLoggingOut = useRef(false);

  // Silent user data fetch on initial load
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/user", {
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "Content-Type": "application/json",
          }
        });
        
        if (!res.ok) {
          if (res.status === 401) return null;
          throw new Error("Failed to fetch user data");
        }
        
        const userData = await res.json();
        return normalizeUser(userData);
      } catch (error) {
        console.error("Error fetching user data:", error);
        return null;
      }
    },
    retry: false,
    enabled: !isLoggingOut.current,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Clear all auth state during logout
  const clearAuthState = useCallback(async () => {
    isLoggingOut.current = true;

    // Disable all queries
    await queryClient.cancelQueries();
    queryClient.setDefaultOptions({
      queries: { enabled: false }
    });

    // Clear all caches
    queryClient.clear();
    queryClient.removeQueries();
    queryClient.setQueryData(["/api/user"], null);

    // Clear storage
    sessionStorage.clear();
    localStorage.clear();

    // Clean up connections
    cleanupWebSockets();
  }, [queryClient]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log('Login mutation started');
      setIsTransitioning(true);
      const res = await apiRequest("POST", "/api/login", credentials);
      const data = await res.json();
      // Return user data, handling both response formats
      return normalizeUser(data.user || data);
    },
    onSuccess: (user: User) => {
      console.log('Login mutation success');
      isLoggingOut.current = false;

      // Update query cache with user data
      queryClient.setQueryData(["/api/user"], user);

      // Show welcome toast (only once per session)
      const sessionKey = `welcome_shown_${user.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        toast({
          title: "Welcome back",
          description: `Logged in as ${user.first_name || user.firstName} ${user.last_name || user.lastName}`,
        });
        sessionStorage.setItem(sessionKey, 'true');
      }

      // Route based on user role
      if (user.is_agent || user.isAgent) {
        setLocation('/agent');
      } else if (user.is_admin || user.is_super_admin || user.isAdmin || user.isSuperAdmin) {
        setLocation('/admin');
      } else {
        setLocation('/dashboard');
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsTransitioning(false);
    }
  });

  // Registration mutation
  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      setIsTransitioning(true);
      const res = await apiRequest("POST", "/api/register", userData);
      const data = await res.json();
      return normalizeUser(data.user || data);
    },
    onSuccess: (user: User) => {
      isLoggingOut.current = false;
      
      // Update query cache with user data
      queryClient.setQueryData(["/api/user"], user);
      
      // Show welcome message
      toast({
        title: "Registration successful",
        description: `Welcome, ${user.first_name || user.firstName}! Your account has been created.`,
      });
      
      // Navigate to dashboard
      setLocation('/dashboard');
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsTransitioning(false);
    }
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      setIsTransitioning(true);
      // Clear state before API call
      await clearAuthState();
      await apiRequest("POST", "/api/logout");
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsTransitioning(false);
      // Force reload to ensure clean state
      window.location.href = '/';
    }
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}