import { useAuth } from './use-auth';

export function useUser() {
  const auth = useAuth();
  
  return {
    user: auth.user,
    isLoading: auth.isLoading,
    isAuthenticated: !!auth.user, // Check if user exists to determine authentication status
    error: auth.error,
    token: auth.token,
    loginMutation: auth.loginMutation,
    logoutMutation: auth.logoutMutation,
    registerMutation: auth.registerMutation,
    refreshUser: auth.refreshUser
  };
}