import React, { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Package,
  Gift,
  DollarSign,
  ScrollText,
  FileText,
  LogOut,
  Menu,
  X,
  UserPlus,
  UserCheck,
  Mail,
  RefreshCw,
  Upload,
  TrendingUp,
} from "lucide-react";
import { prefetchAdminData } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/providers/theme-provider";
import { useAnalytics } from "@/hooks/use-analytics";
import { initGA } from "@/lib/analytics";
import { Helmet } from "react-helmet";

// Helper function for section determination
const getSectionFromHref = (href: string): 'dashboard' | 'users' | 'agents' | 'products' | 'rewards' | 'quotes' | 'redemptions' | 'logs' | 'leads' | 'all' => {
  if (href === '/admin') return 'dashboard';
  if (href === '/admin/manage-users') return 'users';
  if (href === '/admin/agents') return 'agents';
  if (href === '/admin/customers') return 'users';
  if (href === '/admin/leads') return 'leads';
  if (href === '/admin/products') return 'products';
  if (href === '/admin/quote-requests') return 'quotes';
  if (href === '/admin/rewards') return 'rewards';
  if (href === '/admin/cash-redemptions') return 'redemptions';
  if (href === '/admin/logs' || href === '/admin/email-logs') return 'logs';
  return 'all';
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logoutMutation, user } = useUser();
  const { token } = useAuth();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasPrefetched, setHasPrefetched] = useState(false);
  
  // Use analytics hook to track page views in admin area
  useAnalytics();
  
  // Initialize Google Analytics
  useEffect(() => {
    initGA();
  }, []);

  // Prefetch ALL admin data when the layout is first loaded
  useEffect(() => {
    if (!hasPrefetched && user && user.is_admin) {
      console.log(`🚀 Prefetching ALL admin data for instant page loads`);
      console.log('User authenticated:', user.email, 'Admin:', user.is_admin);
      
      // Prefetch ALL admin data immediately - this makes every page feel instant!
      prefetchAdminData(token, 'all');
      setHasPrefetched(true);
      
      // Add a success message so you know it's working
      setTimeout(() => {
        console.log('✅ All admin data prefetched - pages will now load instantly!');
      }, 2000);
    }
  }, [user, token, hasPrefetched]);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      // After successful logout, navigate to home
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const menuItems = [
    { label: "Dashboard", href: "/admin", icon: <LayoutDashboard className="h-4 w-4 mr-2" /> },
    { label: "User Management", href: "/admin/manage-users", icon: <UserPlus className="h-4 w-4 mr-2" /> },
    { label: "Agents", href: "/admin/agents", icon: <UserCheck className="h-4 w-4 mr-2" /> },
    { label: "Customers", href: "/admin/customers", icon: <Users className="h-4 w-4 mr-2" /> },
    { label: "Leads", href: "/admin/leads", icon: <Users className="h-4 w-4 mr-2" /> },
    { label: "Products", href: "/admin/products", icon: <Package className="h-4 w-4 mr-2" /> },
    { label: "Quote Requests", href: "/admin/quote-requests", icon: <FileText className="h-4 w-4 mr-2" /> },
    { label: "Rewards", href: "/admin/rewards", icon: <Gift className="h-4 w-4 mr-2" /> },
    { label: "Cash Redemptions", href: "/admin/cash-redemptions", icon: <DollarSign className="h-4 w-4 mr-2" /> },
    { label: "Card Statement Import", href: "/admin/card-statement-import", icon: <Upload className="h-4 w-4 mr-2" /> },
    { label: "Transaction Analytics", href: "/admin/transaction-history-merchant", icon: <TrendingUp className="h-4 w-4 mr-2" /> },
    { label: "Migrations", href: "/admin/migrations", icon: <RefreshCw className="h-4 w-4 mr-2" /> },
    { label: "Action Logs", href: "/admin/logs", icon: <ScrollText className="h-4 w-4 mr-2" /> },
    { label: "Email Logs", href: "/admin/email-logs", icon: <Mail className="h-4 w-4 mr-2" /> },
  ];

  // Handle navigation and prefetch data for the next section
  const handleNavigation = (href: string) => {
    // Determine which section we're navigating to
    const section = getSectionFromHref(href);
    
    // Only navigate if not already on the page
    if (href !== location) {
      // Immediately prefetch data before navigation to ensure fast loading
      if (token) {
        console.log(`🚀 Navigation prefetching for ${href} (${section})`);
        prefetchAdminData(token, section);
      }
      
      // Then navigate
      navigate(href);
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Theme Toggle and Mobile Menu */}
      <div className="fixed top-4 right-6 z-50 flex items-center gap-2">
        <ThemeToggle />
        <Button
          variant="outline"
          size="icon"
          className="lg:hidden h-10 w-10 bg-background shadow-md"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={cn(
        "fixed lg:relative inset-y-0 left-0 z-50",
        "w-64 lg:w-72 bg-background border-r",
        "transform transition-transform duration-300 ease-in-out",
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-4 md:p-6 border-b">
            <img 
              src={useTheme().theme === 'dark' ? '/opian-logo-white.png' : '/opian-rewards-logo(R).png'} 
              alt="OPIAN Rewards"
              className="h-8 md:h-12 w-auto object-contain mx-auto"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.onerror = null;
                img.src = '/logo-fallback.png';
              }}
            />
          </div>
          <div className="px-2 md:px-3 py-4 flex-1 overflow-y-auto">
            <h2 className="mb-2 px-3 md:px-4 text-base md:text-lg font-semibold text-[#1b75bc]">
              Admin Portal
            </h2>
            <div className="space-y-1">
              {menuItems.map((item) => (
                <Button
                  key={item.href}
                  variant={location === item.href ? "secondary" : "ghost"}
                  className="w-full justify-start text-sm md:text-base capitalize"
                  onClick={() => handleNavigation(item.href)}
                  onMouseEnter={() => {
                    // Start prefetching data when hovering over navigation items
                    if (token && item.href !== location) {
                      const section = getSectionFromHref(item.href);
                      console.log(`👆 Hover prefetching for ${item.href} (${section})`);
                      prefetchAdminData(token, section);
                    }
                  }}
                >
                  {item.icon}
                  {item.label}
                </Button>
              ))}
            </div>
          </div>
          <div className="p-3 md:p-4 border-t mt-auto">
            <Button
              variant="outline"
              className="w-full text-sm md:text-base"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? (
                <>Loading...</>
              ) : (
                <>
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </>
              )}
            </Button>
          </div>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <div className="h-full p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}