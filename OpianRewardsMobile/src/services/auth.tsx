import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import axios from 'axios';
import { Alert } from 'react-native';
import { useQueryClient, useMutation, useQuery } from '@tanstack/react-query';

// Define the API URL - we'll need to update this to your actual backend URL
const API_URL = 'https://yourdomain.com/api';

// Define user types
export type User = {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  points: number;
  referralCode: string;
};

// Login credentials type
type LoginCredentials = {
  username: string;
  password: string;
};

// Registration data type
type RegisterData = {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  email: string;
};

// Auth context type
type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
};

// Create the context
const AuthContext = createContext<AuthContextType | null>(null);

// Provider component
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const queryClient = useQueryClient();

  // Check if user is logged in on app start
  useEffect(() => {
    // Fetch current user info
    const fetchUser = async () => {
      try {
        setIsLoading(true);
        const response = await axios.get(`${API_URL}/user`, { withCredentials: true });
        if (response.data) {
          setUser(response.data);
        }
      } catch (error) {
        console.log('Not authenticated');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUser();
  }, []);

  // Login function
  const login = async (credentials: LoginCredentials) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_URL}/login`, credentials, {
        withCredentials: true,
      });
      setUser(response.data);
      setError(null);
    } catch (error) {
      setError(error as Error);
      Alert.alert('Login Failed', 'Invalid username or password');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setIsLoading(true);
      await axios.post(`${API_URL}/logout`, {}, { withCredentials: true });
      setUser(null);
      // Clear any cached data
      queryClient.clear();
    } catch (error) {
      setError(error as Error);
      Alert.alert('Logout Failed', 'An error occurred while logging out');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (data: RegisterData) => {
    try {
      setIsLoading(true);
      const response = await axios.post(`${API_URL}/register`, data, {
        withCredentials: true,
      });
      setUser(response.data);
      setError(null);
    } catch (error) {
      setError(error as Error);
      Alert.alert('Registration Failed', 'An error occurred during registration');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        error,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// Hook to use the auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}