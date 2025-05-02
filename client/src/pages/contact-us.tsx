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
          {/* Left side - Contact Form */}
          <div className="w-full md:w-1/2">
            <Card className="border-[#43EB3E] border-t-4">
              <CardHeader>
                <CardTitle className="text-2xl font-bold">Contact Us</CardTitle>
                <CardDescription>
                  Let us know you're interested and we'll get back to you
                </CardDescription>
              </CardHeader>

              <CardContent>
                <Form {...contactForm}>
                  <form
                    onSubmit={contactForm.handleSubmit(onContactSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={contactForm.control}
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
                      control={contactForm.control}
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
                      control={contactForm.control}
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
                      control={contactForm.control}
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
                      control={contactForm.control}
                      name="message"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Message (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Tell us what you're interested in"
                              className="min-h-[100px]"
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
                        "Submit"
                      )}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Right side - Hero Section */}
          <div className="w-full md:w-1/2 bg-[#011d3f] text-white rounded-lg overflow-hidden relative p-8">
            <div className="relative z-10">
              <h2 className="text-3xl font-bold mb-4">Why Choose OPIAN Rewards?</h2>
              <p className="mb-6">
                OPIAN Rewards is a premium rewards program designed to save you money
                while providing exceptional customer service and support.
              </p>
              
              <h3 className="text-xl font-semibold mb-2">Our Benefits:</h3>
              <ul className="space-y-2 mb-6">
                <li className="flex items-start">
                  <span className="text-[#43EB3E] mr-2">✓</span>
                  <span>Earn points on everyday purchases</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#43EB3E] mr-2">✓</span>
                  <span>Exclusive member-only discounts</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#43EB3E] mr-2">✓</span>
                  <span>Personalized support at your fingertips</span>
                </li>
                <li className="flex items-start">
                  <span className="text-[#43EB3E] mr-2">✓</span>
                  <span>Flexible reward redemption options</span>
                </li>
              </ul>
              
              <p className="text-sm opacity-80">
                Contact us today to learn more about how OPIAN Rewards can help you
                maximize your savings and enhance your customer experience.
              </p>
            </div>
            
            {/* Particle effects */}
            <div className="absolute top-0 left-0 right-0 bottom-0 opacity-20">
              <div className="absolute top-[20%] left-[10%] w-2 h-2 rounded-full bg-[#43EB3E] animate-pulse"></div>
              <div className="absolute top-[50%] left-[20%] w-1.5 h-1.5 rounded-full bg-[#43EB3E] opacity-75 animate-pulse delay-300"></div>
              <div className="absolute top-[80%] left-[15%] w-1 h-1 rounded-full bg-[#43EB3E] opacity-50 animate-pulse delay-700"></div>
              <div className="absolute top-[30%] right-[10%] w-2 h-2 rounded-full bg-[#43EB3E] animate-pulse delay-100"></div>
              <div className="absolute top-[70%] right-[20%] w-1.5 h-1.5 rounded-full bg-[#43EB3E] opacity-60 animate-pulse delay-500"></div>
              <div className="absolute bottom-[10%] right-[30%] w-1 h-1 rounded-full bg-[#43EB3E] opacity-40 animate-pulse delay-200"></div>
            </div>
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