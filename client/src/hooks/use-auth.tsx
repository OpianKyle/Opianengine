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
  // Add client-side aliases to match server interface
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  firstName?: string;
  lastName?: string;
};

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
};

type LoginData = {
  email: string;
  password: string;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const isLoggingOut = useRef(false);

  // Silent user data fetch
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User | null>({
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
      
      const userData = await res.json();
      
      // Map server response fields to client model if needed
      if (userData) {
        if (userData.firstName === undefined && userData.first_name !== undefined) {
          userData.firstName = userData.first_name;
        }
        if (userData.lastName === undefined && userData.last_name !== undefined) {
          userData.lastName = userData.last_name;
        }
        if (userData.isAdmin === undefined && userData.is_admin !== undefined) {
          userData.isAdmin = userData.is_admin;
        }
        if (userData.isSuperAdmin === undefined && userData.is_super_admin !== undefined) {
          userData.isSuperAdmin = userData.is_super_admin;
        }
      }
      
      return userData;
    },
    retry: false,
    enabled: !isLoggingOut.current,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

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

  const loginMutation = useMutation({
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
        const error = await res.json();
        throw new Error(error.error || "Failed to login");
      }

      const data = await res.json();
      // Add any necessary field transformations here
      return data.user || data; // Handle both response formats (some endpoints return {user, token})
    },
    onSuccess: async (userData: User) => {
      console.log('Login mutation success');
      isLoggingOut.current = false;

      // Create a normalized user object with all expected fields
      const user: User = {
        ...userData,
        // Ensure snake_case fields are available
        first_name: userData.first_name || userData.firstName || '',
        last_name: userData.last_name || userData.lastName || '',
        is_admin: userData.is_admin || userData.isAdmin || false,
        is_super_admin: userData.is_super_admin || userData.isSuperAdmin || false,
        
        // Ensure camelCase fields are available
        firstName: userData.firstName || userData.first_name || '',
        lastName: userData.lastName || userData.last_name || '',
        isAdmin: userData.isAdmin || userData.is_admin || false,
        isSuperAdmin: userData.isSuperAdmin || userData.is_super_admin || false,
      };

      // Set user data in query cache
      queryClient.setQueryData(["/api/user"], user);

      // Show welcome message only if not shown in this session
      const sessionKey = `welcome_shown_${user.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        toast({
          title: "Welcome back",
          description: `Logged in as ${user.first_name || user.firstName} ${user.last_name || user.lastName}`,
        });
        sessionStorage.setItem(sessionKey, 'true');
      }

      // Navigate based on user role
      if (user.is_agent) {
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

  const logoutMutation = useMutation({
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
        const error = await res.json();
        throw new Error(error.error || "Failed to logout");
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

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
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