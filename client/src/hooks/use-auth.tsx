import { ReactNode, createContext, useContext, useState } from "react";
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

  const {
    data: user,
    error,
    isLoading,
  } = useQuery<User>({
    queryKey: ["/api/user"],
    retry: false,
    enabled: true,
    staleTime: 5 * 60 * 1000,
    onError: (error) => {
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
      queryClient.setQueryData(["/api/user"], user);
      toast({
        title: "Welcome back",
        description: `Logged in as ${user.firstName} ${user.lastName}`,
      });

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
    onSettled: () => {
      setIsTransitioning(false);
    }
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      setIsTransitioning(true);
      toast({
        title: "Logging out",
        description: "Please wait...",
      });

      // Make the logout request first
      const res = await fetch("/api/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to logout");
      }

      // Then clean up after successful logout
      await handlePageTransition(async () => {
        cleanupWebSockets();
        queryClient.clear();
        queryClient.setQueryData(["/api/user"], null);
      });
    },
    onSuccess: () => {
      toast({
        title: "Logged out",
        description: "Successfully logged out",
      });
      window.location.href = '/auth';
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