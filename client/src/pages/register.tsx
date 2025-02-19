import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { Link } from "wouter";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const { registerMutation, user, isLoading } = useUser();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref);
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email || !password || !firstName || !lastName || !phone) {
      setError("Please fill in all fields");
      return;
    }

    try {
      const user = await registerMutation.mutateAsync({
        email,
        password,
        firstName,
        lastName,
        phoneNumber: phone,
        ...(referralCode ? { referralCode } : {})
      });

      toast({
        title: "Success",
        description: "Registration successful",
      });

      navigate(user.isAdmin ? '/admin' : '/dashboard');
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || "Registration failed. Please try again.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
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
          <h2 className="mt-6 text-2xl font-semibold">Create Your Account</h2>
          {referralCode && (
            <p className="mt-2 text-sm text-muted-foreground">
              You've been referred by a friend!
            </p>
          )}
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
              <Input
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Input
              placeholder="Phone Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
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
              disabled={registerMutation.isPending}
            >
              {registerMutation.isPending ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Creating account...
                </div>
              ) : (
                "Create account"
              )}
            </Button>

            <div className="text-center">
              <Button
                type="button"
                variant="ghost"
                className="text-[#43EB3E] hover:text-[#3AD936]"
                asChild
              >
                <Link href="/login">Already have an account? Sign in</Link>
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
