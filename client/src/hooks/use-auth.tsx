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
  const loginAttemptsRef = useRef(0);

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
      console.log('Fetching user data, checking environment...');
      
      // Check if in development mode with example.com email
      const currentUser = queryClient.getQueryData<User>(["/api/user"]);
      if (import.meta.env.DEV && 
          (sessionStorage.getItem('dev_mode_active') === 'true' || 
           (currentUser && currentUser.email && currentUser.email.includes('@example.com')))) {
        
        // If found a development user in cache, set the flag for future queries
        if (currentUser && currentUser.email && currentUser.email.includes('@example.com')) {
          console.log('Setting dev_mode_active flag based on cached user email');
          sessionStorage.setItem('dev_mode_active', 'true');
        }
        
        console.log('Using development user endpoint');
        try {
          const res = await fetch("/api/dev/users", {
            credentials: "include",
            headers: {
              "Accept": "application/json",
              "Content-Type": "application/json",
            }
          });
          
          if (!res.ok) {
            if (res.status === 401) return null;
            throw new Error("Failed to fetch development user data");
          }
          
          const userData = await res.json();
          console.log('Development user data retrieved:', userData);
          return userData;
        } catch (error) {
          console.error('Development user fetch error:', error);
          return null;
        }
      }
      
      // Normal production code
      console.log('Using production user endpoint');
      const headers: Record<string, string> = {
        "Accept": "application/json",
        "Content-Type": "application/json",
      };
      
      // Add token to headers if available
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        console.log('Added token to request headers');
      }
      
      const res = await fetch("/api/user", {
        credentials: "include",
        headers
      });
      
      if (!res.ok) {
        if (res.status === 401) {
          console.log('User not authenticated (401)');
          return null;
        }
        console.error('Failed to fetch user data:', res.status, res.statusText);
        throw new Error("Failed to fetch user data");
      }
      
      const userData = await res.json();
      console.log('Production user data retrieved:', userData);
      return userData;
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
      
      // Check if in development mode and use development endpoints
      if (import.meta.env.DEV && credentials.email?.includes('@example.com')) {
        console.log('Using development login route');
        // Extract role from email (admin@example.com, agent@example.com, etc)
        let role = 'customer';
        if (credentials.email.startsWith('admin@')) {
          role = 'admin';
        } else if (credentials.email.startsWith('agent@')) {
          role = 'agent';
        }
        
        const res = await fetch("/api/dev/login", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ role }),
          credentials: "include",
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Development login failed");
        }
        
        const data = await res.json();
        
        // Store the token if returned
        if (data && data.token) {
          console.log('Received token in development login response');
          setToken(data.token);
        }
        
        // Extract the user
        if (data && data.user) {
          console.log('Received user object in development login response');
          return data.user;
        }
        
        return data;
      } else {
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
      }
    },
    onSuccess: async (userData: User) => {
      console.log('Login mutation success');
      console.log('User data received:', userData);
      isLoggingOut.current = false;

      // Data validation - ensure we have valid user data
      if (!userData || !userData.id) {
        console.error('Invalid user data received from server:', userData);
        toast({
          title: "Login error",
          description: "Received invalid user data from server. Please try again.",
          variant: "destructive",
        });
        return;
      }

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
      
      // If we're in development mode, set the flag
      if (import.meta.env.DEV && normalizedUser.email.includes('@example.com')) {
        console.log('Setting dev_mode_active flag for future queries');
        sessionStorage.setItem('dev_mode_active', 'true');
      }
      
      // Store session info for later token validation
      try {
        if (normalizedUser.id) {
          sessionStorage.setItem('user_session_id', String(normalizedUser.id));
        }
      } catch (error) {
        console.error('Failed to store session data:', error);
      }

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
      
      // Re-enable queries that may have been disabled during logout
      queryClient.setDefaultOptions({
        queries: { enabled: true }
      });
      
      // Use a defer pattern to avoid React state update during render
      setTimeout(() => {
        try {
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
        } catch (error) {
          console.error('Navigation error after login:', error);
          // Fallback to homepage if navigation fails
          setLocation('/');
        }
      }, 100); // Small delay to allow React to handle state updates
    },
    onError: (error: Error) => {
      // Increment login attempts counter
      loginAttemptsRef.current += 1;
      
      // Customize error message based on number of attempts
      let errorTitle = "Login failed";
      let errorDescription = error.message;
      
      if (loginAttemptsRef.current >= 3) {
        errorTitle = "Multiple login failures";
        errorDescription = "You've had several unsuccessful login attempts. Please verify your credentials or reset your password.";
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
      
      // Log the failure for debugging
      console.error(`Login attempt #${loginAttemptsRef.current} failed:`, error);
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
        // Check if in development mode with development user
        const currentUser = queryClient.getQueryData<User>(["/api/user"]);
        if (import.meta.env.DEV && currentUser?.email?.includes('@example.com')) {
          console.log('Using development logout route');
          
          const res = await fetch("/api/dev/logout", {
            method: "POST",
            credentials: 'include',
            headers
          });
          
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Development logout failed");
          }
        } else {
          const res = await fetch("/api/logout", {
            method: "POST",
            credentials: 'include',
            headers
          });
    
          if (!res.ok) {
            const errorData = await res.json();
            throw new Error(errorData.error || "Failed to logout");
          }
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
      }, 100); // Small delay to allow React to handle state updates
    }
  });

  // Register mutation
  const registerMutation = useMutation<User, Error, RegisterData>({
    mutationFn: async (userData: RegisterData) => {
      setIsTransitioning(true);
      
      // Check if in development mode and email has @example.com
      if (import.meta.env.DEV && userData.email?.includes('@example.com')) {
        console.log('Using development register route');
        
        // Extract role from email (admin@example.com, agent@example.com, etc)
        let role = 'customer';
        if (userData.email.startsWith('admin@')) {
          role = 'admin';
        } else if (userData.email.startsWith('agent@')) {
          role = 'agent';
        }
        
        const res = await fetch("/api/dev/users", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ 
            role,
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email
          }),
          credentials: "include",
        });
        
        if (!res.ok) {
          const errorData = await res.json();
          throw new Error(errorData.error || "Development registration failed");
        }
        
        const data = await res.json();
        
        // Set dev mode active flag
        sessionStorage.setItem('dev_mode_active', 'true');
        
        // Store the token if returned
        if (data && data.token) {
          console.log('Received token in development registration response');
          setToken(data.token);
        }
        
        // Extract user
        if (data && data.user) {
          return data.user;
        }
        
        return data;
      } else {
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
      }
    },
    onSuccess: async (userData: User) => {
      console.log('Registration mutation success');
      console.log('User data received:', userData);
      isLoggingOut.current = false;

      // Data validation - ensure we have valid user data
      if (!userData || !userData.id) {
        console.error('Invalid user data received from server during registration:', userData);
        toast({
          title: "Registration error",
          description: "Received invalid user data from server. Please try again.",
          variant: "destructive",
        });
        return;
      }

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
      
      // If we're in development mode, set the flag
      if (import.meta.env.DEV && normalizedUser.email.includes('@example.com')) {
        console.log('Setting dev_mode_active flag for future queries');
        sessionStorage.setItem('dev_mode_active', 'true');
      }
      
      // Store session info for later token validation
      try {
        if (normalizedUser.id) {
          sessionStorage.setItem('user_session_id', String(normalizedUser.id));
        }
      } catch (error) {
        console.error('Failed to store session data:', error);
      }

      // Re-enable queries that may have been disabled during logout
      queryClient.setDefaultOptions({
        queries: { enabled: true }
      });

      toast({
        title: "Registration successful",
        description: "Your account has been created",
      });

      // Force direct navigation based on the user role
      console.log('Direct navigation check - User roles:', { 
        isAdmin: normalizedUser.is_admin, 
        isSuperAdmin: normalizedUser.is_super_admin, 
        isAgent: normalizedUser.is_agent 
      });
      
      // After a short delay to allow toast to show
      setTimeout(() => {
        try {
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
        } catch (error) {
          console.error('Navigation error after registration:', error);
          // Fallback to homepage if navigation fails
          setLocation('/');
        }
      }, 500); // Slightly longer delay for registration to show toast
    },
    onError: (error: Error) => {
      // Provide more specific error messages for common registration issues
      let errorTitle = "Registration failed";
      let errorDescription = error.message;
      
      // Handle common registration errors with more user-friendly messages
      if (error.message.includes("already exists")) {
        errorTitle = "Account already exists";
        errorDescription = "An account with this email already exists. Please try logging in instead.";
      } else if (error.message.includes("password")) {
        errorTitle = "Password issue";
        errorDescription = "Your password doesn't meet the requirements. Please use a stronger password.";
      }
      
      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
      
      // Log the error for debugging
      console.error('Registration error:', error);
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