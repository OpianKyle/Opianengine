import { ReactNode, createContext, useContext, useState, useCallback, useRef, useEffect } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient,
} from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { cleanupWebSockets } from "@/lib/utils";
import { apiRequest, getQueryFn } from "@/lib/queryClient";

// Key for storing JWT token in localStorage
const AUTH_TOKEN_KEY = "auth_token";

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

// Auth response type including token
interface AuthResponse {
  user: User;
  token: string;
}

// Define the shape of the auth context
export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  selectedPackage?: string;
  referralCode?: string;
  signature?: string;
  isSouthAfrican?: boolean;
  idNumber?: string;
  dateOfBirth?: string;
  gender?: string;
  occupation?: string;
  industry?: string;
  addressLine1?: string;
  suburb?: string;
  postalCode?: string;
  hasCreditCard?: boolean;
  bankName?: string;
  accountType?: string;
  accountNumber?: string;
  accountHolderName?: string;
  branchCode?: string;
  mandate_accepted?: boolean;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  token: string | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
}

// Create the auth context
const AuthContext = createContext<AuthContextType | null>(null);

// Helper to get stored token
function getStoredToken(): string | null {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  } catch (error) {
    console.error("Error accessing localStorage:", error);
    return null;
  }
}

// Helper to store token
function storeToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(AUTH_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(AUTH_TOKEN_KEY);
    }
  } catch (error) {
    console.error("Error accessing localStorage:", error);
  }
}

// Auth provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [token, setToken] = useState<string | null>(getStoredToken());
  const isLoggingOut = useRef(false);

  // Sync token with localStorage
  useEffect(() => {
    if (token) {
      storeToken(token);
    }
  }, [token]);

  // Query to fetch the current user
  const userQuery = useQuery<User | null>({
    queryKey: ["/api/user"],
    queryFn: async () => {
      // Use the getQueryFn utility to handle 401 responses gracefully
      try {
        const headers: Record<string, string> = {
          "Accept": "application/json",
          "Content-Type": "application/json",
        };
        
        // Add token to headers if available
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }
        
        const res = await fetch("/api/user", {
          credentials: "include",
          headers
        });
        
        if (!res.ok) {
          if (res.status === 401) return null;
          throw new Error("Failed to fetch user data");
        }
        
        return await res.json();
      } catch (error) {
        console.error("Error fetching user:", error);
        return null;
      }
    },
    retry: false,
    enabled: !isLoggingOut.current,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
  });

  // Clear auth state on logout
  const clearAuthState = useCallback(async () => {
    isLoggingOut.current = true;

    // Clear all caches
    queryClient.clear();
    queryClient.removeQueries();
    queryClient.setQueryData(["/api/user"], null);

    // Clear token
    setToken(null);
    storeToken(null);

    // Clear storage
    sessionStorage.clear();
    localStorage.removeItem(AUTH_TOKEN_KEY);

    // Clean up connections
    cleanupWebSockets();
  }, [queryClient]);

  // Login mutation
  const loginMutation = useMutation<User, Error, LoginData>({
    mutationFn: async (credentials: LoginData) => {
      console.log('Login mutation started');
      setIsTransitioning(true);
      
      try {
        const res = await apiRequest("POST", "/api/login", {
          email: credentials.email,
          password: credentials.password
        });

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to login");
        }

        const data = await res.json();
        
        // Store the token if returned
        if (data && data.token) {
          console.log('Received token in response');
          setToken(data.token);
        }
        
        // Extract the user from the response which might be {user: {...}, token: "..."}
        if (data && data.user) {
          console.log('Received nested user object in response');
          return data.user; 
        }
        
        return data;
      } catch (error) {
        console.error("Login error:", error);
        throw error instanceof Error ? error : new Error("Login failed");
      }
    },
    onSuccess: async (userData: User) => {
      console.log('Login mutation success');
      isLoggingOut.current = false;

      // Ensure boolean flags are properly set
      const normalizedUser = {
        ...userData,
        is_admin: Boolean(userData.is_admin),
        is_super_admin: Boolean(userData.is_super_admin),
        is_agent: Boolean(userData.is_agent),
        is_enabled: Boolean(userData.is_enabled)
      };

      // Set user data in query cache
      queryClient.setQueryData(["/api/user"], normalizedUser);

      // Show welcome message
      toast({
        title: "Welcome back",
        description: `Logged in as ${normalizedUser.first_name} ${normalizedUser.last_name}`,
      });

      // Redirect to the appropriate dashboard
      setTimeout(() => {
        if (normalizedUser.is_admin || normalizedUser.is_super_admin) {
          setLocation('/admin');
        } else if (normalizedUser.is_agent) {
          setLocation('/agent'); 
        } else {
          setLocation('/dashboard');
        }
      }, 0);
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
      
      try {
        const res = await apiRequest("POST", "/api/logout");
  
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to logout");
        }
      } catch (error) {
        console.error("Logout request failed:", error);
        // Continue with clearing state even if the server request fails
      } finally {
        // Clear state after making request (or if it fails)
        await clearAuthState();
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
      // Use setTimeout to avoid React state update during render
      setTimeout(() => {
        // Navigate to home without a page reload
        setLocation('/');
      }, 0);
    }
  });

  // Register mutation
  const registerMutation = useMutation<User, Error, RegisterData>({
    mutationFn: async (userData: RegisterData) => {
      setIsTransitioning(true);
      
      try {
        const res = await apiRequest("POST", "/api/register", userData);

        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Failed to register");
        }

        const data = await res.json();
        
        // Store the token if returned
        if (data && data.token) {
          console.log('Received token in registration response');
          setToken(data.token);
        }
        
        // Extract the user from the response which might be {user: {...}, token: "..."}
        if (data && data.user) {
          return data.user; 
        }
        
        return data;
      } catch (error) {
        console.error("Registration error:", error);
        throw error instanceof Error ? error : new Error("Registration failed");
      }
    },
    onSuccess: (userData: User) => {
      isLoggingOut.current = false;

      // Ensure boolean flags are properly set
      const normalizedUser = {
        ...userData,
        is_admin: Boolean(userData.is_admin),
        is_super_admin: Boolean(userData.is_super_admin),
        is_agent: Boolean(userData.is_agent),
        is_enabled: Boolean(userData.is_enabled)
      };

      // Set user data in query cache
      queryClient.setQueryData(["/api/user"], normalizedUser);

      toast({
        title: "Registration successful",
        description: "Your account has been created",
      });

      // Redirect to the appropriate dashboard based on user role
      setTimeout(() => {
        if (normalizedUser.is_admin) {
          setLocation('/admin');
        } else if (normalizedUser.is_agent) {
          setLocation('/agent');
        } else {
          setLocation('/dashboard');
        }
      }, 0);
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

  // Create the context value
  const authContextValue: AuthContextType = {
    user: userQuery.data || null,
    isLoading: userQuery.isLoading || isTransitioning,
    error: userQuery.error as Error | null,
    token,
    loginMutation,
    logoutMutation,
    registerMutation,
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