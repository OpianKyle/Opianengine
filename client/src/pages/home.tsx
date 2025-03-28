import { useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { user, isLoading } = useUser();
  const [, navigate] = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      navigate(`/register?ref=${ref}`);
    }
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    navigate(user.isAdmin ? '/admin' : '/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <img
            src="/Assets/opian-logo-white.png"
            alt="OPIAN Rewards"
            className="h-12 w-auto dark:invert"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.onerror = null;
              img.src = '/logo-fallback.png';
            }}
          />
          <h2 className="mt-6 text-2xl font-semibold">Welcome to OPIAN Rewards</h2>
          <p className="mt-2 text-center text-muted-foreground">
            Join our rewards program and start earning points today!
          </p>
        </div>

        <div className="flex flex-col space-y-4">
          <Button
            onClick={() => navigate("/login")}
            className="w-full"
          >
            Sign in
          </Button>
          <Button
            onClick={() => navigate("/register")}
            variant="outline"
            className="w-full"
          >
            Create account
          </Button>
        </div>
      </div>
    </div>
  );
}