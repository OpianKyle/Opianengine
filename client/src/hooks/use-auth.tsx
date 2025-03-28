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

// Define user interface
export interface User {
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
}

// Login credentials type
export interface LoginData {
  email: string;
  password: string;
}

// Define the shape of the auth context
interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | null>(null);

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isLoggingOut = useRef(false);

  // Query to fetch the current user
  const userQuery = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
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
      return res.json();
    },
    retry: false,
    enabled: !isLoggingOut.current,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  // Clear auth state on logout
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
  const loginMutation = useMutation<User, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      console.log('Login mutation started');
      setIsTransitioning(true);
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(credentials),
        credentials: "include",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to login");
      }

      const data = await res.json();
      
      // Extract the user from the response which might be {user: {...}, token: "..."}
      if (data && data.user) {
        console.log('Received nested user object in response');
        return data.user; 
      }
      
      return data;
    },
    onSuccess: async (userData: User) => {
      console.log('Login mutation success');
      console.log('User data received:', userData);
      isLoggingOut.current = false;

      // Ensure boolean flags are properly set
      const normalizedUser = {
        ...userData,
        is_admin: Boolean(userData.is_admin),
        is_super_admin: Boolean(userData.is_super_admin),
        is_agent: Boolean(userData.is_agent),
        is_enabled: Boolean(userData.is_enabled)
      };

      console.log('Normalized user data:', normalizedUser);

      // Set user data in query cache
      queryClient.setQueryData(["/api/user"], normalizedUser);

      // Show welcome message only if not shown in this session
      const sessionKey = `welcome_shown_${normalizedUser.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        toast({
          title: "Welcome back",
          description: `Logged in as ${normalizedUser.first_name} ${normalizedUser.last_name}`,
        });
        sessionStorage.setItem(sessionKey, 'true');
      }

      // Force direct navigation based on the user role properties received from the server
      console.log('Direct navigation check - User roles:', { 
        isAdmin: normalizedUser.is_admin, 
        isSuperAdmin: normalizedUser.is_super_admin, 
        isAgent: normalizedUser.is_agent 
      });
      
      // Immediate redirect based on normalized user role
      if (normalizedUser.is_admin || normalizedUser.is_super_admin) {
        console.log('Redirecting to admin dashboard');
        window.location.href = '/admin';
      } else if (normalizedUser.is_agent) {
        console.log('Redirecting to agent dashboard');
        window.location.href = '/agent'; 
      } else {
        console.log('Redirecting to customer dashboard');
        window.location.href = '/dashboard';
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

  // Logout mutation
  const logoutMutation = useMutation<void, Error, void>({
    mutationFn: async () => {
      setIsTransitioning(true);
      // Clear state before making request
      await clearAuthState();

      const res = await fetch("/api/logout", {
        method: "POST",
        credentials: 'include',
        headers: {
          "Accept": "application/json"
        }
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to logout");
      }
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

  // Create the context value
  const authContextValue: AuthContextType = {
    user: userQuery.data || null,
    isLoading: userQuery.isLoading,
    error: userQuery.error as Error | null,
    loginMutation,
    logoutMutation,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the auth context
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}