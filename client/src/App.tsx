import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Login from "@/pages/login";
import Register from "@/pages/register";
import ResetPassword from "@/pages/reset-password";
import { useUser } from "@/hooks/use-user";
import { useSessionTimeout } from "@/hooks/use-session-timeout";
import { Loader2 } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";

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

function ProtectedRoute({ component: Component, admin = false, agent = false, ...rest }: any) {
  const { user, isLoading } = useUser();
  useSessionTimeout();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    console.log('No user found, redirecting to home');
    return <Redirect to="/" />;
  }

  // Handle routing based on user role
  if (admin && !(user.is_admin || user.is_super_admin)) {
    console.log('User lacks admin privileges, redirecting to appropriate dashboard');
    if (user.is_agent) {
      return <Redirect to="/agent" />;
    }
    return <Redirect to="/dashboard" />;
  }

  if (agent && !user.is_agent) {
    console.log('User lacks agent privileges, redirecting to appropriate dashboard');
    if (user.is_admin || user.is_super_admin) {
      return <Redirect to="/admin" />;
    }
    return <Redirect to="/dashboard" />;
  }

  // Redirect users to their appropriate dashboards
  if (!admin && !agent) {
    if (user.is_admin || user.is_super_admin) {
      return <Redirect to="/admin" />;
    }
    if (user.is_agent) {
      return <Redirect to="/agent" />;
    }
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <SidebarProvider>
      <Switch>
        {/* Public Routes */}
        <Route path="/">
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

        {/* Admin Routes */}
        <Route path="/admin">
          <AdminLayout>
            <Switch>
              <Route path="/admin">
                <ProtectedRoute component={AdminDashboard} admin />
              </Route>
              <Route path="/admin/customers">
                <ProtectedRoute component={AdminCustomers} admin />
              </Route>
              <Route path="/admin/products">
                <ProtectedRoute component={AdminProducts} admin />
              </Route>
              <Route path="/admin/rewards">
                <ProtectedRoute component={AdminRewards} admin />
              </Route>
              <Route path="/admin/cash-redemptions">
                <ProtectedRoute component={CashRedemptions} admin />
              </Route>
              <Route path="/admin/manage-users">
                <ProtectedRoute component={ManageUsers} admin />
              </Route>
              <Route path="/admin/logs">
                <ProtectedRoute component={AdminLogs} admin />
              </Route>
              <Route path="/admin/quote-requests">
                <ProtectedRoute component={AdminQuoteRequests} admin />
              </Route>
            </Switch>
          </AdminLayout>
        </Route>

        {/* Agent Routes */}
        <Route path="/agent">
          <AgentLayout>
            <Switch>
              <Route path="/agent">
                <ProtectedRoute component={AgentDashboard} agent />
              </Route>
              <Route path="/agent/customers">
                <ProtectedRoute component={AgentCustomers} agent />
              </Route>
            </Switch>
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
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen w-full bg-background">
        <Router />
        <Toaster />
      </div>
    </QueryClientProvider>
  );
}

export default App;