import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { useEffect } from "react";

export function ProtectedSocialRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();
  
  // Check if the user is a social user or admin
  const isSocialAuthorized = !!user && (user.is_social || user.is_admin || user.is_super_admin);
  
  // Log authentication status for debugging
  useEffect(() => {
    if (!isLoading) {
      console.log('ProtectedSocialRoute user auth state:', { 
        isLoading, 
        user: !!user, 
        isSocial: user?.is_social,
        isAdmin: user?.is_admin,
        isSuperAdmin: user?.is_super_admin,
        isSocialAuthorized
      });
    }
  }, [isLoading, user, isSocialAuthorized]);

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  if (!isSocialAuthorized) {
    console.log('User not authorized for social dashboard, redirecting to login');
    return (
      <Route path={path}>
        <Redirect to="/login" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}