import { useEffect } from 'react';
import { Route, useLocation, Redirect } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { Loader2 } from 'lucide-react';

type ProtectedRouteProps = {
  component: React.ComponentType<any>;
  path: string;
  admin?: boolean;
  agent?: boolean;
};

/**
 * Protected route component that checks if the user is authenticated
 * and has the right permissions before rendering the component.
 */
export function ProtectedRoute({
  component: Component,
  path,
  admin = false,
  agent = false,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  // Redirect to home if not logged in
  useEffect(() => {
    if (!isLoading && !user) {
      setLocation('/');
    }
  }, [user, isLoading, setLocation]);

  return (
    <Route path={path}>
      {(params) => {
        // Show loading spinner while checking auth
        if (isLoading) {
          return (
            <div className="flex items-center justify-center min-h-screen">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          );
        }

        // Redirect if not authenticated
        if (!user) {
          return <Redirect to="/" />;
        }

        // Check admin permission
        if (admin && !user.is_admin) {
          return <Redirect to="/" />;
        }

        // Check agent permission
        if (agent && !user.is_agent && !user.is_admin) {
          return <Redirect to="/" />;
        }

        // Render the protected component
        return <Component params={params} />;
      }}
    </Route>
  );
}