import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "wouter";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [paymentAlert, setPaymentAlert] = useState<{
    show: boolean;
    type: 'success' | 'error';
    message: string;
  }>({ show: false, type: 'success', message: '' });

  const { loginMutation, user, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      navigate(Boolean(user.is_admin) || Boolean(user.is_super_admin) ? '/admin' : '/dashboard');
    }
  }, [user, navigate]);
  
  // Check for payment status in URL parameters
  useEffect(() => {
    // Parse the URL search parameters
    const params = new URLSearchParams(window.location.search);
    const paymentComplete = params.get('paymentComplete');
    const verified = params.get('verified');
    const reference = params.get('reference');
    
    if (paymentComplete === 'true') {
      if (verified === 'true') {
        setPaymentAlert({
          show: true,
          type: 'success',
          message: 'Your subscription has been activated. Please log in to continue.'
        });
        
        toast({
          title: "Payment Successful",
          description: "Your subscription has been activated. Please log in to continue."
        });
      } else {
        setPaymentAlert({
          show: true,
          type: 'error',
          message: 'There was an issue with your payment. Please log in and try again.'
        });
        
        toast({
          variant: "destructive",
          title: "Payment Failed",
          description: "There was an issue with your payment. Please log in and try again."
        });
      }
      
      // Clean the URL by removing the query parameters
      // Use history.replaceState to avoid a page reload
      const url = new URL(window.location.href);
      url.search = '';
      window.history.replaceState({}, '', url.toString());
    }
  }, [location, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login form submitted'); // Debug log
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields");
      return;
    }

    try {
      // Remove the toast from here since it's handled in the mutation
      await loginMutation.mutateAsync({
        email,
        password
      });
      // Success toast is now handled in useAuth hook
    } catch (err) {
      console.error("Login error:", err);
      setError("Invalid email or password");
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);

    try {
      const response = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setResetEmailSent(true);
      toast({
        title: "Success",
        description: "If an account exists with this email, you will receive password reset instructions.",
      });
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to send reset email. Please try again.",
      });
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="flex flex-col items-center">
          <img
            src="/opian-logo-white.png"
            alt="OPIAN Rewards"
            className="h-12 w-auto dark:invert"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.onerror = null;
              img.src = '/logo-fallback.png';
            }}
          />
          <h2 className="mt-6 text-2xl font-semibold">Welcome Back</h2>
        </div>
        
        {paymentAlert.show && (
          <Alert variant={paymentAlert.type === 'success' ? 'default' : 'destructive'} className={paymentAlert.type === 'success' ? 'border-green-500 bg-green-50' : ''}>
            {paymentAlert.type === 'success' ? (
              <CheckCircle className="h-4 w-4 text-green-500" />
            ) : (
              <AlertTriangle className="h-4 w-4" />
            )}
            <AlertTitle>
              {paymentAlert.type === 'success' ? 'Payment Successful' : 'Payment Failed'}
            </AlertTitle>
            <AlertDescription>
              {paymentAlert.message}
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-4">
            <Input
              id="login-email"
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full"
            />
            <Input
              id="login-password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full"
            />
          </div>

          {error && (
            <div className="text-sm text-red-500 text-center">
              {error}
            </div>
          )}

          <div className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Signing in...
                </div>
              ) : (
                "Sign in"
              )}
            </Button>

            <div className="flex justify-between items-center">
              <Button
                type="button"
                variant="ghost"
                className="text-[#43EB3E] hover:text-[#3AD936]"
                onClick={() => setIsResetDialogOpen(true)}
              >
                Forgot password?
              </Button>

              <Button
                type="button"
                variant="ghost"
                className="text-[#43EB3E] hover:text-[#3AD936]"
                asChild
              >
                <Link href="/register">Create account</Link>
              </Button>
            </div>
          </div>
        </form>

        <Dialog open={isResetDialogOpen} onOpenChange={setIsResetDialogOpen}>
          <DialogContent className="bg-[#011d3d] border-[#022b5c] text-white">
            <DialogHeader>
              <DialogTitle className="text-[#43EB3E]">Reset Password</DialogTitle>
            </DialogHeader>
            {!resetEmailSent ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="bg-[#011d3d] border-[#022b5c] text-white"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full bg-[#43EB3E] hover:bg-[#3AD936] text-black"
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Sending...
                    </div>
                  ) : (
                    "Send Reset Link"
                  )}
                </Button>
              </form>
            ) : (
              <div className="text-center py-4">
                <p>If an account exists with this email, you will receive password reset instructions shortly.</p>
                <Button
                  onClick={() => {
                    setIsResetDialogOpen(false);
                    setResetEmailSent(false);
                    setResetEmail("");
                  }}
                  className="mt-4 bg-[#43EB3E] hover:bg-[#3AD936] text-black"
                >
                  Close
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}