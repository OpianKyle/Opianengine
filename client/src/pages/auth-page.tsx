import { useState } from "react";
import { Redirect } from "wouter";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/spinner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useTheme } from "@/providers/theme-provider";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

// Form validation schemas
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

// Modified schema for lead generation form
const leadSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits"),
  selectedPackage: z.enum(["OPPORTUNITY", "MOMENTUM", "PROSPER", "PRESTIGE", "PINNACLE"]).optional(),
  referralCode: z.string().optional()
});

type LoginFormData = z.infer<typeof loginSchema>;
type LeadFormData = z.infer<typeof leadSchema>;

export default function AuthPage() {
  const { user, loginMutation } = useAuth();
  const { theme } = useTheme();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("login");

  // Login form setup
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Lead form setup 
  const leadForm = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      mobileNumber: "",
      selectedPackage: "OPPORTUNITY",
      referralCode: "",
    },
  });

  // Handle login form submission
  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate({
      email: data.email,
      password: data.password,
    });
  };

  // Lead submission mutation
  const submitLeadMutation = useMutation({
    mutationFn: async (leadData: LeadFormData) => {
      const response = await fetch("/api/leads/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(leadData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to submit lead");
      }

      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Thank you for your interest!",
        description: "A representative will contact you shortly.",
        variant: "default",
      });
      
      // Reset the form
      leadForm.reset({
        email: "",
        firstName: "",
        lastName: "",
        mobileNumber: "",
        selectedPackage: "OPPORTUNITY",
        referralCode: "",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Submission failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handle lead form submission
  const onLeadSubmit = (data: LeadFormData) => {
    submitLeadMutation.mutate(data);
  };

  // If user is already logged in, redirect to the home page
  if (user) {
    return <Redirect to="/" />;
  }

  return (
    <div className="flex min-h-screen">
      {/* Form Section */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Logo based on theme */}
        <div className="mb-6 text-center">
          <img 
            src={theme === 'light' ? "/opian-rewards-logo(R).png" : "/opian-logo-white.png"} 
            alt="OPIAN Rewards" 
            className="h-12 w-auto mx-auto"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.onerror = null;
              img.src = '/logo-fallback.png';
            }}
          />
        </div>
        <Card className="w-full max-w-md p-6">
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 mb-6">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Get Information</TabsTrigger>
            </TabsList>

            {/* Login Form */}
            <TabsContent value="login">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" {...field} />
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
                          <Input type="password" placeholder="********" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full mt-6" 
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <LoadingSpinner className="mr-2" />
                    ) : null}
                    Sign In
                  </Button>
                </form>
              </Form>
            </TabsContent>

            {/* Lead Generation Form */}
            <TabsContent value="register">
              <Form {...leadForm}>
                <form onSubmit={leadForm.handleSubmit(onLeadSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={leadForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={leadForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={leadForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input placeholder="you@example.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={leadForm.control}
                    name="mobileNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mobile Number</FormLabel>
                        <FormControl>
                          <Input placeholder="+27123456789" {...field} />
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
                        <FormLabel>Package</FormLabel>
                        <FormControl>
                          <select 
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...field}
                          >
                            <option value="OPPORTUNITY">Opportunity (R350)</option>
                            <option value="MOMENTUM">Momentum (R450)</option>
                            <option value="PROSPER">Prosper (R550)</option>
                            <option value="PRESTIGE">Prestige (R695)</option>
                            <option value="PINNACLE">Pinnacle (R825)</option>
                          </select>
                        </FormControl>
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
                          <Input placeholder="REF12345" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="mt-2 text-xs text-gray-500">
                    By submitting this form, you agree to be contacted by our team about OPIAN Rewards. We'll reach out to discuss your selected package and answer any questions.
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full mt-6" 
                    disabled={submitLeadMutation.isPending}
                  >
                    {submitLeadMutation.isPending ? (
                      <LoadingSpinner className="mr-2" />
                    ) : null}
                    Get More Information
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>

      {/* Hero section */}
      <div className="hidden lg:flex flex-1 bg-primary text-primary-foreground">
        <div className="flex flex-col justify-center p-12 max-w-md mx-auto">
          <h1 className="text-3xl font-bold mb-4">Welcome to OPIAN Rewards</h1>
          <p className="text-primary-foreground/80 mb-6">
            Discover a world of rewards and benefits. Learn more about our packages,
            and let us help you start your journey to financial growth and rewards.
          </p>
          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 14 4-4" /><path d="M3.34 19a10 10 0 1 1 17.32 0" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Earn Points Effortlessly</h3>
                <p className="text-sm text-primary-foreground/70">Earn points on everyday activities and redeem for exciting rewards</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" /><path d="m16 8-8 8" /><path d="m8 8 8 8" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Exclusive Packages</h3>
                <p className="text-sm text-primary-foreground/70">Choose from packages designed to maximize your financial growth</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 10v12" /><path d="M15 5.88 14 10h5.83a2 2 0 0 1 1.92 2.56l-2.33 8A2 2 0 0 1 17.5 22H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h2.76a2 2 0 0 0 1.79-1.11L12 2h0a3.13 3.13 0 0 1 3 3.88Z" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Personalized Support</h3>
                <p className="text-sm text-primary-foreground/70">Dedicated agents provide customized guidance for your financial journey</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}