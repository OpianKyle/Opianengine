import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
  admin = false,
  agent = false,
  ...rest
}: {
  path: string;
  component: React.ComponentType<any>;
  admin?: boolean;
  agent?: boolean;
  [key: string]: any;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-border" />
        </div>
      </Route>
    );
  }

  if (!user) {
    console.log('No user found, redirecting to auth page');
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  console.log('ProtectedRoute checking user role:', { 
    isAdmin: Boolean(user.is_admin), 
    isSuperAdmin: Boolean(user.is_super_admin), 
    isAgent: Boolean(user.is_agent),
    requestingAdminRoute: admin,
    requestingAgentRoute: agent
  });

  // Handle routing based on user role
  if (admin && !(user.is_admin || user.is_super_admin)) {
    console.log('User lacks admin privileges, redirecting to appropriate dashboard');
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

  if (agent && !user.is_agent) {
    console.log('User lacks agent privileges, redirecting to appropriate dashboard');
    if (user.is_admin || user.is_super_admin) {
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

  return (
    <Route path={path}>
      <Component {...rest} />
    </Route>
  );
}