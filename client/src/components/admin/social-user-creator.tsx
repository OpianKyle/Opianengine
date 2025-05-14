import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { UserPlus, Loader2 } from 'lucide-react';

// Form validation schema
const formSchema = z.object({
  first_name: z.string().min(2, { message: 'First name must be at least 2 characters.' }),
  last_name: z.string().min(2, { message: 'Last name must be at least 2 characters.' }),
  email: z.string().email({ message: 'Please enter a valid email address.' }),
  password: z.string().min(8, { message: 'Password must be at least 8 characters.' }).regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+])[A-Za-z\d!@#$%^&*()_+]{8,}$/,
    { message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.' }
  ),
});

type FormValues = z.infer<typeof formSchema>;

export default function SocialUserCreator() {
  const { toast } = useToast();
  const [isSuccess, setIsSuccess] = useState(false);
  
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
    },
  });
  
  const createSocialUserMutation = useMutation({
    mutationFn: async (values: FormValues) => {
      const response = await apiRequest('POST', '/api/social/register-social-user', values);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create social user');
      }
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Social user created successfully.',
        variant: 'default',
      });
      setIsSuccess(true);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
  
  function onSubmit(values: FormValues) {
    createSocialUserMutation.mutate(values);
  }
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-primary" />
          <CardTitle className="text-xl">Create Social User</CardTitle>
        </div>
        <CardDescription>
          Create a new social user with restricted access to the social media analytics dashboard.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
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
                control={form.control}
                name="last_name"
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
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input placeholder="example@company.com" type="email" {...field} />
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
                    <Input placeholder="********" type="password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              className="w-full mt-4"
              disabled={createSocialUserMutation.isPending}
            >
              {createSocialUserMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                'Create Social User'
              )}
            </Button>
          </form>
        </Form>
      </CardContent>
      {isSuccess && (
        <CardFooter className="bg-green-50 border-t border-green-100 text-green-800 px-4 py-3">
          <p className="text-sm">
            Social user created successfully. They can now log in with the provided credentials and will have access to only the social analytics dashboard.
          </p>
        </CardFooter>
      )}
    </Card>
  );
}