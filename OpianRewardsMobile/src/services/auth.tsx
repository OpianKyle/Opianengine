import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Base API URL - change this to your actual API URL
const API_URL = 'https://8f2d193f-889d-43fe-9c09-168a138834c6-00-3ez96wkhjud1l.janeway.replit.dev';

// Define the structure of our user type
export interface User {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  phoneNumber: string;
  points: number;
  referralCode: string;
  isAgent?: boolean;
  isAdmin?: boolean;
}

// Login credentials type
interface LoginCredentials {
  username: string;
  password: string;
}

// Registration data type
interface RegistrationData {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
}

// Auth context type
interface AuthContextType {
  user: User | null;
  authToken: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (userData: RegistrationData) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (userData: Partial<User>) => Promise<void>;
}

// Create the auth context with default values
const AuthContext = createContext<AuthContextType>({
  user: null,
  authToken: null,
  isLoading: false,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
  updateProfile: async () => {},
});

// Auth provider props
interface AuthProviderProps {
  children: ReactNode;
}

// AuthProvider component to wrap the app
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authToken, setAuthToken] = useState<string | null>(null);

  // Check if user is already logged in on app startup
  useEffect(() => {
    const loadUser = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        if (storedToken) {
          setAuthToken(storedToken);
          await fetchUserProfile(storedToken);
        }
      } catch (error) {
        console.error('Error loading auth state:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadUser();
  }, []);

  // Fetch user profile from backend
  const fetchUserProfile = async (token: string) => {
    try {
      const response = await fetch(`${API_URL}/api/user`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        return userData;
      } else {
        // If profile fetch fails, clear token
        await AsyncStorage.removeItem('authToken');
        setAuthToken(null);
        return null;
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      return null;
    }
  };

  // Login function
  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      if (response.ok) {
        const data = await response.json();
        
        // In a JWT system, the response would include a token
        // For cookie-based auth, you might need to handle cookies differently
        // This assumes your API returns a token in the response
        const token = data.token || 'session-token';
        
        await AsyncStorage.setItem('authToken', token);
        setAuthToken(token);
        
        // Fetch and set user profile
        const userProfile = await fetchUserProfile(token);
        if (userProfile) {
          setUser(userProfile);
        }
      } else {
        const errorData = await response.json();
        Alert.alert('Login Failed', errorData.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Login Error', 'Could not connect to the server. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Register function
  const register = async (userData: RegistrationData) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Similar to login, store token and fetch profile
        const token = data.token || 'session-token';
        await AsyncStorage.setItem('authToken', token);
        setAuthToken(token);
        
        // Set user data from response or fetch profile
        setUser(data);
        Alert.alert('Success', 'Registration successful!');
      } else {
        const errorData = await response.json();
        Alert.alert('Registration Failed', errorData.message || 'Could not register account');
      }
    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Registration Error', 'Could not connect to the server. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    setIsLoading(true);
    try {
      // Call logout API if needed
      await fetch(`${API_URL}/api/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });
      
      // Clear stored token and user data
      await AsyncStorage.removeItem('authToken');
      setAuthToken(null);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Update profile function
  const updateProfile = async (userData: Partial<User>) => {
    if (!authToken) {
      Alert.alert('Error', 'You need to be logged in to update your profile');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/user-profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setUser(prev => prev ? { ...prev, ...updatedUser } : updatedUser);
        Alert.alert('Success', 'Profile updated successfully');
      } else {
        const errorData = await response.json();
        Alert.alert('Update Failed', errorData.message || 'Could not update profile');
      }
    } catch (error) {
      console.error('Profile update error:', error);
      Alert.alert('Update Error', 'Could not connect to the server. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  // Context value
  const value = {
    user,
    authToken,
    isLoading,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Hook to use auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};