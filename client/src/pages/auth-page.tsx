import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// Login form schema
const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().optional(),
});

// Registration form schema
const registerSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  mobileNumber: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string().min(8, "Please confirm your password"),
  referralCode: z.string().optional(),
  selectedPackage: z.string().min(1, "Please select a package"),
  agreeToTerms: z.boolean()
    .refine(val => val === true, { 
      message: "You must agree to the terms and conditions" 
    }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

// Types for form values
type LoginFormValues = z.infer<typeof loginSchema>;
type RegisterFormValues = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user, isLoading, loginMutation, registerMutation } = useAuth();

  // Get referral code from URL if present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref && registerForm) {
      registerForm.setValue('referralCode', ref);
    }
  }, [activeTab]);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      if (user.is_admin || user.is_super_admin) {
        navigate('/admin');
      } else if (user.is_agent) {
        navigate('/agent');
      } else {
        navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  // Login form setup
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // Registration form setup
  const registerForm = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      mobileNumber: "",
      password: "",
      confirmPassword: "",
      referralCode: "",
      selectedPackage: "",
      agreeToTerms: false,
    },
  });

  // Submit handlers
  const onLoginSubmit = (values: LoginFormValues) => {
    loginMutation.mutate({
      email: values.email,
      password: values.password,
    });
  };

  const onRegisterSubmit = (values: RegisterFormValues) => {
    registerMutation.mutate({
      firstName: values.firstName,
      lastName: values.lastName,
      email: values.email,
      password: values.password,
      mobileNumber: values.mobileNumber,
      referralCode: values.referralCode,
      selectedPackage: values.selectedPackage,
    });
  };

  // Show loading state while authentication check is in progress
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto flex min-h-screen">
      <div className="flex flex-col md:flex-row w-full">
        {/* Left side - Form */}
        <div className="w-full md:w-1/2 p-6 flex items-center justify-center">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center">
              <img
                src="/Assets/opian-logo-white.png"
                alt="OPIAN Rewards"
                className="h-12 w-auto mx-auto"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.onerror = null;
                  img.src = '/logo-fallback.png';
                }}
              />
              <h2 className="mt-6 text-2xl font-semibold">Welcome to OPIAN Rewards</h2>
              <p className="mt-2 text-muted-foreground">
                Sign in to your account or register to get started
              </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 w-full mb-6">
                <TabsTrigger value="login">Sign In</TabsTrigger>
                <TabsTrigger value="register">Create Account</TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login">
                <Card>
                  <CardHeader>
                    <CardTitle>Sign in to your account</CardTitle>
                    <CardDescription>Enter your credentials to access your account</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...loginForm}>
                      <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                        <FormField
                          control={loginForm.control}
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
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={loginForm.control}
                          name="rememberMe"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>Remember me</FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        <Button 
                          type="submit" 
                          className="w-full" 
                          disabled={loginMutation.isPending}
                        >
                          {loginMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Signing In...
                            </>
                          ) : (
                            "Sign In"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Registration Form */}
              <TabsContent value="register">
                <Card>
                  <CardHeader>
                    <CardTitle>Create a new account</CardTitle>
                    <CardDescription>Fill in your details to join OPIAN Rewards</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...registerForm}>
                      <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={registerForm.control}
                            name="firstName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>First Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter your first name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={registerForm.control}
                            name="lastName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Last Name</FormLabel>
                                <FormControl>
                                  <Input placeholder="Enter your last name" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={registerForm.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Email</FormLabel>
                              <FormControl>
                                <Input type="email" placeholder="Enter your email address" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="mobileNumber"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mobile Number</FormLabel>
                              <FormControl>
                                <Input type="tel" placeholder="Enter your mobile number" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                          <FormField
                            control={registerForm.control}
                            name="password"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Create a password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={registerForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirm Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Confirm your password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>

                        <FormField
                          control={registerForm.control}
                          name="referralCode"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Referral Code (Optional)</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter referral code if you have one" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="selectedPackage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Select Package</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a package" />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="OPPORTUNITY">Opportunity (R350)</SelectItem>
                                  <SelectItem value="MOMENTUM">Momentum (R450)</SelectItem>
                                  <SelectItem value="PROSPER">Prosper (R550)</SelectItem>
                                  <SelectItem value="PRESTIGE">Prestige (R695)</SelectItem>
                                  <SelectItem value="PINNACLE">Pinnacle (R825)</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={registerForm.control}
                          name="agreeToTerms"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                              <div className="space-y-1 leading-none">
                                <FormLabel>
                                  I agree to the terms and conditions and mandate of authority
                                </FormLabel>
                              </div>
                            </FormItem>
                          )}
                        />

                        <Button
                          type="submit"
                          className="w-full"
                          disabled={registerMutation.isPending}
                        >
                          {registerMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Creating Account...
                            </>
                          ) : (
                            "Create Account"
                          )}
                        </Button>
                      </form>
                    </Form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Right side - Hero */}
        <div className="hidden md:flex md:w-1/2 bg-gradient-to-r from-primary/80 to-primary p-6 items-center justify-center">
          <div className="max-w-lg text-white">
            <h1 className="text-4xl font-bold mb-6">OPIAN Rewards Program</h1>
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold mb-2">Earn Points</h3>
                <p>Join our rewards program and start earning points with every purchase and referral.</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Redeem Rewards</h3>
                <p>Use your points to redeem exclusive rewards, discounts, and special offers.</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Refer Friends</h3>
                <p>Earn additional points by referring friends and family to join the OPIAN community.</p>
              </div>
              <div>
                <h3 className="text-xl font-semibold mb-2">Get Started Today</h3>
                <p>Choose from our range of packages to start your journey with OPIAN Rewards.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}