import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";

import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { user, isLoading } = useAuth();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Set up the login form
  const loginForm = useForm({
    resolver: zodResolver(
      z.object({
        username: z.string().min(1, "Username is required"),
        password: z.string().min(1, "Password is required"),
      })
    ),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Check if the user is already logged in
  useEffect(() => {
    if (user) {
      // User is already logged in, redirect to the appropriate dashboard
      if (user.is_admin) {
        navigate("/admin");
      } else if (user.is_agent) {
        navigate("/agent");
      } else {
        navigate("/dashboard");
      }
    }
  }, [user, navigate]);

  // Handle login form submission
  const onLoginSubmit = async (data: { username: string; password: string }) => {
    setSubmitting(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error("Login failed. Please check your credentials.");
      }

      // Refresh the user data
      await queryClient.invalidateQueries({ queryKey: ["/api/user"] });

      toast({
        title: "Login successful",
        description: "Redirecting to your dashboard...",
      });

      // User will be redirected by the useEffect above
    } catch (error) {
      console.error("Login error:", error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header with logo */}
      <header className="py-6 border-b">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <a href="/" className="flex items-center">
            <img
              src="/opian-rewards-logo(R).png"
              alt="OPIAN Rewards"
              className="h-8 w-auto hidden dark:block"
            />
            <img
              src="/opian-logo-white.png"
              alt="OPIAN Rewards"
              className="h-8 w-auto block dark:hidden"
            />
          </a>
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="text-foreground"
          >
            Back to Home
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-8 md:py-12">
        <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
          {/* Login Form */}
          <div className="w-full max-w-md">
            <Card className="border-[#43EB3E] border-t-4">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Sign In</CardTitle>
                <CardDescription>
                  Sign in to access your OPIAN Rewards account
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Username</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your username"
                              {...field}
                              autoComplete="username"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter your password"
                              {...field}
                              autoComplete="current-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="text-sm">
                      <a
                        href="/reset-password"
                        className="text-primary hover:underline"
                      >
                        Forgot password?
                      </a>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-[#43EB3E] hover:bg-[#3ad036] text-black font-semibold"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Signing in...
                        </>
                      ) : (
                        "Sign In"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} OPIAN Rewards. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}