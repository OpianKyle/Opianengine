import { useState } from "react";
import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Define form schema for lead generation
const contactFormSchema = z.object({
  fullName: z.string().min(3, "Full name is required"),
  email: z.string().email("Please enter a valid email address"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 characters"),
  selectedPackage: z.enum(["OPPORTUNITY", "MOMENTUM", "PROSPER", "PRESTIGE", "PINNACLE"]).optional(),
  message: z.string().optional(),
});

// Package options for the dropdown
const PACKAGE_OPTIONS = [
  { value: "OPPORTUNITY", label: "OPPORTUNITY - R350" },
  { value: "MOMENTUM", label: "MOMENTUM - R450" },
  { value: "PROSPER", label: "PROSPER - R550" },
  { value: "PRESTIGE", label: "PRESTIGE - R695" },
  { value: "PINNACLE", label: "PINNACLE - R825" },
];

export default function ContactUsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  
  // Get any query parameters
  const searchParams = new URLSearchParams(window.location.search);
  const initialPackage = searchParams.get("package") || "";
  
  // Set up the contact form
  const contactForm = useForm<z.infer<typeof contactFormSchema>>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      fullName: "",
      email: "",
      phoneNumber: "",
      selectedPackage: initialPackage ? (initialPackage.toUpperCase() as any) : undefined,
      message: "",
    },
  });

  // Handle contact form submission
  const onContactSubmit = async (data: z.infer<typeof contactFormSchema>) => {
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
        notes: data.message,
      };
      
      // Submit to the leads API
      const response = await fetch("/api/leads", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(transformedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to submit contact information");
      }

      toast({
        title: "Thank you for contacting us!",
        description: "Your information has been submitted. One of our representatives will contact you soon.",
      });

      // Reset the form
      contactForm.reset();
      
      // Redirect to home page after a short delay
      setTimeout(() => {
        navigate("/");
      }, 2000);
    } catch (error) {
      console.error("Error submitting contact form:", error);
      toast({
        title: "Submission failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

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
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-900 dark:text-white">Get Started with OPIAN Rewards</h1>
        
        <div className="flex flex-col-reverse md:flex-row gap-8 items-start">
          {/* Left side - Contact Form */}
          <div className="w-full md:w-1/2">
            <Card className="border-t-4 border-[#43EB3E] bg-white dark:bg-[#022b5c] shadow-lg dark:shadow-[#43EB3E]/5 transition-colors duration-300">
              <CardHeader className="pb-6">
                <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white">Contact Us</CardTitle>
                <CardDescription className="text-gray-500 dark:text-gray-300">
                  Let us know you're interested and we'll get back to you
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Form {...contactForm}>
                  <form
                    onSubmit={contactForm.handleSubmit(onContactSubmit)}
                    className="space-y-5"
                  >
                    <FormField
                      control={contactForm.control}
                      name="fullName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-200">Full Name</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your full name"
                              className="bg-gray-50 dark:bg-[#01162f] border-gray-200 dark:border-[#011d3f] focus:border-[#43EB3E] dark:focus:border-[#43EB3E] focus:ring-[#43EB3E]/20 dark:focus:ring-[#43EB3E]/20 transition-colors duration-300"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={contactForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-200">Email</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="Enter your email address"
                              className="bg-gray-50 dark:bg-[#01162f] border-gray-200 dark:border-[#011d3f] focus:border-[#43EB3E] dark:focus:border-[#43EB3E] focus:ring-[#43EB3E]/20 dark:focus:ring-[#43EB3E]/20 transition-colors duration-300"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={contactForm.control}
                      name="phoneNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-200">Phone Number</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your phone number"
                              className="bg-gray-50 dark:bg-[#01162f] border-gray-200 dark:border-[#011d3f] focus:border-[#43EB3E] dark:focus:border-[#43EB3E] focus:ring-[#43EB3E]/20 dark:focus:ring-[#43EB3E]/20 transition-colors duration-300"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={contactForm.control}
                      name="selectedPackage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-200">Package of Interest</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-gray-50 dark:bg-[#01162f] border-gray-200 dark:border-[#011d3f] focus:ring-[#43EB3E]/20 dark:focus:ring-[#43EB3E]/20 transition-colors duration-300">
                                <SelectValue placeholder="Select a package" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="bg-white dark:bg-[#022b5c] border-gray-200 dark:border-[#011d3f]">
                              {PACKAGE_OPTIONS.map((option) => (
                                <SelectItem
                                  key={option.value}
                                  value={option.value}
                                  className="text-gray-900 dark:text-white hover:bg-gray-100 dark:hover:bg-[#01162f]/50"
                                >
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={contactForm.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-700 dark:text-gray-200">Message (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us what you're interested in"
                              className="min-h-[100px] bg-gray-50 dark:bg-[#01162f] border-gray-200 dark:border-[#011d3f] focus:border-[#43EB3E] dark:focus:border-[#43EB3E] focus:ring-[#43EB3E]/20 dark:focus:ring-[#43EB3E]/20 transition-colors duration-300"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-red-500" />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full bg-[#43EB3E] hover:bg-[#3ad036] text-black font-semibold shadow-md hover:shadow-lg transition-all duration-300"
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        "Submit"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Right side - Hero Section */}
          <div className="w-full md:w-1/2">
            <div className="rounded-xl bg-gradient-to-br from-[#011d3f] to-[#022b5c] text-white overflow-hidden relative p-8 shadow-lg dark:shadow-[#43EB3E]/10">
              {/* Background glow overlay */}
              <div className="absolute inset-0 bg-[#43EB3E] opacity-5 mix-blend-overlay"></div>
              
              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-6">Why Choose OPIAN Rewards?</h2>
                <p className="text-lg text-gray-200 mb-8">
                  OPIAN Rewards is a premium rewards program designed to save you money
                  while providing exceptional customer service and support.
                </p>
                
                <div className="space-y-6 mb-8">
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#022b5c] border border-[#43EB3E]/30 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#43EB3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-white">Earn Points on Everything</h3>
                      <p className="text-gray-300">Earn points on everyday purchases and bill payments</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#022b5c] border border-[#43EB3E]/30 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#43EB3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-white">Exclusive Discounts</h3>
                      <p className="text-gray-300">Access member-only deals and special offers</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#022b5c] border border-[#43EB3E]/30 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#43EB3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-white">Personalized Support</h3>
                      <p className="text-gray-300">Get personalized help at your fingertips</p>
                    </div>
                  </div>
                  
                  <div className="flex items-start">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#022b5c] border border-[#43EB3E]/30 flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#43EB3E]" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <div className="ml-4">
                      <h3 className="text-lg font-semibold text-white">Flexible Redemption</h3>
                      <p className="text-gray-300">Multiple ways to redeem your rewards</p>
                    </div>
                  </div>
                </div>
                
                <div className="p-4 bg-[#01162f]/60 rounded-lg backdrop-blur-sm">
                  <p className="text-gray-200">
                    Contact us today to learn more about how OPIAN Rewards can help you
                    maximize your savings and enhance your customer experience.
                  </p>
                </div>
              </div>
              
              {/* Animated particles */}
              <div className="absolute top-0 left-0 w-full h-full">
                <div className="absolute top-[15%] left-[10%] w-2 h-2 rounded-full bg-[#43EB3E] opacity-40 animate-pulse"></div>
                <div className="absolute top-[65%] left-[20%] w-1.5 h-1.5 rounded-full bg-[#43EB3E] opacity-30 animate-pulse delay-300"></div>
                <div className="absolute top-[35%] right-[15%] w-2 h-2 rounded-full bg-[#43EB3E] opacity-40 animate-pulse delay-100"></div>
                <div className="absolute bottom-[25%] right-[25%] w-1.5 h-1.5 rounded-full bg-[#43EB3E] opacity-30 animate-pulse delay-500"></div>
                <div className="absolute bottom-[10%] left-[15%] w-1 h-1 rounded-full bg-[#43EB3E] opacity-40 animate-pulse delay-700"></div>
                <div className="absolute top-[45%] right-[10%] w-1 h-1 rounded-full bg-[#43EB3E] opacity-30 animate-pulse delay-200"></div>
              </div>
            </div>
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