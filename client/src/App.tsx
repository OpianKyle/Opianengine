import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import LoginPage from "@/pages/login-page"; // Updated login page
import Register from "@/pages/register";
import ContactUsPage from "@/pages/contact-us"; // New contact us page
import ResetPassword from "@/pages/reset-password";
import ReferralPage from "@/pages/referral"; 
import HowItWorks from "@/pages/how-it-works";
import MeetTheTeam from "@/pages/meet-the-team";
import { useAuth, AuthProvider } from "@/hooks/use-auth";
// Session timeout functionality has been removed
// import { useSessionTimeout } from "@/hooks/use-session-timeout";
import { Loader2 } from "lucide-react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ResponsiveProvider } from "@/hooks/use-mobile";
import ThemeProvider from "@/providers/theme-provider";

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
import SubscriptionPage from "@/pages/customer/subscription"; // Import subscription page

// Agent pages
import AgentDashboard from "@/pages/agent";
import AgentLayout from "@/components/layout/agent-layout";
import AgentCustomers from "@/pages/agent/customers";
import AgentLeads from "@/pages/agent/leads"; // Import agent referral leads page

function ProtectedRoute({ component: Component, admin = false, agent = false, ...rest }: any) {
  const { user, isLoading } = useAuth();
  // Session timeout functionality has been removed to prevent automatic logouts

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    console.log('No user found, redirecting to login page');
    return <Redirect to="/login" />;
  }

  console.log('ProtectedRoute checking user role:', { 
    isAdmin: Boolean(user.is_admin), 
    isSuperAdmin: Boolean(user.is_super_admin), 
    isAgent: Boolean(user.is_agent),
    requestingAdminRoute: admin,
    requestingAgentRoute: agent
  });

  // Handle routing based on user role
  if (admin && !(Boolean(user.is_admin) || Boolean(user.is_super_admin))) {
    console.log('User lacks admin privileges, redirecting to appropriate dashboard');
    if (Boolean(user.is_agent)) {
      return <Redirect to="/agent" />;
    }
    return <Redirect to="/dashboard" />;
  }

  if (agent && !Boolean(user.is_agent)) {
    console.log('User lacks agent privileges, redirecting to appropriate dashboard');
    if (Boolean(user.is_admin) || Boolean(user.is_super_admin)) {
      return <Redirect to="/admin" />;
    }
    return <Redirect to="/dashboard" />;
  }

  // Redirect users to their appropriate dashboards if they try to access routes not for their role
  if (!admin && !agent && user) {
    // Only redirect if they're accessing a route that's not for their role
    if (Boolean(user.is_admin) || Boolean(user.is_super_admin)) {
      const currentPath = window.location.pathname;
      // Only redirect admin users if they're trying to access agent routes
      // Allow admins to access customer routes
      if (currentPath.startsWith('/agent')) {
        console.log('Admin user accessing agent route, redirecting to admin dashboard');
        return <Redirect to="/admin" />;
      }
    } else if (Boolean(user.is_agent)) {
      const currentPath = window.location.pathname;
      // Only redirect agent users if they're trying to access admin routes
      // Allow agents to access customer routes
      if (currentPath.startsWith('/admin')) {
        console.log('Agent user accessing admin route, redirecting to agent dashboard');
        return <Redirect to="/agent" />;
      }
    }
  }

  return <Component {...rest} />;
}

function Router() {
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/">
        <Home />
      </Route>
      <Route path="/login">
        <LoginPage />
      </Route>
      <Route path="/register">
        <Register />
      </Route>
      <Route path="/contact-us">
        <ContactUsPage />
      </Route>
      <Route path="/reset-password">
        <ResetPassword />
      </Route>
      <Route path="/referral/:code">
        <ReferralPage />
      </Route>
      <Route path="/how-it-works">
        <HowItWorks />
      </Route>
      <Route path="/meet-the-team">
        <MeetTheTeam />
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
      
      {/* Subscription routes removed as requested */}

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ResponsiveProvider>
          <ThemeProvider>
            <div className="min-h-screen w-full bg-background transition-colors duration-300">
              <Router />
              <Toaster />
            </div>
          </ThemeProvider>
        </ResponsiveProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;