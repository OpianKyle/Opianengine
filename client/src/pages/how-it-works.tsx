import { useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Loader2, CheckCircle2, Users, CreditCard, Upload, ShoppingCart, BarChart2, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/providers/theme-provider";

export default function HowItWorksPage() {
  const { user, isLoading } = useUser();
  const { theme } = useTheme();
  const [, navigate] = useLocation();
  
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
            <nav className="hidden md:flex space-x-8">
              <a href="/" className="text-foreground dark:text-white hover:text-[#43EB3E] transition-colors">Home</a>
              <a href="/how-it-works" className="text-[#43EB3E] font-medium">How It Works</a>
            </nav>
            
            {/* Desktop buttons */}
            <div className="hidden md:flex items-center space-x-4">
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
                    onClick={() => navigate("/register")}
                    className="bg-[#43EB3E] hover:bg-[#3ad036] text-black font-medium"
                  >
                    Sign Up
                  </Button>
                </>
              )}
            </div>
            
            {/* Mobile buttons */}
            <div className="flex md:hidden items-center space-x-3">
              <ThemeToggle />
              <Button 
                variant="ghost" 
                size="sm"
                className="ml-auto text-[#43EB3E] p-1"
                onClick={() => navigate("/")}
              >
                Menu
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-white dark:bg-[#01162f] text-foreground dark:text-white py-16 px-4">
        <div className="container mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-8">How It Works</h1>
          <p className="text-xl max-w-3xl mx-auto mb-12 text-[rgb(8,42,90)] dark:text-white">
            Getting started with Opian Rewards is simple. Follow these steps to start earning rewards on your everyday purchases.
          </p>
        </div>
      </section>

      {/* Steps Section */}
      <section className="py-16 bg-gray-50 dark:bg-[#022b5c]">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div 
                key={step.number}
                className="bg-white dark:bg-[#01162f] rounded-lg shadow-lg p-8 relative overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-xl"
              >
                <div className="absolute top-0 right-0 w-16 h-16 bg-[#43EB3E] bg-opacity-20 rounded-bl-full flex items-start justify-end p-2">
                  <span className="text-xl font-bold text-[#43EB3E]">{step.number}</span>
                </div>
                <div className="text-center">
                  {step.icon}
                  <h3 className="text-xl font-bold mb-4 text-foreground dark:text-white">{step.title}</h3>
                  <p className="text-[rgb(8,42,90)] dark:text-gray-300">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-white dark:bg-[#01162f] text-center">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground dark:text-white">
            Join Opian Rewards for Exclusive Benefits and Savings!
          </h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto text-[rgb(8,42,90)] dark:text-white">
            Are you ready to experience rewards like never before?
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button 
              onClick={() => navigate("/register")}
              className="bg-[#43EB3E] hover:bg-[#3ad036] text-black text-lg py-6 px-8 rounded-md"
              size="lg"
            >
              Sign Up Now
              <ArrowUpRight className="ml-2 h-5 w-5" />
            </Button>
            <Button 
              onClick={() => navigate("/login")}
              variant="outline" 
              className="border-foreground dark:border-white text-foreground dark:text-white hover:bg-foreground/10 dark:hover:bg-white/10 text-lg py-6 px-8 rounded-md"
              size="lg"
            >
              Sign In
            </Button>
          </div>
          <div className="mt-12">
            <a href="#" className="text-[#43EB3E] hover:underline text-lg font-medium">
              More Information
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
          
          <div className="flex flex-col lg:flex-row justify-between mb-8">
            {/* Left column - Contact Information */}
            <div className="lg:w-1/4 mb-8 lg:mb-0">
              <h3 className="font-semibold mb-4">Contact Information</h3>
              <p className="flex items-center mb-2">
                <span className="h-4 w-4 mr-2 flex-shrink-0">📞</span>
                <a href="tel:+27861263346" className="hover:text-[#43EB3E] transition-colors">+27 86 126 3346</a>
              </p>
              <p className="flex items-center mb-2">
                <span className="h-4 w-4 mr-2 flex-shrink-0">✉️</span>
                <a href="mailto:info@opianrewards.com" className="hover:text-[#43EB3E] transition-colors">info@opianrewards.com</a>
              </p>
              <p className="flex items-start">
                <span className="h-4 w-4 mr-2 mt-1 flex-shrink-0">📍</span>
                <span>260 Uys Krige Dr, Loevenstein, Cape Town, 7530, South Africa</span>
              </p>
            </div>
            
            {/* Middle columns - Package/Resources/Legal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 lg:w-2/4">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">Packages</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Opportunity</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Momentum</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Prosper</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Prestige</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Pinnacle</a></li>
                </ul>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">Resources</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Help Center</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">FAQs</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Blog</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Contact</a></li>
                </ul>
              </div>
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-4">Legal</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Cookie Policy</a></li>
                </ul>
              </div>
            </div>
            
            {/* Right column - Legal Information */}
            <div className="lg:w-1/4">
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