import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import { AuthProvider } from "@/hooks/use-auth";
import { useSessionTimeout } from "@/hooks/use-session-timeout";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ProtectedRoute } from "@/lib/protected-route";
import AuthPage from "@/pages/auth-page";

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
import AgentCustomers from "@/pages/agent/customers"; 
import EmailLogs from "@/pages/admin/email-logs";

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

// Legacy pages - to be migrated
import Register from "@/pages/register";
import ResetPassword from "@/pages/reset-password";

function Router() {
  useSessionTimeout();
  
  return (
    <SidebarProvider>
      <Switch>
        {/* Public Routes */}
        <Route path="/" >
          <Home />
        </Route>
        <Route path="/auth">
          <AuthPage />
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
            <ProtectedRoute path="/admin" component={AdminDashboard} admin={true} />
          </AdminLayout>
        </Route>
        <Route path="/admin/customers">
          <AdminLayout>
            <ProtectedRoute path="/admin/customers" component={AdminCustomers} admin={true} />
          </AdminLayout>
        </Route>
        <Route path="/admin/agents">
          <AdminLayout>
            <ProtectedRoute path="/admin/agents" component={AdminAgents} admin={true} />
          </AdminLayout>
        </Route>
        <Route path="/admin/email-logs">
          <AdminLayout>
            <ProtectedRoute path="/admin/email-logs" component={EmailLogs} admin={true} />
          </AdminLayout>
        </Route>
        <Route path="/admin/products">
          <AdminLayout>
            <ProtectedRoute path="/admin/products" component={AdminProducts} admin={true} />
          </AdminLayout>
        </Route>
        <Route path="/admin/rewards">
          <AdminLayout>
            <ProtectedRoute path="/admin/rewards" component={AdminRewards} admin={true} />
          </AdminLayout>
        </Route>
        <Route path="/admin/cash-redemptions">
          <AdminLayout>
            <ProtectedRoute path="/admin/cash-redemptions" component={CashRedemptions} admin={true} />
          </AdminLayout>
        </Route>
        <Route path="/admin/manage-users">
          <AdminLayout>
            <ProtectedRoute path="/admin/manage-users" component={ManageUsers} admin={true} />
          </AdminLayout>
        </Route>
        <Route path="/admin/logs">
          <AdminLayout>
            <ProtectedRoute path="/admin/logs" component={AdminLogs} admin={true} />
          </AdminLayout>
        </Route>
        <Route path="/admin/quote-requests">
          <AdminLayout>
            <ProtectedRoute path="/admin/quote-requests" component={AdminQuoteRequests} admin={true} />
          </AdminLayout>
        </Route>

        {/* Agent Routes */}
        <Route path="/agent">
          <AgentLayout>
            <ProtectedRoute path="/agent" component={AgentDashboard} agent={true} />
          </AgentLayout>
        </Route>
        <Route path="/agent/customers">
          <AgentLayout>
            <ProtectedRoute path="/agent/customers" component={AgentCustomers} agent={true} />
          </AgentLayout>
        </Route>

        {/* Customer Routes */}
        <Route path="/dashboard">
          <CustomerLayout>
            <ProtectedRoute path="/dashboard" component={CustomerDashboard} />
          </CustomerLayout>
        </Route>
        <Route path="/rewards">
          <CustomerLayout>
            <ProtectedRoute path="/rewards" component={CustomerRewards} />
          </CustomerLayout>
        </Route>
        <Route path="/referrals">
          <CustomerLayout>
            <ProtectedRoute path="/referrals" component={ReferralsPage} />
          </CustomerLayout>
        </Route>
        <Route path="/profile">
          <CustomerLayout>
            <ProtectedRoute path="/profile" component={ProfilePage} />
          </CustomerLayout>
        </Route>
        <Route path="/products">
          <CustomerLayout>
            <ProtectedRoute path="/products" component={CustomerProducts} />
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
      <AuthProvider>
        <div className="min-h-screen w-full bg-background">
          <Router />
          <Toaster />
        </div>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;