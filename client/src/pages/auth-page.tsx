import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from '@tanstack/react-query';
import { useUser } from "@/hooks/use-user";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { leadFormSchema } from "../../../db/leads";

// Default package options
const PACKAGE_OPTIONS = [
  { value: "OPPORTUNITY", label: "Opportunity - R350" },
  { value: "MOMENTUM", label: "Momentum - R450" },
  { value: "PROSPER", label: "Prosper - R550" },
  { value: "PRESTIGE", label: "Prestige - R695" },
  { value: "PINNACLE", label: "Pinnacle - R825" },
];

export default function AuthPage() {
  const [location, navigate] = useLocation();
  const { user, isLoading } = useUser();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const queryClient = useQueryClient();
  
  // Determine which tab to show based on the URL query parameter
  const [, params] = useRoute("/auth?:rest*");
  const searchParams = new URLSearchParams(params?.["rest*"] || "");
  const initialTab = searchParams.get("tab") || "login";
  const initialPackage = searchParams.get("package") || "";
  
  // Set up the lead form
  const leadForm = useForm<z.infer<typeof leadFormSchema>>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      selectedPackage: initialPackage ? (initialPackage.toUpperCase() as any) : undefined,
      referralCode: searchParams.get("ref") || "",
    },
  });

  // Set the tab state
  const [activeTab, setActiveTab] = useState(initialTab);

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

  // Handle lead form submission
  const onLeadSubmit = async (data: z.infer<typeof leadFormSchema>) => {
    setSubmitting(true);
    try {
      // Split the full name into first and last name
      const nameParts = data.fullName.split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ') || '';
      
      // Transform the data to match our database schema
      const transformedData = {
        firstName,
        lastName,
        email: data.email,
        mobileNumber: data.phoneNumber,
        selectedPackage: data.selectedPackage,
        referralCode: data.referralCode,
      };
      
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transformedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit lead information");
      }

      toast({
        title: "Thank you!",
        description: "Your information has been submitted. One of our agents will contact you soon.",
      });

      // Reset the form
      leadForm.reset();
      
      // Redirect to home page or show a thank you message
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      console.error("Error submitting lead:", error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

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
        <div className="flex flex-col md:flex-row gap-8 items-start">
          {/* Left side - Form */}
          <div className="w-full md:w-1/2">
            <Card className="border-[#43EB3E] border-t-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-2xl font-bold">OPIAN Rewards</CardTitle>
                    <TabsList>
                      <TabsTrigger value="login">Sign In</TabsTrigger>
                      <TabsTrigger value="register">Request Information</TabsTrigger>
                    </TabsList>
                  </div>
                  <CardDescription>
                    {activeTab === "login"
                      ? "Sign in to access your OPIAN Rewards account"
                      : "Let us know you're interested and we'll get back to you"}
                  </CardDescription>
                </CardHeader>

                <CardContent>
                  <TabsContent value="login" className="mt-0">
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
                  </TabsContent>

                  <TabsContent value="register" className="mt-0">
                    <Form {...leadForm}>
                      <form
                        onSubmit={leadForm.handleSubmit(onLeadSubmit)}
                        className="space-y-4"
                      >
                        <FormField
                          control={leadForm.control}
                          name="fullName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Full Name</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter your full name"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={leadForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input
                                  type="email"
                                  placeholder="Enter your email address"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={leadForm.control}
                          name="phoneNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter your phone number"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={leadForm.control}
                          name="selectedPackage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Package of Interest</FormLabel>
                              <Select
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                              >
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a package" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  {PACKAGE_OPTIONS.map((option) => (
                                    <SelectItem
                                      key={option.value}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={leadForm.control}
                          name="referralCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Referral Code (Optional)</FormLabel>
                              <FormControl>
                                <Input
                                  placeholder="Enter referral code if you have one"
                                  {...field}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full bg-[#43EB3E] hover:bg-[#3ad036] text-black font-semibold"
                          disabled={submitting}
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Submitting...
                            </>
                          ) : (
                            "Submit Information"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </TabsContent>
                </CardContent>
              </Tabs>

              <CardFooter className="flex flex-col space-y-4 pt-0">
                <div className="text-sm text-center w-full">
                  {activeTab === "login" ? (
                    <p>
                      Don't have an account?{" "}
                      <button
                        onClick={() => setActiveTab("register")}
                        className="text-primary hover:underline"
                      >
                        Request Information
                      </button>
                    </p>
                  ) : (
                    <p>
                      Already have an account?{" "}
                      <button
                        onClick={() => setActiveTab("login")}
                        className="text-primary hover:underline"
                      >
                        Sign in
                      </button>
                    </p>
                  )}
                </div>
              </CardFooter>
            </Card>
          </div>

          {/* Right side - Hero/Information */}
          <div className="w-full md:w-1/2 hidden md:block">
            <Card className="bg-[#01162f] text-white border-none relative overflow-hidden h-full">
              {/* Background particles */}
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-[10%] right-[15%] w-2 h-2 rounded-full bg-[#43EB3E] opacity-20 animate-pulse"></div>
                <div className="absolute top-[75%] left-[18%] w-1 h-1 rounded-full bg-[#43EB3E] opacity-30 animate-pulse delay-300"></div>
                <div className="absolute bottom-[30%] right-[22%] w-1.5 h-1.5 rounded-full bg-[#43EB3E] opacity-25 animate-pulse delay-500"></div>
                <div className="absolute top-[30%] left-[25%] w-1 h-1 rounded-full bg-[#43EB3E] opacity-20 animate-pulse delay-700"></div>
                <div className="absolute top-[45%] right-[35%] w-1 h-1 rounded-full bg-[#43EB3E] opacity-30 animate-pulse delay-150"></div>
                <div className="absolute top-[60%] left-[15%] w-2 h-2 rounded-full bg-[#43EB3E] opacity-20 animate-pulse delay-200"></div>
              </div>

              <div className="relative z-10 p-8 flex flex-col justify-center h-full">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold mb-6">
                    {activeTab === "login"
                      ? "Welcome Back!"
                      : "Join Opian Rewards Today!"}
                  </h2>
                  <p className="text-gray-300 mb-6">
                    {activeTab === "login"
                      ? "Access your OPIAN Rewards account to track your points, manage your rewards, and make smart financial decisions."
                      : "Discover the benefits of OPIAN Rewards. Submit your information and we'll get in touch to explain how you can earn rewards on your everyday spending."}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-start">
                    <div className="bg-[#022b5c] rounded-full p-2 mr-4">
                      <svg
                        className="h-5 w-5 text-[#43EB3E]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        Earn Cash Back
                      </h3>
                      <p className="text-gray-300 text-sm">
                        Get rewarded for your everyday spending and bill payments.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-[#022b5c] rounded-full p-2 mr-4">
                      <svg
                        className="h-5 w-5 text-[#43EB3E]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        Multiple Packages
                      </h3>
                      <p className="text-gray-300 text-sm">
                        Choose from various packages that match your financial goals and lifestyle.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start">
                    <div className="bg-[#022b5c] rounded-full p-2 mr-4">
                      <svg
                        className="h-5 w-5 text-[#43EB3E]"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold mb-1">
                        Refer & Earn
                      </h3>
                      <p className="text-gray-300 text-sm">
                        Invite friends and family to join OPIAN Rewards and earn additional benefits.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <img
                    src="/Join-Opian-Rewards-Today.jpg"
                    alt="OPIAN Rewards Card"
                    className="max-w-full rounded-lg mx-auto shadow-lg"
                    style={{ maxHeight: "150px", objectFit: "cover" }}
                  />
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 border-t">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} OPIAN Rewards. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}