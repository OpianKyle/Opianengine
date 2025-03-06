import { ReactNode, createContext, useContext, useState, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { cleanupWebSockets, handlePageTransition } from "@/lib/utils";
import { LoadingSpinner } from "@/components/loading";

type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  isAgent: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
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
  const [location, setLocation] = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Silent user data fetch
  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    onError: () => {
      queryClient.setQueryData(["/api/user"], null);
      window.location.href = '/'; // Redirect to home on auth error
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log('Login mutation started');
      setIsTransitioning(true);
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to login");
      }
      return res.json();
    },
    onSuccess: async (user) => {
      console.log('Login mutation success', { userId: user.id });

      // Set user data in query cache
      queryClient.setQueryData(["/api/user"], user);

      // Show welcome message only if not shown in this session
      const sessionKey = `welcome_shown_${user.id}`;
      if (!sessionStorage.getItem(sessionKey)) {
        console.log('Showing welcome message');
        toast({
          title: "Welcome back",
          description: `Logged in as ${user.firstName} ${user.lastName}`,
        });
        sessionStorage.setItem(sessionKey, 'true');
      }

      await handlePageTransition(() => {
        if (user.isAgent) {
          setLocation('/agent');
        } else if (user.isAdmin || user.isSuperAdmin) {
          setLocation('/admin');
        } else {
          setLocation('/dashboard');
        }
      });
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
      const res = await fetch("/api/logout", {
        method: "POST",
        credentials: 'include',
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to logout");
      }

      await handlePageTransition(async () => {
        // Clear all React Query cache and remove queries
        queryClient.clear();
        queryClient.removeQueries();

        // Ensure user data is cleared
        queryClient.setQueryData(["/api/user"], null);

        // Clean up WebSocket connections
        cleanupWebSockets();

        // Clear session storage
        sessionStorage.clear();

        // Disable React Query's auto refetching temporarily
        await queryClient.cancelQueries();
        queryClient.setDefaultOptions({
          queries: {
            enabled: false,
          },
        });
      });

      // Force a clean reload to reset all state
      window.location.href = '/';
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
      }}
    >
      {isTransitioning && <LoadingSpinner />}
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