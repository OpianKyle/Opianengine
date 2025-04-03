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
      // Skip automatic login in development mode to allow the home page to be shown first
      if (window.location.hostname.includes('.replit.dev') || 
          window.location.hostname.includes('.repl.co') ||
          window.location.hostname === 'localhost') {
        
        // Check for a URL parameter that enables auto-login for testing
        const urlParams = new URLSearchParams(window.location.search);
        const autoLogin = urlParams.get('auto_login');
        
        if (autoLogin === 'admin') {
          console.log('DEV MODE: Using mock admin user for testing in client');
          
          // Return a mock admin user for development/testing when requested via URL param
          return {
            id: 17,
            email: 'kylem@opianfsgroup.com',
            first_name: 'Kyle',
            last_name: 'Developer',
            phone_number: '1234567890',
            is_agent: false,
            is_admin: true,
            is_super_admin: true,
            is_enabled: true,
            points: 10000,
            referral_code: 'DEV12345',
            referred_by: null
          };
        }
        
        // By default, don't auto-login in development environment to simulate a real startup
        console.log('DEV MODE: No auto-login, showing home page');
        return null;
      }
      
      // Normal production code
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
      
      // In development environment on Replit, use a mock login response
      if (window.location.hostname.includes('.replit.dev') || 
          window.location.hostname.includes('.repl.co') ||
          window.location.hostname === 'localhost') {
        console.log('DEV MODE: Using mock login in client');
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Mock response with an admin user
        const mockUser: User = {
          id: 17,
          email: 'kylem@opianfsgroup.com',
          first_name: 'Kyle',
          last_name: 'Developer',
          phone_number: '1234567890',
          is_agent: false,
          is_admin: true,
          is_super_admin: true,
          is_enabled: true,
          points: 10000,
          referral_code: 'DEV12345',
          referred_by: null
        };
        
        // Set mock token
        const mockToken = "dev-mock-token-12345";
        setToken(mockToken);
        
        return mockUser;
      }
      
      // Normal production code for real login
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

      // Get the current URL path to determine if we need to redirect
      const currentPath = window.location.pathname;
      
      // Force direct navigation based on the user role properties received from the server
      console.log('Direct navigation check - User roles:', { 
        isAdmin: normalizedUser.is_admin, 
        isSuperAdmin: normalizedUser.is_super_admin, 
        isAgent: normalizedUser.is_agent,
        currentPath
      });
      
      // Use a defer pattern to avoid React state update during render
      setTimeout(() => {
        // If already at the home page, don't redirect
        if (currentPath === '/') {
          console.log('Already at home page, not redirecting');
          return;
        }
        
        // If at the login page, redirect to appropriate dashboard based on role
        if (currentPath === '/login' || currentPath === '/auth') {
          // Use React router for a smooth transition (no page reload)
          if (normalizedUser.is_admin || normalizedUser.is_super_admin) {
            console.log('Redirecting to admin dashboard');
            setLocation('/admin');
          } else if (normalizedUser.is_agent) {
            console.log('Redirecting to agent dashboard');
            setLocation('/agent'); 
          } else {
            console.log('Redirecting to customer dashboard');
            setLocation('/dashboard');
          }
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
      
      // Include token in the logout request
      const headers: Record<string, string> = {
        "Accept": "application/json"
      };
      
      // Add token to headers if available
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      try {
        const res = await fetch("/api/logout", {
          method: "POST",
          credentials: 'include',
          headers
        });
  
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
      
      // In development environment on Replit, use a mock registration response
      if (window.location.hostname.includes('.replit.dev') || 
          window.location.hostname.includes('.repl.co') ||
          window.location.hostname === 'localhost') {
        console.log('DEV MODE: Using mock registration in client');
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Mock response with newly registered user
        const mockUser: User = {
          id: 999,
          email: userData.email,
          first_name: userData.firstName,
          last_name: userData.lastName,
          phone_number: userData.mobileNumber,
          is_agent: false,
          is_admin: false,
          is_super_admin: false,
          is_enabled: true,
          points: 2500, // Default points for new user
          referral_code: 'NEW12345',
          referred_by: userData.referralCode || null
        };
        
        // Set mock token
        const mockToken = "dev-mock-token-register-12345";
        setToken(mockToken);
        
        return mockUser;
      }
      
      // Normal production code for real registration
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Accept": "application/json"
        },
        body: JSON.stringify(userData),
        credentials: "include",
      });

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

      // Redirect to the appropriate dashboard
      setTimeout(() => {
        setLocation('/');
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
    isLoading: userQuery.isLoading,
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