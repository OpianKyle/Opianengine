import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth-page";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider } from "@/hooks/use-auth";
import { useSessionTimeout } from "@/hooks/use-session-timeout";
import { ProtectedRoute } from "@/lib/protected-route";

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
import AgentCustomers from "@/pages/agent/customers";

function Router() {
  useSessionTimeout();
  
  return (
    <SidebarProvider>
      <Switch>
        {/* Public Routes */}
        <Route path="/">
          <Home />
        </Route>
        <Route path="/auth">
          <AuthPage />
        </Route>

        {/* Admin Routes */}
        <ProtectedRoute 
          path="/admin" 
          component={AdminDashboard} 
          admin 
        />
        <ProtectedRoute 
          path="/admin/customers" 
          component={AdminCustomers} 
          admin 
        />
        <ProtectedRoute 
          path="/admin/agents" 
          component={AdminAgents} 
          admin 
        />
        <ProtectedRoute 
          path="/admin/email-logs" 
          component={EmailLogs} 
          admin 
        />
        <ProtectedRoute 
          path="/admin/products" 
          component={AdminProducts} 
          admin 
        />
        <ProtectedRoute 
          path="/admin/rewards" 
          component={AdminRewards} 
          admin 
        />
        <ProtectedRoute 
          path="/admin/cash-redemptions" 
          component={CashRedemptions} 
          admin 
        />
        <ProtectedRoute 
          path="/admin/manage-users" 
          component={ManageUsers} 
          admin 
        />
        <ProtectedRoute 
          path="/admin/logs" 
          component={AdminLogs} 
          admin 
        />
        <ProtectedRoute 
          path="/admin/quote-requests" 
          component={AdminQuoteRequests} 
          admin 
        />

        {/* Agent Routes */}
        <ProtectedRoute 
          path="/agent" 
          component={AgentDashboard} 
          agent 
        />
        <ProtectedRoute 
          path="/agent/customers" 
          component={AgentCustomers} 
          agent 
        />

        {/* Customer Routes */}
        <ProtectedRoute 
          path="/dashboard" 
          component={CustomerDashboard} 
        />
        <ProtectedRoute 
          path="/rewards" 
          component={CustomerRewards} 
        />
        <ProtectedRoute 
          path="/referrals" 
          component={ReferralsPage} 
        />
        <ProtectedRoute 
          path="/profile" 
          component={ProfilePage} 
        />
        <ProtectedRoute 
          path="/products" 
          component={CustomerProducts} 
        />

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