import { useCallback, useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  referralCode?: string | null;
}

export default function HomePage() {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regFirstName, setRegFirstName] = useState("");
  const [regLastName, setRegLastName] = useState("");
  const [regPhone, setRegPhone] = useState("");
  const [regError, setRegError] = useState("");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetEmailSent, setResetEmailSent] = useState(false);
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const { loginMutation, registerMutation, user, isLoading } = useUser();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref);
      const tabsList = document.querySelector('[role="tablist"]');
      if (tabsList) {
        const registerTab = tabsList.querySelector('[value="register"]') as HTMLButtonElement;
        if (registerTab) {
          registerTab.click();
        }
      }
    }
  }, []);

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

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");

    if (!loginEmail || !loginPassword) {
      setLoginError("Please fill in all fields");
      return;
    }

    try {
      const user = await loginMutation.mutateAsync({
        email: loginEmail,
        password: loginPassword
      });

      toast({
        title: "Success",
        description: "Login successful",
      });

      navigate(user.isAdmin ? '/admin' : '/dashboard');
    } catch (err) {
      setLoginError("Invalid email or password");
      toast({
        variant: "destructive",
        title: "Error",
        description: "Invalid email or password",
      });
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");

    if (!regEmail || !regPassword || !regFirstName || !regLastName || !regPhone) {
      setRegError("Please fill in all fields");
      return;
    }

    try {
      const user = await registerMutation.mutateAsync({
        email: regEmail,
        password: regPassword,
        firstName: regFirstName,
        lastName: regLastName,
        phoneNumber: regPhone,
        ...(referralCode ? { referralCode } : {})
      });

      toast({
        title: "Success",
        description: "Registration successful",
      });

      navigate(user.isAdmin ? '/admin' : '/dashboard');
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || "Registration failed. Please try again.";
      setRegError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
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
          {referralCode && (
            <p className="mt-2 text-sm text-muted-foreground">
              You've been referred by a friend!
            </p>
          )}
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="register">Register</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-4">
                <Input
                  id="login-email"
                  type="email"
                  placeholder="Email address"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="w-full"
                />
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full"
                />
              </div>

              {loginError && (
                <div className="text-sm text-red-500 text-center">
                  {loginError}
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

                <Button
                  type="button"
                  variant="ghost"
                  className="text-[#43EB3E] hover:text-[#3AD936]"
                  onClick={() => setIsResetDialogOpen(true)}
                >
                  Forgot your password?
                </Button>
              </div>
            </form>
          </TabsContent>

          <TabsContent value="register">
            <form onSubmit={handleRegister} className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="First Name"
                    value={regFirstName}
                    onChange={(e) => setRegFirstName(e.target.value)}
                  />
                  <Input
                    placeholder="Last Name"
                    value={regLastName}
                    onChange={(e) => setRegLastName(e.target.value)}
                  />
                </div>
                <Input
                  type="email"
                  placeholder="Email address"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                />
                <Input
                  type="password"
                  placeholder="Password"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                />
                <Input
                  placeholder="Phone Number"
                  value={regPhone}
                  onChange={(e) => setRegPhone(e.target.value)}
                />
              </div>

              {regError && (
                <div className="text-sm text-red-500 text-center">
                  {regError}
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Registering...
                  </div>
                ) : (
                  "Register"
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

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