import React, { useState } from "react";
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
  UserCog,
  ScrollText,
  FileText,
  LogOut,
  Menu,
  X,
  UserPlus,
  UserCheck
} from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { logoutMutation } = useUser();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    { label: "Products", href: "/admin/products", icon: <Package className="h-4 w-4 mr-2" /> },
    { label: "Quote Requests", href: "/admin/quote-requests", icon: <FileText className="h-4 w-4 mr-2" /> },
    { label: "Rewards", href: "/admin/rewards", icon: <Gift className="h-4 w-4 mr-2" /> },
    { label: "Cash Redemptions", href: "/admin/cash-redemptions", icon: <DollarSign className="h-4 w-4 mr-2" /> },
    { label: "Action Logs", href: "/admin/logs", icon: <ScrollText className="h-4 w-4 mr-2" /> },
  ];

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Button
        variant="outline"
        size="icon"
        className="fixed top-4 right-6 z-50 lg:hidden h-10 w-10 bg-background shadow-md"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

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
              src="/Assets/opian-logo-white.png" 
              alt="OPIAN Rewards"
              className="h-8 md:h-12 w-auto object-contain mx-auto dark:invert"
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

      <main className="flex-1 overflow-y-auto">
        <div className="h-full p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}