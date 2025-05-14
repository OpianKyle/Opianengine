import { useAuth } from "./use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";

/**
 * A hook that provides authentication for social users
 * This hook is used in the SocialDashboard component
 * It ensures only social users, admins, or super admins can access the social dashboard
 */
export function useSocialAuth() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  const isSocialAuthorized = !!user && (user.is_social || user.is_admin || user.is_super_admin);

  useEffect(() => {
    // If fully loaded and user is not authorized for social dashboard, redirect to login
    if (!isLoading) {
      // Check for unauthorized regular users
      if (user && !isSocialAuthorized) {
        console.log('User is not authorized for social pages, redirecting to dashboard');
        setLocation("/dashboard");
      }
      
      // Check for no user (not authenticated)
      if (!user) {
        console.log('No user found, redirecting to login page');
        setLocation("/login");
      }
    }
  }, [isLoading, user, isSocialAuthorized, setLocation]);

  return {
    user,
    isLoading,
    isSocialAuthorized,
  };
}