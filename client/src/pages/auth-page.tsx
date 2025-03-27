import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Loader2 } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  password: z.string().min(8, { message: "Password must be at least 8 characters" }),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function AuthPage() {
  const [activeTab, setActiveTab] = useState("login");
  const { user, loginMutation } = useAuth();
  const [, navigate] = useLocation();

  // If user is already logged in, redirect
  if (user) {
    console.log("User already logged in, redirecting");
    if (user.is_agent) {
      navigate("/agent");
    } else if (user.is_admin || user.is_super_admin) {
      navigate("/admin");
    } else {
      navigate("/dashboard");
    }
    return null;
  }

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (data: LoginFormData) => {
    console.log("Login form submitted");
    try {
      await loginMutation.mutateAsync(data);
    } catch (error) {
      // Error is handled by the mutation's onError callback
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Form */}
      <div className="flex flex-col items-center justify-center w-full lg:w-1/2 p-4 lg:p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <img 
              src="/logo.png" 
              alt="Opian Rewards" 
              className="h-14 mx-auto mb-4"
              onError={(e) => {
                e.currentTarget.src = 'https://via.placeholder.com/200x80?text=Opian+Rewards';
              }}
            />
            <h1 className="text-2xl font-bold text-gray-900">Welcome to Opian Rewards</h1>
            <p className="text-gray-500">Sign in to manage your account</p>
          </div>

          <Tabs defaultValue="login" className="w-full" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-1">
              <TabsTrigger value="login">Login</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Account Login</CardTitle>
                  <CardDescription>
                    Enter your credentials to access your account
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
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
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
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
                            Logging in...
                          </>
                        ) : "Sign In"}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
                <CardFooter className="flex justify-center">
                  <p className="text-sm text-gray-500">
                    For account assistance, please contact your administrator
                  </p>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Right Side - Hero */}
      <div className="hidden lg:flex flex-col lg:w-1/2 bg-[#1b75bc] text-white p-8 justify-center items-center">
        <div className="max-w-lg text-center">
          <h2 className="text-3xl font-bold mb-4">Reward Management System</h2>
          <p className="text-xl mb-6">
            Manage your customer rewards, track progress, and boost engagement with our comprehensive platform.
          </p>
          <div className="grid grid-cols-2 gap-4 text-left">
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Customer Management</h3>
              <p className="text-sm">Track customer data, assign products, and manage engagements.</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Points System</h3>
              <p className="text-sm">Manage and track reward points allocation for your customers.</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Agent Portal</h3>
              <p className="text-sm">Dedicated agent interface for customer and product management.</p>
            </div>
            <div className="bg-white/10 p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Administrative Tools</h3>
              <p className="text-sm">Powerful admin features for system configuration and monitoring.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}