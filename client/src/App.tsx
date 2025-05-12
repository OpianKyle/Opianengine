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
import { useEffect } from "react";
import { initGA } from "./lib/analytics";
import { useAnalytics } from "./hooks/use-analytics";
import { MetaTags } from "@/components/seo/meta-tags";
import { WebsiteStructuredData, OrganizationStructuredData } from "@/components/seo/structured-data";
import { TransitionProvider } from "@/components/transitions/transition-provider";
import { PageTransition } from "@/components/transitions/page-transition";

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
import AdminLeads from "@/pages/admin/leads"; // Added import for Leads management
import CardStatusTest from "@/pages/admin/card-status-test"; // Added import for card status test page

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
  // Track page views when routes change
  useAnalytics();
  
  return (
    <Switch>
      {/* Public Routes */}
      <Route path="/">
        <PageTransition effect="fade">
          <Home />
        </PageTransition>
      </Route>
      <Route path="/login">
        <PageTransition effect="slide">
          <LoginPage />
        </PageTransition>
      </Route>
      <Route path="/register">
        <PageTransition effect="scale">
          <Register />
        </PageTransition>
      </Route>
      <Route path="/contact-us">
        <PageTransition effect="fade">
          <ContactUsPage />
        </PageTransition>
      </Route>
      <Route path="/reset-password">
        <PageTransition effect="slide">
          <ResetPassword />
        </PageTransition>
      </Route>
      <Route path="/referral/:code">
        <PageTransition effect="scale">
          <ReferralPage />
        </PageTransition>
      </Route>
      <Route path="/how-it-works">
        <PageTransition effect="bounce">
          <HowItWorks />
        </PageTransition>
      </Route>
      <Route path="/meet-the-team">
        <PageTransition effect="flip">
          <MeetTheTeam />
        </PageTransition>
      </Route>

      {/* Admin Routes */}
      <Route path="/admin">
        <AdminLayout>
          <PageTransition effect="fade">
            <ProtectedRoute component={AdminDashboard} admin />
          </PageTransition>
        </AdminLayout>
      </Route>
      <Route path="/admin/customers">
        <AdminLayout>
          <PageTransition effect="slide">
            <ProtectedRoute component={AdminCustomers} admin />
          </PageTransition>
        </AdminLayout>
      </Route>
      <Route path="/admin/card-status-test">
        <AdminLayout>
          <PageTransition effect="scale">
            <ProtectedRoute component={CardStatusTest} admin />
          </PageTransition>
        </AdminLayout>
      </Route>
      <Route path="/admin/agents">
        <AdminLayout>
          <PageTransition effect="fade">
            <ProtectedRoute component={AdminAgents} admin />
          </PageTransition>
        </AdminLayout>
      </Route>
      <Route path="/admin/email-logs">
        <AdminLayout>
          <PageTransition effect="slide">
            <ProtectedRoute component={EmailLogs} admin />
          </PageTransition>
        </AdminLayout>
      </Route>
      <Route path="/admin/products">
        <AdminLayout>
          <PageTransition effect="scale">
            <ProtectedRoute component={AdminProducts} admin />
          </PageTransition>
        </AdminLayout>
      </Route>
      <Route path="/admin/rewards">
        <AdminLayout>
          <PageTransition effect="fade">
            <ProtectedRoute component={AdminRewards} admin />
          </PageTransition>
        </AdminLayout>
      </Route>
      <Route path="/admin/cash-redemptions">
        <AdminLayout>
          <PageTransition effect="slide">
            <ProtectedRoute component={CashRedemptions} admin />
          </PageTransition>
        </AdminLayout>
      </Route>
      <Route path="/admin/manage-users">
        <AdminLayout>
          <PageTransition effect="scale">
            <ProtectedRoute component={ManageUsers} admin />
          </PageTransition>
        </AdminLayout>
      </Route>
      <Route path="/admin/logs">
        <AdminLayout>
          <PageTransition effect="fade">
            <ProtectedRoute component={AdminLogs} admin />
          </PageTransition>
        </AdminLayout>
      </Route>
      <Route path="/admin/quote-requests">
        <AdminLayout>
          <PageTransition effect="slide">
            <ProtectedRoute component={AdminQuoteRequests} admin />
          </PageTransition>
        </AdminLayout>
      </Route>
      <Route path="/admin/migrations">
        <AdminLayout>
          <PageTransition effect="scale">
            <ProtectedRoute component={Migrations} admin />
          </PageTransition>
        </AdminLayout>
      </Route>
      <Route path="/admin/leads">
        <AdminLayout>
          <PageTransition effect="fade">
            <ProtectedRoute component={AdminLeads} admin />
          </PageTransition>
        </AdminLayout>
      </Route>

      {/* Agent Routes */}
      <Route path="/agent">
        <AgentLayout>
          <PageTransition effect="bounce">
            <ProtectedRoute component={AgentDashboard} agent />
          </PageTransition>
        </AgentLayout>
      </Route>
      <Route path="/agent/customers">
        <AgentLayout>
          <PageTransition effect="scale">
            <ProtectedRoute component={AgentCustomers} agent />
          </PageTransition>
        </AgentLayout>
      </Route>
      <Route path="/agent/leads">
        <AgentLayout>
          <PageTransition effect="slide">
            <ProtectedRoute component={AgentLeads} agent />
          </PageTransition>
        </AgentLayout>
      </Route>

      {/* Customer Routes */}
      <Route path="/dashboard">
        <CustomerLayout>
          <PageTransition effect="flip">
            <ProtectedRoute component={CustomerDashboard} />
          </PageTransition>
        </CustomerLayout>
      </Route>
      <Route path="/rewards">
        <CustomerLayout>
          <PageTransition effect="bounce">
            <ProtectedRoute component={CustomerRewards} />
          </PageTransition>
        </CustomerLayout>
      </Route>
      <Route path="/referrals">
        <CustomerLayout>
          <PageTransition effect="scale">
            <ProtectedRoute component={ReferralsPage} />
          </PageTransition>
        </CustomerLayout>
      </Route>
      <Route path="/profile">
        <CustomerLayout>
          <PageTransition effect="slide">
            <ProtectedRoute component={ProfilePage} />
          </PageTransition>
        </CustomerLayout>
      </Route>
      <Route path="/products">
        <CustomerLayout>
          <PageTransition effect="fade">
            <ProtectedRoute component={CustomerProducts} />
          </PageTransition>
        </CustomerLayout>
      </Route>
      
      {/* Subscription routes removed as requested */}

      <Route path="*">
        <PageTransition effect="fade">
          <NotFound />
        </PageTransition>
      </Route>
    </Switch>
  );
}

function App() {
  // Initialize Google Analytics when app loads
  useEffect(() => {
    initGA();
    console.log('Google Analytics initialized');
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ResponsiveProvider>
          <ThemeProvider>
            {/* Default SEO tags for all pages */}
            <MetaTags />
            
            {/* Structured data for improved search engine visibility */}
            <WebsiteStructuredData />
            <OrganizationStructuredData />
            
            <div className="min-h-screen w-full bg-background transition-colors duration-300">
              <TransitionProvider transitionEffect="fade">
                <Router />
              </TransitionProvider>
              <Toaster />
            </div>
          </ThemeProvider>
        </ResponsiveProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;