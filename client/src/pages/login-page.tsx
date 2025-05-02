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
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-white to-gray-100 dark:from-[#01162f] dark:to-[#011d3f] text-foreground dark:text-white transition-colors duration-300">
      {/* Header with logo */}
      <header className="py-6 border-b border-gray-200 dark:border-[#022b5c] bg-white dark:bg-[#01162f] shadow-sm transition-colors duration-300">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <a href="/" className="flex items-center">
            <img
              src="/opian-rewards-logo(R).png"
              alt="OPIAN Rewards"
              className="h-10 w-auto block dark:hidden"
            />
            <img
              src="/opian-logo-white.png"
              alt="OPIAN Rewards"
              className="h-10 w-auto hidden dark:block"
            />
          </a>
          <Button
            variant="outline"
            onClick={() => navigate("/")}
            className="text-foreground dark:text-white border-gray-300 dark:border-[#022b5c] hover:bg-gray-100 dark:hover:bg-[#022b5c]/50 transition-colors duration-300"
          >
            Back to Home
          </Button>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 container mx-auto px-4 py-12 md:py-16">
        <div className="flex flex-col lg:flex-row gap-12 items-center justify-center">
          {/* Left side - Hero content */}
          <div className="w-full max-w-lg hidden lg:block">
            <div className="p-8 rounded-xl bg-gradient-to-br from-[#011d3f] to-[#022b5c] shadow-lg dark:shadow-[#43EB3E]/10 relative overflow-hidden">
              {/* Overlay with "glow" */}
              <div className="absolute inset-0 bg-[#43EB3E] opacity-5 mix-blend-overlay"></div>
              
              <h2 className="text-3xl font-bold mb-6 text-white">Welcome Back</h2>
              <p className="text-lg text-gray-200 mb-8">
                Access your OPIAN Rewards dashboard to track your points, manage your account, 
                and discover new ways to maximize your benefits.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#022b5c] border border-[#43EB3E]/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#43EB3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-white">Track Rewards</h3>
                    <p className="text-gray-300">Monitor your points balance and track your progress</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#022b5c] border border-[#43EB3E]/30 flex items-center justify-center">
                    <svg className="w-5 h-5 text-[#43EB3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-white">Activate Benefits</h3>
                    <p className="text-gray-300">Access exclusive offers and activate your benefits</p>
                  </div>
                </div>
              </div>
              
              {/* Animated particles */}
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-[20%] left-[10%] w-2 h-2 rounded-full bg-[#43EB3E] opacity-40 animate-pulse"></div>
                <div className="absolute top-[60%] left-[20%] w-1.5 h-1.5 rounded-full bg-[#43EB3E] opacity-30 animate-pulse delay-300"></div>
                <div className="absolute top-[40%] right-[15%] w-2 h-2 rounded-full bg-[#43EB3E] opacity-40 animate-pulse delay-100"></div>
                <div className="absolute bottom-[20%] right-[25%] w-1.5 h-1.5 rounded-full bg-[#43EB3E] opacity-30 animate-pulse delay-500"></div>
              </div>
            </div>
          </div>
          
          {/* Login Form */}
          <div className="w-full max-w-md">
            <Card className="border-t-4 border-[#43EB3E] bg-white dark:bg-[#022b5c] shadow-lg dark:shadow-[#43EB3E]/5 transition-colors duration-300">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Sign In</CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-300">
                  Access your OPIAN Rewards account
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Form {...loginForm}>
                  <form
                    onSubmit={loginForm.handleSubmit(onLoginSubmit)}
                    className="space-y-5"
                  >
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-200">Username</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your username"
                              className="bg-gray-50 dark:bg-[#01162f] border-gray-200 dark:border-[#011d3f] focus:border-[#43EB3E] dark:focus:border-[#43EB3E] focus:ring-[#43EB3E]/20 dark:focus:ring-[#43EB3E]/20 transition-colors duration-300"
                              {...field}
                              autoComplete="username"
                            />
                          </FormControl>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-200">Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter your password"
                              className="bg-gray-50 dark:bg-[#01162f] border-gray-200 dark:border-[#011d3f] focus:border-[#43EB3E] dark:focus:border-[#43EB3E] focus:ring-[#43EB3E]/20 dark:focus:ring-[#43EB3E]/20 transition-colors duration-300"
                              {...field}
                              autoComplete="current-password"
                            />
                          </FormControl>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />

                    <div className="text-sm">
                      <a
                        href="/reset-password"
                        className="text-[#43EB3E] hover:text-[#3ad036] hover:underline transition-colors duration-200"
                      >
                        Forgot password?
                      </a>
                    </div>

                    <Button
                      type="submit"
                      className="w-full bg-[#43EB3E] hover:bg-[#3ad036] text-black font-semibold shadow-md hover:shadow-lg transition-all duration-300"
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
      <footer className="py-6 border-t border-gray-200 dark:border-[#022b5c] bg-white dark:bg-[#01162f] transition-colors duration-300">
        <div className="container mx-auto px-4">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} OPIAN Rewards. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}