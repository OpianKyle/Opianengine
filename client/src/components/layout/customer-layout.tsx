import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Home, Gift, Users, User, Menu, X, ShoppingBag, CreditCard, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationBell from "@/components/NotificationBell";
import { prefetchCustomerData } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { OnboardingProvider, useOnboarding } from "@/contexts/OnboardingContext";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/providers/theme-provider";

// Helper function for section determination
const getSectionFromHref = (href: string): 'dashboard' | 'products' | 'rewards' | 'referral' | 'all' => {
  if (href === '/dashboard') return 'dashboard';
  if (href === '/products') return 'products';
  if (href === '/rewards') return 'rewards';
  if (href === '/referrals') return 'referral';
  // Subscription section removed as requested
  return 'all';
};

// Tour Button Component
export function TourGuideButton() {
  const { startTour } = useOnboarding();
  
  return (
    <Button
      onClick={startTour}
      variant="ghost"
      size="icon"
      className="tour-guide-button h-9 w-9 bg-background shadow-sm flex items-center justify-center border rounded-full"
      title="Start Tour Guide"
    >
      <HelpCircle className="h-5 w-5 text-[#43EB3E]" />
    </Button>
  );
}

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  const { logoutMutation, token } = useAuth();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [hasPrefetched, setHasPrefetched] = useState(false);

  // Prefetch section-specific data when the layout is first loaded
  useEffect(() => {
    if (!hasPrefetched && token) {
      // Get the current section based on the URL
      const currentSection = getSectionFromHref(location);
      console.log(`🚀 Initial prefetching for section: ${currentSection}`);
      
      // Prefetch data for the current section
      prefetchCustomerData(token, currentSection);
      setHasPrefetched(true);
    }
  }, [token, hasPrefetched, location]);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const menuItems = [
    { label: "Dashboard", href: "/dashboard", icon: <Home className="h-4 w-4 mr-2" /> },
    { label: "Products", href: "/products", icon: <ShoppingBag className="h-4 w-4 mr-2" /> },
    { label: "Rewards", href: "/rewards", icon: <Gift className="h-4 w-4 mr-2" /> },
    { label: "Referrals", href: "/referrals", icon: <Users className="h-4 w-4 mr-2" /> },
    // Subscription menu item removed as requested
    { label: "Profile", href: "/profile", icon: <User className="h-4 w-4 mr-2" />, className: "profile-link" },
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
        prefetchCustomerData(token, section);
      }
      
      // Then navigate
      navigate(href);
      setSidebarOpen(false);
    }
  };

  return (
    <div className="flex h-screen w-full">
      {/* Top Navbar with Theme Toggle, Notification Bell, Profile and Menu */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-background dark:bg-[#011d3d] border-b border-border dark:border-[#022b5c] shadow-sm">
        <div className="flex items-center justify-between h-16 px-4 max-w-[100rem] mx-auto">
          {/* Left section - Logo and menu toggle for mobile */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className="lg:hidden h-10 w-10 bg-background dark:bg-[#022b5c] shadow-sm"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <div className="hidden lg:block">
              <img 
                src={useTheme().theme === 'dark' ? '/opian-logo-white.png' : '/opian-rewards-logo(R).png'} 
                alt="OPIAN Rewards"
                className="h-8 w-auto object-contain"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.onerror = null;
                  img.src = '/logo-fallback.png';
                }}
              />
            </div>
          </div>
          
          {/* Right section - Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full h-9 w-9 bg-background dark:bg-[#022b5c] shadow-sm flex items-center justify-center border profile-link"
              onClick={() => handleNavigation('/profile')}
            >
              <User className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:fixed inset-y-0 left-0 z-40",
        "w-64 lg:w-72 bg-background border-r",
        "transform transition-transform duration-300 ease-in-out",
        "pt-16", // Add padding top for the navbar
        sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        <div className="flex flex-col h-full">
          <div className="p-4 md:p-6 border-b lg:hidden">
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
              Rewards Portal
            </h2>
            <div className="space-y-1 sidebar-navigation">
              {menuItems.map((item) => (
                <Button
                  key={item.href}
                  variant={location === item.href ? "secondary" : "ghost"}
                  className={`w-full justify-start text-sm md:text-base capitalize ${item.className || ''}`}
                  onClick={() => handleNavigation(item.href)}
                  onMouseEnter={() => {
                    // Start prefetching data when hovering over navigation items
                    if (token && item.href !== location) {
                      const section = getSectionFromHref(item.href);
                      console.log(`👆 Hover prefetching for ${item.href} (${section})`);
                      prefetchCustomerData(token, section);
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
              {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 w-0 lg:w-auto lg:pl-72">
        <div className="min-h-screen pt-20 pb-20">
          <div className="mx-auto px-4 sm:px-6 lg:px-8" style={{ maxWidth: "100rem" }}>
            <OnboardingProvider section="customer">
              {children}
            </OnboardingProvider>
          </div>
        </div>
      </main>

      {/* Bottom Navigation Bar - Mobile Only */}
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t lg:hidden">
        <div className="flex items-center justify-around h-16">
          {menuItems.map((item) => (
            <Button
              key={item.href}
              variant="ghost"
              size="sm"
              className={cn(
                "flex flex-col items-center justify-center h-full w-full space-y-1 rounded-none",
                location === item.href && "bg-secondary",
                item.className || ''
              )}
              onClick={() => handleNavigation(item.href)}
              onMouseEnter={() => {
                // Start prefetching data when hovering over mobile nav items
                if (token && item.href !== location) {
                  const section = getSectionFromHref(item.href);
                  console.log(`👆 Mobile hover prefetching for ${item.href} (${section})`);
                  prefetchCustomerData(token, section);
                }
              }}
            >
              {React.cloneElement(item.icon, { className: "h-5 w-5" })}
              <span className="text-xs">{item.label}</span>
            </Button>
          ))}
        </div>
      </nav>
    </div>
  );
}