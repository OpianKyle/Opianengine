import { ReactNode, createContext, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { cleanupWebSockets, handlePageTransition } from "@/lib/utils";

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

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
    enabled: true,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    onError: (error) => {
      // Only show error toasts for non-401 errors
      if (!(error instanceof Error && error.message.includes("log in"))) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
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
      // Update the user data in the cache
      queryClient.setQueryData(["/api/user"], user);

      // Show success message
      toast({
        title: "Welcome back",
        description: `Logged in as ${user.firstName} ${user.lastName}`,
      });

      // Clean up and redirect based on role
      await handlePageTransition(() => {
        if (user.isAgent) {
          setLocation('/agent');
        } else if (user.isAdmin || user.isSuperAdmin) {
          setLocation('/admin');
        } else {
          setLocation('/');
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
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      // First show loading state
      toast({
        title: "Logging out",
        description: "Please wait...",
      });

      // Clean up before making the logout request
      await handlePageTransition(async () => {
        // Clear all queries from the cache
        queryClient.clear();
        // Reset the user data
        queryClient.setQueryData(["/api/user"], null);

        // Make the logout request
        const res = await fetch("/api/logout", {
          method: "POST",
          credentials: "include",
        });

        if (!res.ok) {
          const error = await res.json();
          throw new Error(error.error || "Failed to logout");
        }
      });

      // Clean up any remaining connections
      cleanupWebSockets();
    },
    onSuccess: () => {
      // Show success message
      toast({
        title: "Logged out",
        description: "Successfully logged out",
      });

      // Use a regular navigation to ensure clean state
      window.location.href = '/auth';
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
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