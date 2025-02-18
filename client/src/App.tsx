import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
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

// Customer pages
import CustomerDashboard from "@/pages/customer/dashboard";
import CustomerRewards from "@/pages/customer/rewards";
import CustomerLayout from "@/components/layout/customer-layout";
import ReferralsPage from "@/pages/customer/referrals";
import ProfilePage from "@/pages/customer/profile";
import TestDashboard from "@/pages/test-dashboard";

function ProtectedRoute({ component: Component, admin = false, ...rest }: any) {
  const { user, isLoading } = useUser();
  useSessionTimeout(); // Add session timeout monitoring to protected routes

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

  if (admin && !user.isAdmin) {
    return <Redirect to="/dashboard" />;
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
        <Route path="/reset-password">
          <ResetPassword />
        </Route>
        <Route path="/test-dashboard">
          <TestDashboard />
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

        <Route component={NotFound} />
      </Switch>
    </SidebarProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;