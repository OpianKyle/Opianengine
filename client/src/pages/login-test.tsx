import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";

// Login form schema
const loginFormSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginFormSchema>;

export default function LoginTest() {
  const { loginMutation } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Initialize form with react-hook-form and zod validation
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Handle form submission
  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      // Use test login endpoint instead of regular login
      const response = await fetch('/api/test-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
        }),
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Login failed');
      }
      
      const loginData = await response.json();
      
      // Store token in localStorage if provided
      if (loginData.token) {
        localStorage.setItem('auth_token', loginData.token);
      }
      
      // Update query cache with user data
      import('@/lib/queryClient').then(({ queryClient }) => {
        queryClient.setQueryData(['/api/user'], loginData.user);
        
        // Redirect based on user role
        setTimeout(() => {
          if (loginData.user.is_admin || loginData.user.is_super_admin) {
            window.location.href = '/admin';
          } else if (loginData.user.is_agent) {
            window.location.href = '/agent';
          } else {
            window.location.href = '/dashboard';
          }
        }, 100);
      });
      
    } catch (error) {
      console.error('Login failed:', error);
      // Show toast notification
      import('@/hooks/use-toast').then(({ useToast }) => {
        const { toast } = useToast();
        toast({
          title: 'Login failed',
          description: (error as Error).message || 'Authentication failed',
          variant: 'destructive',
        });
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = () => {
    onSubmit({
      email: "admin@example.com",
      password: "password",
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>
            Enter your email and password to access your account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || loginMutation.isPending}
            >
              {(isLoading || loginMutation.isPending) && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Login
            </Button>
            <div className="text-center text-sm">
              <Button variant="outline" onClick={handleAdminLogin} className="w-full mt-2">
                Login as Admin
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}