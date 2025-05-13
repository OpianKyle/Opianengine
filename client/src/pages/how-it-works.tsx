import { useEffect, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, Users, CreditCard, Upload, ShoppingCart, BarChart2, ArrowUpRight, Phone, Mail, MapPin, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/providers/theme-provider";
import MetaTags from "@/components/seo/meta-tags";
import { StructuredData } from "@/components/seo/structured-data";

export default function HowItWorksPage() {
  const { user, isLoading } = useUser();
  const { theme } = useTheme();
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  useEffect(() => {
    // Scroll to top on mount
    window.scrollTo(0, 0);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const steps = [
    {
      number: 1,
      title: "Complete Signup Form",
      description: "After you complete and send the sign-up form, an agent will call you to explain the benefits of the product.",
      icon: <CheckCircle2 className="h-12 w-12 mb-4 text-[#43EB3E]" />
    },
    {
      number: 2,
      title: "Select your Product",
      description: "We offer 5 Rewards Products with increasing lifestyle benefits, offering great value for your money.",
      icon: <Users className="h-12 w-12 mb-4 text-[#43EB3E]" />
    },
    {
      number: 3,
      title: "Activate your Card",
      description: "You will receive your rewards card in your hands via courier. Our customer service agent will call you to help activate your card.",
      icon: <CreditCard className="h-12 w-12 mb-4 text-[#43EB3E]" />
    },
    {
      number: 4,
      title: "Load your Card",
      description: "Deposit, EFT or Transfer your monthly spending money into your brand new Opian Rewards Card!",
      icon: <Upload className="h-12 w-12 mb-4 text-[#43EB3E]" />
    },
    {
      number: 5,
      title: "Earn while you spend!",
      description: "Earn Rewards points at merchants for swiping tapping or paying for your items at checkout points. If you have an existing card for a particular merchant, swipe both cards to Earn Double Rewards Points!",
      icon: <ShoppingCart className="h-12 w-12 mb-4 text-[#43EB3E]" />
    },
    {
      number: 6,
      title: "Engage to Increase Rewards",
      description: "Our financial partners will contact you over time to offer you their products or comparative quotes on Life Insurance, Funeral Cover, Retirement and Investment plans and Car & Household Insurance. Should you choose to engage with any of them your Rewards points will increase and you will Earn extra money!",
      icon: <BarChart2 className="h-12 w-12 mb-4 text-[#43EB3E]" />
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* SEO Optimization */}
      <MetaTags 
        title="How It Works - Getting Started with Opian Rewards"
        description="Learn how to get started with Opian Rewards in 6 simple steps. Complete your signup, activate your card, and start earning rewards today!"
        ogType="article"
      />
      
      <StructuredData 
        type="HowTo"
        data={{
          name: "How to Get Started with Opian Rewards",
          description: "Follow these steps to join Opian Rewards program and start enjoying benefits",
          totalTime: "PT30M", // ISO 8601 duration format - 30 minutes
          step: [
            {
              "@type": "HowToStep",
              name: "Complete Signup Form",
              text: "After you complete and send the sign-up form, an agent will call you to explain the benefits of the product."
            },
            {
              "@type": "HowToStep",
              name: "Select your Product",
              text: "We offer 5 Rewards Products with increasing lifestyle benefits, offering great value for your money."
            },
            {
              "@type": "HowToStep",
              name: "Activate your Card",
              text: "You will receive your rewards card via courier. Our customer service agent will call you to help activate your card."
            },
            {
              "@type": "HowToStep",
              name: "Load your Card",
              text: "Deposit, EFT or Transfer your monthly spending money into your brand new Opian Rewards Card."
            }
          ]
        }}
      />
      
      {/* Navigation */}
      <header className="bg-white dark:bg-[#01162f] text-foreground dark:text-white sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <img
                src={theme === 'dark' ? '/opian-logo-white.png' : '/opian-rewards-logo(R).png'}
                alt="OPIAN Rewards"
                className="h-8 sm:h-10 w-auto cursor-pointer"
                onClick={() => navigate("/")}
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.onerror = null;
                  img.src = '/logo-fallback.png';
                }}
              />
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden lg:flex space-x-8">
              <a href="/" className="text-foreground dark:text-white hover:text-[#43EB3E] transition-colors">Home</a>
              <a href="/how-it-works" className="text-[#43EB3E] font-medium">How It Works</a>
              <a href="/meet-the-team" className="text-foreground dark:text-white hover:text-[#43EB3E] transition-colors">Meet The Team</a>
              <a href="#" className="text-foreground dark:text-white hover:text-[#43EB3E] transition-colors">FAQ</a>
            </nav>
            
            {/* Desktop buttons */}
            <div className="hidden lg:flex items-center space-x-4">
              <ThemeToggle />
              {user ? (
                <Button 
                  onClick={() => navigate(user.is_admin ? "/admin" : "/dashboard")}
                  className="bg-[#43EB3E] hover:bg-[#3ad036] text-black font-medium"
                >
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button 
                    variant="outline" 
                    className="bg-transparent border border-[#43EB3E] text-[#43EB3E] hover:bg-[#43EB3E] hover:text-black transition-all duration-300"
                    onClick={() => navigate("/login")}
                  >
                    Login
                  </Button>
                  <Button 
                    onClick={() => navigate("/contact-us")}
                    className="bg-[#43EB3E] hover:bg-[#3ad036] text-black font-medium"
                  >
                    Get Information
                  </Button>
                </>
              )}
            </div>
            
            {/* Mobile buttons */}
            <div className="flex lg:hidden items-center space-x-3">
              <ThemeToggle />
              <Button 
                variant="ghost" 
                size="sm"
                className="ml-auto text-[#43EB3E] p-1"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
              </Button>
            </div>
          </div>
          
          {/* Mobile Navigation - Dropdown */}
          {mobileMenuOpen && (
            <div className="lg:hidden py-4 px-2 space-y-3 bg-white dark:bg-[#01162f] border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-top">
              <nav className="flex flex-col space-y-3">
                <a 
                  href="/" 
                  className="text-foreground dark:text-white hover:text-[#43EB3E] px-2 py-1.5 rounded-md hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </a>
                <a 
                  href="/how-it-works" 
                  className="text-[#43EB3E] px-2 py-1.5 rounded-md hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  How It Works
                </a>
                <a 
                  href="/meet-the-team" 
                  className="text-foreground dark:text-white hover:text-[#43EB3E] px-2 py-1.5 rounded-md hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Meet The Team
                </a>
                <a 
                  href="#" 
                  className="text-foreground dark:text-white hover:text-[#43EB3E] px-2 py-1.5 rounded-md hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  FAQ
                </a>
              </nav>
              
              <div className="flex space-x-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <Button 
                  variant="outline" 
                  className="flex-1 bg-transparent border border-[#43EB3E] text-[#43EB3E] hover:bg-[#43EB3E] hover:text-black transition-all duration-300"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/login");
                  }}
                >
                  Login
                </Button>
                <Button 
                  className="flex-1 bg-[#43EB3E] hover:bg-[#3ad036] text-black font-medium"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    navigate("/contact-us");
                  }}
                >
                  Get Information
                </Button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Hero Section with background details */}
      <section className="relative bg-white dark:bg-[#01162f] text-foreground dark:text-white py-16 px-4 overflow-hidden">
        {/* Decorative elements - light mode */}
        <div className="absolute inset-0 overflow-hidden dark:opacity-0">
          {/* Top left circle */}
          <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-[#43EB3E]/5"></div>
          
          {/* Top right pattern */}
          <div className="absolute top-10 right-10 grid grid-cols-3 gap-2 opacity-10">
            <div className="w-2 h-2 rounded-full bg-[#43EB3E]"></div>
            <div className="w-2 h-2 rounded-full bg-[#43EB3E]"></div>
            <div className="w-2 h-2 rounded-full bg-[#43EB3E]"></div>
            <div className="w-2 h-2 rounded-full bg-[#43EB3E]"></div>
            <div className="w-2 h-2 rounded-full bg-[#43EB3E]"></div>
            <div className="w-2 h-2 rounded-full bg-[#43EB3E]"></div>
            <div className="w-2 h-2 rounded-full bg-[#43EB3E]"></div>
            <div className="w-2 h-2 rounded-full bg-[#43EB3E]"></div>
            <div className="w-2 h-2 rounded-full bg-[#43EB3E]"></div>
          </div>
          
          {/* Bottom wave */}
          <div className="absolute bottom-0 left-0 right-0 h-20 bg-[#43EB3E]/5 rounded-t-[100%]"></div>
          
          {/* Scattered green dots */}
          <div className="absolute top-1/4 left-1/4 w-1 h-1 rounded-full bg-[#43EB3E]/20"></div>
          <div className="absolute top-1/3 right-1/3 w-1.5 h-1.5 rounded-full bg-[#43EB3E]/20"></div>
          <div className="absolute bottom-1/4 right-1/4 w-1 h-1 rounded-full bg-[#43EB3E]/30"></div>
          <div className="absolute top-2/3 left-1/5 w-2 h-2 rounded-full bg-[#43EB3E]/10"></div>
        </div>
        
        {/* Decorative elements - dark mode */}
        <div className="absolute inset-0 overflow-hidden opacity-0 dark:opacity-100">
          {/* Top right circles */}
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-[#043375]/30"></div>
          <div className="absolute top-10 right-10 w-20 h-20 rounded-full bg-[#043375]/20"></div>
          
          {/* Bottom left pattern */}
          <div className="absolute bottom-10 left-10 opacity-20">
            <div className="w-20 h-1 bg-[#43EB3E]/30 rounded mb-2"></div>
            <div className="w-12 h-1 bg-[#43EB3E]/30 rounded mb-2"></div>
            <div className="w-16 h-1 bg-[#43EB3E]/30 rounded"></div>
          </div>
          
          {/* Scattered green particles */}
          <div className="absolute top-1/4 left-1/3 w-1 h-1 rounded-full bg-[#43EB3E]/30"></div>
          <div className="absolute top-1/2 right-1/4 w-1.5 h-1.5 rounded-full bg-[#43EB3E]/30"></div>
          <div className="absolute bottom-1/3 right-1/3 w-1 h-1 rounded-full bg-[#43EB3E]/30"></div>
          <div className="absolute top-3/4 left-1/4 w-2 h-2 rounded-full bg-[#43EB3E]/20"></div>
        </div>
        
        <div className="container mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">How It Works</h1>
          <p className="text-xl max-w-3xl mx-auto mb-12 text-[rgb(8,42,90)] dark:text-white">
            Getting started with Opian Rewards is simple. Follow these steps to start earning rewards on your everyday purchases.
          </p>
        </div>
      </section>

      {/* Steps Section with background details */}
      <section className="py-16 bg-gray-50 dark:bg-[#022b5c] relative overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Light mode decorations */}
          <div className="absolute -right-20 top-1/4 w-40 h-40 rounded-full bg-[#43EB3E]/5 dark:opacity-0"></div>
          <div className="absolute left-10 bottom-10 w-20 h-20 rounded-full bg-[#43EB3E]/5 dark:opacity-0"></div>
          
          {/* Connected dots pattern - light mode */}
          <div className="absolute left-0 top-1/3 dark:opacity-0">
            <div className="relative w-full h-0.5 bg-[#43EB3E]/10">
              <div className="absolute -top-1.5 left-10 w-3 h-3 rounded-full bg-[#43EB3E]/20"></div>
              <div className="absolute -top-1 left-[150px] w-2 h-2 rounded-full bg-[#43EB3E]/20"></div>
              <div className="absolute -top-1.5 left-[250px] w-3 h-3 rounded-full bg-[#43EB3E]/20"></div>
              <div className="absolute -top-1 left-[400px] w-2 h-2 rounded-full bg-[#43EB3E]/20"></div>
            </div>
          </div>
          
          {/* Dark mode decorations */}
          <div className="absolute -left-10 top-10 w-40 h-40 rounded-full bg-[#043375]/20 opacity-0 dark:opacity-100"></div>
          
          {/* Scattered small elements - dark mode */}
          <div className="opacity-0 dark:opacity-100">
            <div className="absolute top-20 right-20 w-4 h-4 rounded-full bg-[#43EB3E]/10"></div>
            <div className="absolute bottom-40 right-1/4 w-6 h-1 rounded bg-[#43EB3E]/10"></div>
            <div className="absolute top-1/2 left-1/4 w-1 h-6 rounded bg-[#43EB3E]/10"></div>
          </div>
        </div>
        
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div 
                key={step.number}
                className="bg-white dark:bg-[#01162f] rounded-lg shadow-lg p-8 relative overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                {/* Background details inside each card */}
                <div className="absolute -bottom-6 -right-6 w-20 h-20 rounded-full bg-[#43EB3E]/5 dark:bg-[#043375]/20"></div>
                <div className="absolute top-1/2 left-3 w-1 h-10 bg-[#43EB3E]/10 dark:bg-[#43EB3E]/5 rounded"></div>
                
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#43EB3E] bg-opacity-20 rounded-bl-full flex items-start justify-end p-2 z-10">
                  <span className="text-xl font-bold text-[#43EB3E]">{step.number}</span>
                </div>
                <div className="text-center relative z-10">
                  {step.icon}
                  <h3 className="text-xl font-bold mb-4 text-foreground dark:text-white">{step.title}</h3>
                  <p className="text-[rgb(8,42,90)] dark:text-gray-300">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section with decorative background */}
      <section className="py-16 bg-white dark:bg-[#01162f] text-center relative overflow-hidden">
        {/* Decorative particles */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Light mode decorations */}
          <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-r from-[#43EB3E]/5 to-transparent dark:opacity-0"></div>
          <div className="absolute bottom-0 right-0 w-full h-20 bg-gradient-to-l from-[#43EB3E]/5 to-transparent dark:opacity-0"></div>
          
          {/* Floating green particles - light mode */}
          <div className="dark:opacity-0">
            <div className="absolute top-10 left-[10%] w-3 h-3 rounded-full bg-[#43EB3E]/10 animate-float-slow"></div>
            <div className="absolute top-[30%] right-[15%] w-2 h-2 rounded-full bg-[#43EB3E]/20 animate-float-medium"></div>
            <div className="absolute bottom-[20%] left-[20%] w-4 h-4 rounded-full bg-[#43EB3E]/10 animate-float-slow"></div>
            <div className="absolute bottom-[40%] right-[30%] w-2 h-2 rounded-full bg-[#43EB3E]/15 animate-float-fast"></div>
          </div>
          
          {/* Dark mode decorations */}
          <div className="opacity-0 dark:opacity-100">
            <div className="absolute -top-20 -left-20 w-60 h-60 rounded-full bg-[#043375]/20"></div>
            <div className="absolute -bottom-30 -right-20 w-80 h-80 rounded-full bg-[#043375]/10"></div>
            
            {/* Accent lines */}
            <div className="absolute top-[30%] left-0 w-40 h-0.5 bg-gradient-to-r from-[#43EB3E]/20 to-transparent"></div>
            <div className="absolute bottom-[35%] right-0 w-40 h-0.5 bg-gradient-to-l from-[#43EB3E]/20 to-transparent"></div>
            
            {/* Floating particles - dark mode */}
            <div className="absolute top-20 right-[25%] w-1.5 h-1.5 rounded-full bg-[#43EB3E]/30 animate-float-medium"></div>
            <div className="absolute bottom-20 left-[35%] w-2 h-2 rounded-full bg-[#43EB3E]/20 animate-float-slow"></div>
            <div className="absolute top-[40%] right-[40%] w-1 h-1 rounded-full bg-[#43EB3E]/30 animate-float-fast"></div>
          </div>
        </div>
        
        {/* Main content with relative position to appear above decorations */}
        <div className="container mx-auto px-4 relative z-10">
          <div className="relative">
            {/* Subtle accent for the heading - light mode */}
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 w-40 h-0.5 bg-[#43EB3E]/10 dark:opacity-0"></div>
            
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground dark:text-white relative">
              Join Opian Rewards for Exclusive Benefits and Savings!
            </h2>
            <p className="text-xl mb-8 max-w-3xl mx-auto text-[rgb(8,42,90)] dark:text-white">
              Are you ready to experience rewards like never before?
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4 relative">
            {/* Green glow effect behind the primary button */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-[#43EB3E]/5 rounded-full filter blur-xl opacity-70 dark:opacity-30"></div>
            
            <Button 
              onClick={() => navigate("/contact-us")}
              className="bg-[#43EB3E] hover:bg-[#3ad036] text-black text-lg py-6 px-8 rounded-md relative z-10"
              size="lg"
            >
              More Information
              <ArrowUpRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              onClick={() => navigate("/login")}
              variant="outline" 
              className="border-foreground dark:border-white text-foreground dark:text-white hover:bg-foreground/10 dark:hover:bg-white/10 text-lg py-6 px-8 rounded-md relative z-10"
              size="lg"
            >
              Sign In
            </Button>
          </div>
          
          <div className="mt-12 relative">
            {/* Subtle line under the more info link */}
            <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-40 h-0.5 bg-gradient-to-r from-transparent via-[#43EB3E]/20 to-transparent"></div>
            
            <a href="/contact-us" className="text-[#43EB3E] hover:underline text-lg font-medium relative inline-block">
              Contact Us
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-[#01162f] text-gray-600 dark:text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-start mb-8">
            <img 
              src={theme === 'dark' ? '/opian-logo-white.png' : '/opian-rewards-logo(R).png'}
              alt="OPIAN Rewards" 
              className="h-10 w-auto"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.onerror = null;
                img.src = '/logo-fallback.png';
              }}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8">
            {/* Left column - Contact Information */}
            <div className="md:col-span-2 lg:col-span-1">
              <h3 className="font-semibold mb-4">Contact Information</h3>
              <p className="flex items-center mb-2">
                <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                <a href="tel:+27861263346" className="hover:text-[#43EB3E] transition-colors">+27 86 126 3346</a>
              </p>
              <p className="flex items-center mb-2">
                <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                <a href="mailto:info@opianrewards.com" className="hover:text-[#43EB3E] transition-colors">info@opianrewards.com</a>
              </p>
              <p className="flex items-start">
                <MapPin className="h-4 w-4 mr-2 mt-1 flex-shrink-0" />
                <span>260 Uys Krige Dr, Loevenstein, Cape Town, 7530, South Africa</span>
              </p>
            </div>
            
            {/* Middle columns - Package/Resources/Legal */}
            <div className="lg:col-span-2 grid grid-cols-3 gap-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Packages</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Opportunity</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Momentum</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Prosper</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Prestige</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Pinnacle</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Resources</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Help Center</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">FAQs</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Blog</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Contact</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Legal</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Cookie Policy</a></li>
                </ul>
              </div>
            </div>
            
            {/* Right column - Legal Information */}
            <div className="md:col-span-2 lg:col-span-1">
              <h3 className="font-semibold mb-4">Legal Information</h3>
              <p className="mb-2 text-sm">Opian Rewards (Pty) Ltd is a Juristic Representative of Opian Financial Services (Pty) Ltd</p>
              <p className="mb-2 text-sm">Company Registration Number: 2021/411623/07</p>
              <p className="mb-2 text-sm">Opian Financial Services (Pty) Ltd is an Authorised Financial Services Provider</p>
              <p className="mb-2 text-sm">Company Registration Number: 2018/584168/07</p>
              <p className="text-sm">FSP No: 50974</p>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-800 pt-6 text-center text-gray-500 dark:text-gray-400">
            <p>&copy; {new Date().getFullYear()} OPIAN Rewards. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}