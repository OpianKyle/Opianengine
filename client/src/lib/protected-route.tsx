import { ReactNode } from "react";
import { Route, Redirect } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

type ProtectedRouteProps = {
  path: string;
  component: React.ComponentType<any>;
  admin?: boolean;
  agent?: boolean;
  children?: ReactNode;
};

export function ProtectedRoute({ 
  path, 
  component: Component, 
  admin = false, 
  agent = false,
  ...rest
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Route>
    );
  }

  // Redirect to auth page if not authenticated
  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Role-based access control
  if (admin && !(user.is_admin || user.is_super_admin || user.isAdmin || user.isSuperAdmin)) {
    // Redirect admin routes based on user role
    if (user.is_agent) {
      return (
        <Route path={path}>
          <Redirect to="/agent" />
        </Route>
      );
    }
    return (
      <Route path={path}>
        <Redirect to="/dashboard" />
      </Route>
    );
  }

  if (agent && !(user.is_agent || user.isAgent)) {
    // Redirect agent routes based on user role
    if (user.is_admin || user.is_super_admin || user.isAdmin || user.isSuperAdmin) {
      return (
        <Route path={path}>
          <Redirect to="/admin" />
        </Route>
      );
    }
    return (
      <Route path={path}>
        <Redirect to="/dashboard" />
      </Route>
    );
  }

  // Render the protected component
  return (
    <Route path={path}>
      <Component {...rest} />
    </Route>
  );
}