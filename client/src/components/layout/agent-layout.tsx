import React, { useState } from "react";
import { useUser } from "@/hooks/use-user";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Users,
  LogOut,
  Menu,
  X,
} from "lucide-react";

export default function AgentLayout({ children }: { children: React.ReactNode }) {
  const { logoutMutation } = useUser();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const menuItems = [
    { label: "Dashboard", href: "/agent", icon: <LayoutDashboard className="h-4 w-4 mr-2" /> },
    { label: "My Customers", href: "/agent/customers", icon: <Users className="h-4 w-4 mr-2" /> },
  ];

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile menu button */}
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 right-4 z-50 lg:hidden"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:relative inset-y-0 left-0 z-50",
          "w-64 bg-background border-r",
          "transform transition-transform duration-300 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="p-4 border-b">
            <img 
              src="/Assets/opian-logo-white.png" 
              alt="OPIAN Rewards"
              className="h-8 w-auto object-contain mx-auto dark:invert"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.onerror = null;
                img.src = '/logo-fallback.png';
              }}
            />
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 overflow-y-auto">
            <h2 className="mb-2 px-4 text-lg font-semibold text-[#1b75bc]">
              Agent Portal
            </h2>
            <div className="space-y-1">
              {menuItems.map((item) => (
                <Button
                  key={item.href}
                  variant={location === item.href ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    navigate(item.href);
                    setSidebarOpen(false);
                  }}
                >
                  {item.icon}
                  {item.label}
                </Button>
              ))}
            </div>
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t">
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? (
                "Logging out..."
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

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container mx-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}