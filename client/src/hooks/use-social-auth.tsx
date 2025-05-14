import { useAuth } from "./use-auth";
import { useEffect } from "react";
import { useLocation } from "wouter";

export function useSocialAuth() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    // If auth state is loaded and user is not social or admin, redirect to login page
    if (!isLoading && user && !user.is_social && !user.is_admin && !user.is_super_admin) {
      setLocation("/auth");
    }
    
    // If auth state is loaded and user is not authenticated, redirect to login page
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [isLoading, user, setLocation]);

  return {
    user,
    isLoading,
    isSocialAuthorized: !!user && (user.is_social || user.is_admin || user.is_super_admin),
  };
}