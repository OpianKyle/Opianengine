import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import SocialMediaTracker from "@/components/admin/social-media-tracker";
import { LogOut } from "lucide-react";
import { useLocation } from "wouter";

export default function SocialDashboard() {
  const { user, isLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"social" | "devices" | "traffic">("social");

  // Redirect non-social users
  useEffect(() => {
    if (!isLoading && user && !user.is_social && !user.is_admin && !user.is_super_admin) {
      console.log('Non-social user detected in social dashboard, redirecting to customer dashboard');
      setLocation('/dashboard');
    }
    
    if (!isLoading && !user) {
      console.log('No user found in social dashboard, redirecting to login');
      setLocation('/login');
    }
  }, [isLoading, user, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }
  
  // Log user information for debugging
  console.log('SocialDashboard rendering with user:', {
    id: user.id,
    email: user.email,
    isSocial: user.is_social,
    isAdmin: user.is_admin,
    isSuperAdmin: user.is_super_admin
  });

  return (
    <>
      <Helmet>
        <title>Social Media Analytics | OPIAN Rewards</title>
      </Helmet>

      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="border-b border-border">
          <div className="container mx-auto px-4 py-4 flex justify-between items-center">
            <div className="flex items-center gap-2">
              <img src="/logo.png" alt="OPIAN Rewards" className="h-8" />
              <h1 className="text-xl font-semibold">Social Media Analytics</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden md:inline">
                Welcome, {user.first_name} {user.last_name}
              </span>
              <form action="/api/logout" method="post">
                <Button type="submit" variant="ghost" size="sm">
                  <LogOut className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </form>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-1 gap-6">
            <div className="border border-border rounded-lg p-6 bg-card shadow-sm">
              <SocialMediaTracker />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-border mt-auto">
          <div className="container mx-auto px-4 py-4 text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} OPIAN Rewards. All rights reserved.
          </div>
        </footer>
      </div>
    </>
  );
}