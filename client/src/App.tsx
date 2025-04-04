import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ResetPassword from "@/pages/reset-password";
import ReferralPage from "@/pages/referral"; // Import the referral form page
import { useAuth, AuthProvider } from "@/hooks/use-auth";
// Session timeout functionality has been removed
// import { useSessionTimeout } from "@/hooks/use-session-timeout";
import { Loader2 } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ResponsiveProvider } from "@/hooks/use-mobile";

// Admin pages
import AdminDashboard from "@/pages/admin/dashboard";
import AdminCustomers from "@/pages/admin/customers";
import AdminRewards from "@/pages/admin/rewards";
import AdminLayout from "@/components/layout/admin-layout";
import ManageUsers from "@/pages/admin/manage-users";
import AdminLogs from "@/pages/admin/logs";
import AdminProducts from "@/pages/admin/products";
import CashRedemptions from "@/pages/admin/cash-redemptions";
import AdminQuoteRequests from "@/pages/admin/quote-requests";
import AdminAgents from "@/pages/admin/agents";
import EmailLogs from "@/pages/admin/email-logs"; // Added import for EmailLogs
import Migrations from "@/pages/admin/migrations"; // Added import for Migrations

// Customer pages
import CustomerDashboard from "@/pages/customer/dashboard";
import CustomerRewards from "@/pages/customer/rewards";
import CustomerLayout from "@/components/layout/customer-layout";
import ReferralsPage from "@/pages/customer/referrals";
import ProfilePage from "@/pages/customer/profile";
import CustomerProducts from "@/pages/customer/products";

// Agent pages
import AgentDashboard from "@/pages/agent";
import AgentLayout from "@/components/layout/agent-layout";
import AgentCustomers from "@/pages/agent/customers";
import AgentLeads from "@/pages/agent/leads"; // Import agent referral leads page

function ProtectedRoute({ component: Component, admin = false, agent = false, ...rest }: any) {
  const { user, isLoading, token } = useAuth(); // Include token state
  
  // Double-check token validity - both from hook state and localStorage
  const hasLocalStorageToken = !!localStorage.getItem("auth_token");
  
  // Consider token valid only if it exists in both places
  const isTokenValid = !!token && hasLocalStorageToken;
  
  // If loading, show loading spinner
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Authentication check
  // Require BOTH a user object with role information AND a valid token
  if (!user || !user.id || !isTokenValid) {
    console.log('Authentication check failed:', { 
      hasUser: !!user, 
      hasUserId: user?.id, 
      hasToken: !!token,
      hasLocalStorageToken 
    });
    
    // Clear any potentially stale data
    localStorage.removeItem("auth_token");
    queryClient.setQueryData(["/api/user"], null);
    
    return <Redirect to="/login" />;
  }

  // Validate user role information
  const isAdmin = Boolean(user.is_admin);
  const isSuperAdmin = Boolean(user.is_super_admin);
  const isAgent = Boolean(user.is_agent);
  
  console.log('ProtectedRoute checking user role:', { 
    isAdmin, 
    isSuperAdmin, 
    isAgent,
    requestingAdminRoute: admin,
    requestingAgentRoute: agent,
    hasToken: isTokenValid,
    userId: user.id
  });

  // Handle routing based on user role for admin routes
  if (admin && !(isAdmin || isSuperAdmin)) {
    console.log('User lacks admin privileges, redirecting to appropriate dashboard');
    if (isAgent) {
      return <Redirect to="/agent" />;
    }
    return <Redirect to="/dashboard" />;
  }

  // Handle routing based on user role for agent routes
  if (agent && !isAgent) {
    console.log('User lacks agent privileges, redirecting to appropriate dashboard');
    if (isAdmin || isSuperAdmin) {
      return <Redirect to="/admin" />;
    }
    return <Redirect to="/dashboard" />;
  }

  // For non-admin, non-agent routes (customer routes)
  // We still need to respect user roles to prevent access to unintended areas
  if (!admin && !agent && user) {
    const currentPath = window.location.pathname;
    
    // Skip role-based redirection for public routes
    // IMPORTANT: For customer routes ONLY - not for home page or auth pages
    const isPublicRoute = currentPath === '/' || 
                          currentPath === '/login' || 
                          currentPath === '/register' || 
                          currentPath === '/reset-password' || 
                          currentPath.startsWith('/referral');
    
    if (!isPublicRoute) {
      if (isAdmin || isSuperAdmin) {
        if (!currentPath.startsWith('/admin')) {
          console.log('Admin user accessing customer route, redirecting to admin dashboard');
          return <Redirect to="/admin" />;
        }
      } else if (isAgent) {
        if (!currentPath.startsWith('/agent')) {
          console.log('Agent user accessing customer route, redirecting to agent dashboard');
          return <Redirect to="/agent" />;
        }
      }
    }
  }

  // If all checks pass, render the requested component
  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/" >
        <Home />
      </Route>
      <Route path="/login">
        <Login />
      </Route>
      <Route path="/register">
        <Register />
      </Route>
      <Route path="/reset-password">
        <ResetPassword />
      </Route>
      <Route path="/referral/:code">
        <ReferralPage />
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        <AdminLayout>
          <ProtectedRoute component={AdminDashboard} admin />
        </AdminLayout>
      </Route>
      <Route path="/admin/customers">
        <AdminLayout>
          <ProtectedRoute component={AdminCustomers} admin />
        </AdminLayout>
      </Route>
      <Route path="/admin/agents">
        <AdminLayout>
          <ProtectedRoute component={AdminAgents} admin />
        </AdminLayout>
      </Route>
      <Route path="/admin/email-logs">
        <AdminLayout>
          <ProtectedRoute component={EmailLogs} admin />
        </AdminLayout>
      </Route>
      <Route path="/admin/products">
        <AdminLayout>
          <ProtectedRoute component={AdminProducts} admin />
        </AdminLayout>
      </Route>
      <Route path="/admin/rewards">
        <AdminLayout>
          <ProtectedRoute component={AdminRewards} admin />
        </AdminLayout>
      </Route>
      <Route path="/admin/cash-redemptions">
        <AdminLayout>
          <ProtectedRoute component={CashRedemptions} admin />
        </AdminLayout>
      </Route>
      <Route path="/admin/manage-users">
        <AdminLayout>
          <ProtectedRoute component={ManageUsers} admin />
        </AdminLayout>
      </Route>
      <Route path="/admin/logs">
        <AdminLayout>
          <ProtectedRoute component={AdminLogs} admin />
        </AdminLayout>
      </Route>
      <Route path="/admin/quote-requests">
        <AdminLayout>
          <ProtectedRoute component={AdminQuoteRequests} admin />
        </AdminLayout>
      </Route>
      <Route path="/admin/migrations">
        <AdminLayout>
          <ProtectedRoute component={Migrations} admin />
        </AdminLayout>
      </Route>

      {/* Agent Routes */}
      <Route path="/agent">
        <AgentLayout>
          <ProtectedRoute component={AgentDashboard} agent />
        </AgentLayout>
      </Route>
      <Route path="/agent/customers">
        <AgentLayout>
          <ProtectedRoute component={AgentCustomers} agent />
        </AgentLayout>
      </Route>
      <Route path="/agent/leads">
        <AgentLayout>
          <ProtectedRoute component={AgentLeads} agent />
        </AgentLayout>
      </Route>

      {/* Customer Routes */}
      <Route path="/dashboard">
        <CustomerLayout>
          <ProtectedRoute component={CustomerDashboard} />
        </CustomerLayout>
      </Route>
      <Route path="/rewards">
        <CustomerLayout>
          <ProtectedRoute component={CustomerRewards} />
        </CustomerLayout>
      </Route>
      <Route path="/referrals">
        <CustomerLayout>
          <ProtectedRoute component={ReferralsPage} />
        </CustomerLayout>
      </Route>
      <Route path="/profile">
        <CustomerLayout>
          <ProtectedRoute component={ProfilePage} />
        </CustomerLayout>
      </Route>
      <Route path="/products">
        <CustomerLayout>
          <ProtectedRoute component={CustomerProducts} />
        </CustomerLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ResponsiveProvider>
          <div className="min-h-screen w-full bg-background">
            <Router />
            <Toaster />
          </div>
        </ResponsiveProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;