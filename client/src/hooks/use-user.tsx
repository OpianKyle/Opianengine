import { useAuth } from '@/hooks/use-auth';

export function useUser() {
  const auth = useAuth();
  
  return {
    user: auth.user,
    isLoading: auth.isLoading,
    isAuthenticated: !!auth.user, // Check if user exists to determine authentication status
    error: auth.error
  };
}