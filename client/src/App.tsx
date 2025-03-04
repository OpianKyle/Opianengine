import { Switch, Route } from "wouter";
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
    return <Redirect to="/" />;
  }

  if (admin && !(user.is_admin || user.is_super_admin)) {
    if (user.is_agent) {
      return <Redirect to="/agent" />;
    }
    return <Redirect to="/dashboard" />;
  }

  if (agent && !user.is_agent) {
    if (user.is_admin || user.is_super_admin) {
      return <Redirect to="/admin" />;
    }
    return <Redirect to="/dashboard" />;
  }

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
    <Switch>
      {/* Public Routes */}
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/reset-password" component={ResetPassword} />

      {/* Admin Routes */}
      <Route path="/admin/:rest*">
        <AdminLayout>
          <Switch>
            <Route path="/admin" component={() => <ProtectedRoute component={AdminDashboard} admin />} />
            <Route path="/admin/customers" component={() => <ProtectedRoute component={AdminCustomers} admin />} />
            <Route path="/admin/products" component={() => <ProtectedRoute component={AdminProducts} admin />} />
            <Route path="/admin/rewards" component={() => <ProtectedRoute component={AdminRewards} admin />} />
            <Route path="/admin/cash-redemptions" component={() => <ProtectedRoute component={CashRedemptions} admin />} />
            <Route path="/admin/manage-users" component={() => <ProtectedRoute component={ManageUsers} admin />} />
            <Route path="/admin/logs" component={() => <ProtectedRoute component={AdminLogs} admin />} />
            <Route path="/admin/quote-requests" component={() => <ProtectedRoute component={AdminQuoteRequests} admin />} />
          </Switch>
        </AdminLayout>
      </Route>

      {/* Agent Routes */}
      <Route path="/agent/:rest*">
        <AgentLayout>
          <Switch>
            <Route path="/agent" exact>
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