import { useEffect, useCallback, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Loader2, CheckCircle, ArrowRight, CreditCard, Users, Gift, ArrowUpRight, ShoppingCart, Receipt, BarChart2, ChevronLeft, ChevronRight, X, Menu, Phone, Mail, MapPin } from "lucide-react";
import useEmblaCarousel from 'embla-carousel-react';
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from "@/components/theme-toggle";
import { useTheme } from "@/providers/theme-provider";

// Package prices in ZAR
const PACKAGE_PRICES = {
  OPPORTUNITY: 350,
  MOMENTUM: 450,
  PROSPER: 550,
  PRESTIGE: 695,
  PINNACLE: 825
};

// All features from Pinnacle package
const ALL_FEATURES = [
  { name: 'Activation Points', values: {
      OPPORTUNITY: '2,500',
      MOMENTUM: '5,000',
      PROSPER: '7,500',
      PRESTIGE: '10,000',
      PINNACLE: '12,500'
    }
  },
  { name: 'Funeral Cover', values: {
      OPPORTUNITY: false,
      MOMENTUM: 'R5,000',
      PROSPER: 'R10,000',
      PRESTIGE: 'R15,000',
      PINNACLE: 'R20,000'
    }
  },
  { name: 'Accidental Death Cover', values: {
      OPPORTUNITY: false,
      MOMENTUM: false,
      PROSPER: 'R20,000',
      PRESTIGE: 'R50,000',
      PINNACLE: 'R100,000'
    }
  },
  { name: 'Funeral Assist', values: {
      OPPORTUNITY: false,
      MOMENTUM: true,
      PROSPER: true,
      PRESTIGE: true,
      PINNACLE: true
    }
  },
  { name: 'Family Income Benefit', values: {
      OPPORTUNITY: false,
      MOMENTUM: false,
      PROSPER: 'R5,000 x6',
      PRESTIGE: 'R5,000 x6',
      PINNACLE: 'R5,000 x6'
    }
  },
  { name: 'EMS Assist', values: {
      OPPORTUNITY: true,
      MOMENTUM: true,
      PROSPER: true,
      PRESTIGE: true,
      PINNACLE: true
    }
  },
  { name: 'Legal Assist', values: {
      OPPORTUNITY: true,
      MOMENTUM: true,
      PROSPER: true,
      PRESTIGE: true,
      PINNACLE: true
    }
  },
  { name: 'Lawyer Assist', values: {
      OPPORTUNITY: false,
      MOMENTUM: false,
      PROSPER: false,
      PRESTIGE: false,
      PINNACLE: true
    }
  },
  { name: 'Repatriation Cover', values: {
      OPPORTUNITY: true,
      MOMENTUM: true,
      PROSPER: true,
      PRESTIGE: true,
      PINNACLE: true
    }
  },
  { name: 'Celebrate Life', values: {
      OPPORTUNITY: true,
      MOMENTUM: true,
      PROSPER: true,
      PRESTIGE: true,
      PINNACLE: true
    }
  },
  { name: '24/7 Nurse On-Call', values: {
      OPPORTUNITY: true,
      MOMENTUM: true,
      PROSPER: true,
      PRESTIGE: true,
      PINNACLE: true
    }
  },
  { name: 'Virtual GP Assistant', values: {
      OPPORTUNITY: false,
      MOMENTUM: false,
      PROSPER: true,
      PRESTIGE: true,
      PINNACLE: true
    }
  },
  { name: 'Medical Second Opinion', values: {
      OPPORTUNITY: false,
      MOMENTUM: false,
      PROSPER: true,
      PRESTIGE: true,
      PINNACLE: true
    }
  },
  { name: 'Crime Victim Assist', values: {
      OPPORTUNITY: false,
      MOMENTUM: false,
      PROSPER: false,
      PRESTIGE: true,
      PINNACLE: true
    }
  },
  { name: 'Assault & Trauma Assist', values: {
      OPPORTUNITY: false,
      MOMENTUM: false,
      PROSPER: false,
      PRESTIGE: true,
      PINNACLE: true
    }
  },
  { name: 'Emergency Medical Services', values: {
      OPPORTUNITY: false,
      MOMENTUM: false,
      PROSPER: false,
      PRESTIGE: true,
      PINNACLE: true
    }
  }
];

// Legacy feature lists for compatibility with existing code
const PACKAGE_FEATURES = {
  OPPORTUNITY: ALL_FEATURES.map(feature => {
    const value = feature.values.OPPORTUNITY;
    if (typeof value === 'string') return `${feature.name}: ${value}`;
    if (value === true) return feature.name;
    return null;
  }).filter(Boolean),
  MOMENTUM: ALL_FEATURES.map(feature => {
    const value = feature.values.MOMENTUM;
    if (typeof value === 'string') return `${feature.name}: ${value}`;
    if (value === true) return feature.name;
    return null;
  }).filter(Boolean),
  PROSPER: ALL_FEATURES.map(feature => {
    const value = feature.values.PROSPER;
    if (typeof value === 'string') return `${feature.name}: ${value}`;
    if (value === true) return feature.name;
    return null;
  }).filter(Boolean),
  PRESTIGE: ALL_FEATURES.map(feature => {
    const value = feature.values.PRESTIGE;
    if (typeof value === 'string') return `${feature.name}: ${value}`;
    if (value === true) return feature.name;
    return null;
  }).filter(Boolean),
  PINNACLE: ALL_FEATURES.map(feature => {
    const value = feature.values.PINNACLE;
    if (typeof value === 'string') return `${feature.name}: ${value}`;
    if (value === true) return feature.name;
    return null;
  }).filter(Boolean)
};

// Package colors - using site theme colors
const PACKAGE_COLORS = {
  OPPORTUNITY: 'bg-[#01162f]',
  MOMENTUM: 'bg-[#022b5c]',
  PROSPER: 'bg-[#43EB3E]',
  PRESTIGE: 'bg-[#011d3d]',
  PINNACLE: 'bg-[#3ad036]'
};

// Steps and their background images
const STEPS = [
  {
    title: "Personalized Support",
    description: "Submit your details and one of our friendly Opian agents will reach out to guide you through the sign-up process.",
    backgroundImage: "/Personalized-Support-at-Your-Fingertips.jpg",
    fallbackColor: "#022b5c"
  },
  {
    title: "Earn Points Effortlessly",
    description: "Use your Opian card for everyday purchases and bill payments. Each transaction earns you reward points automatically.",
    backgroundImage: "/Opian-Earn-Points-Effortlessly.jpg",
    fallbackColor: "#01162f"
  },
  {
    title: "Stack Your Rewards",
    description: "Combine different rewards channels and watch your benefits multiply. The more you use your card, the more rewards you stack.",
    backgroundImage: "/Stack-Your-Rewards.jpg",
    fallbackColor: "#022b5c"
  },
  {
    title: "Join Opian Rewards Today",
    description: "Start your rewards journey now and transform how you shop, pay, and save. Join thousands of members already earning rewards.",
    backgroundImage: "/Join-Opian-Rewards-Today.jpg",
    fallbackColor: "#01162f"
  }
];

export default function HomePage() {
  const { user, isLoading } = useUser();
  const { theme } = useTheme();
  const [, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Carousel logic for How It Works section
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [currentStep, setCurrentStep] = useState(0);
  
  // Carousel logic for Products section on mobile
  const [productEmblaRef, productEmblaApi] = useEmblaCarousel({ 
    loop: true,
    align: 'center',
    containScroll: 'trimSnaps'
  });
  const [currentProduct, setCurrentProduct] = useState(0);
  const [showSwipeIndicator, setShowSwipeIndicator] = useState(true);
  
  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);
  
  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);
  
  const scrollProductPrev = useCallback(() => {
    if (productEmblaApi) {
      productEmblaApi.scrollPrev();
      setShowSwipeIndicator(false);
    }
  }, [productEmblaApi]);
  
  const scrollProductNext = useCallback(() => {
    if (productEmblaApi) {
      productEmblaApi.scrollNext();
      setShowSwipeIndicator(false);
    }
  }, [productEmblaApi]);
  
  useEffect(() => {
    if (emblaApi) {
      emblaApi.on('select', () => {
        setCurrentStep(emblaApi.selectedScrollSnap());
      });
      
      // Return cleanup function
      return () => {
        emblaApi.off('select', () => {});
      };
    }
  }, [emblaApi]);
  
  useEffect(() => {
    if (productEmblaApi) {
      // Track current product index
      const handleSelect = () => {
        setCurrentProduct(productEmblaApi.selectedScrollSnap());
      };
      
      // Hide swipe indicator on user interaction
      const handlePointerDown = () => {
        setShowSwipeIndicator(false);
      };
      
      // Hide swipe indicator when user scrolls
      const handleScroll = () => {
        setShowSwipeIndicator(false);
      };
      
      productEmblaApi.on('select', handleSelect);
      productEmblaApi.on('pointerDown', handlePointerDown);
      productEmblaApi.on('scroll', handleScroll);
      
      // Return cleanup function
      return () => {
        productEmblaApi.off('select', handleSelect);
        productEmblaApi.off('pointerDown', handlePointerDown);
        productEmblaApi.off('scroll', handleScroll);
      };
    }
  }, [productEmblaApi]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      navigate(`/register?ref=${ref}`);
    }
  }, [navigate]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    navigate(user.is_admin ? '/admin' : '/dashboard');
    return null;
  }

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
                className="h-8 sm:h-10 w-auto"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.onerror = null;
                  img.src = '/logo-fallback.png';
                }}
              />
            </div>
            
            {/* Desktop Navigation */}
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-foreground dark:text-white hover:text-[#43EB3E] transition-colors">Home</a>
              <a href="/how-it-works" className="text-foreground dark:text-white hover:text-[#43EB3E] transition-colors">How It Works</a>
              <a href="/meet-the-team" className="text-foreground dark:text-white hover:text-[#43EB3E] transition-colors">Meet The Team</a>
              <a href="#" className="text-foreground dark:text-white hover:text-[#43EB3E] transition-colors">FAQ</a>
            </nav>
            
            {/* Desktop buttons */}
            <div className="hidden md:flex items-center space-x-4">
              <ThemeToggle />
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
            </div>
            
            {/* Mobile buttons */}
            <div className="flex md:hidden items-center space-x-3">
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
            <div className="md:hidden py-4 px-2 space-y-3 bg-white dark:bg-[#01162f] border-t border-gray-100 dark:border-gray-800 animate-in slide-in-from-top">
              <nav className="flex flex-col space-y-3">
                <a 
                  href="#" 
                  className="text-foreground dark:text-white hover:text-[#43EB3E] px-2 py-1.5 rounded-md hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </a>
                <a 
                  href="/how-it-works" 
                  className="text-foreground dark:text-white hover:text-[#43EB3E] px-2 py-1.5 rounded-md hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors"
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

      {/* Hero Section */}
      <section className="bg-white dark:bg-[#01162f] text-foreground dark:text-white py-16 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 z-10">
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-foreground dark:text-white">
                The Card that Works for You
              </h1>
              <p className="text-lg mb-6 text-[rgb(8,42,90)] dark:text-white">
                Make your money go further with Opian Rewards. Earn Rewards when you purchase 
                and pay accounts with your Opian Rewards Card, and enhance your Rewards when 
                you make smart financial planning decisions. Reward yourself and effortlessly 
                put more money in your pocket by doing every day things with Opian Rewards.
              </p>
              <Button 
                onClick={() => navigate("/contact-us")}
                className="bg-[#43EB3E] hover:bg-[#3ad036] text-black text-lg py-6 px-8 rounded-md"
                size="lg"
              >
                More Information
              </Button>
            </div>
            <div className="lg:w-1/2 mt-10 lg:mt-0 flex justify-center lg:justify-end relative z-10">
              <div className="relative w-full max-w-lg overflow-hidden rounded-xl shadow-2xl">
                <video 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-full h-auto"
                  poster="/card-image.png"
                  onError={(e) => {
                    const video = e.target as HTMLVideoElement;
                    video.onerror = null;
                    // If video fails, we'll still show the poster image
                    video.style.display = 'none';
                    const img = document.createElement('img');
                    img.src = '/card-image.png';
                    img.className = 'w-full h-auto rounded-xl';
                    img.alt = 'OPIAN Rewards Card';
                    video.parentNode?.appendChild(img);
                  }}
                >
                  <source src="/Title.mp4" type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          </div>
        </div>
        {/* Background decorations with blue base and green overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-white dark:bg-[#01162f] z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[#43EB3E] mix-blend-overlay opacity-15 dark:opacity-15 z-0"></div>
        <div className="absolute top-0 right-0 w-2/3 h-full bg-gray-100 dark:bg-[#022b5c] transform skew-x-12 translate-x-1/3 z-0 opacity-50"></div>
        <div className="absolute top-0 right-0 w-2/3 h-full bg-[#43EB3E] transform skew-x-12 translate-x-1/3 mix-blend-overlay z-0 opacity-10 dark:opacity-20"></div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-20 relative overflow-hidden text-foreground dark:text-white">
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-foreground dark:text-white">
            What If Your Card Paid You Back?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-white dark:bg-[#022b5c] rounded-xl p-8 shadow-lg transform transition-transform hover:-translate-y-2 duration-300 border-t-4 border-[#43EB3E]">
              <div className="w-16 h-16 bg-gray-100 dark:bg-[#01162f] rounded-full flex items-center justify-center mb-6 shadow-md">
                <CreditCard className="h-8 w-8 text-[#43EB3E]" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-foreground dark:text-white">Cash Back on Everything</h3>
              <p className="text-[rgb(8,42,90)] dark:text-gray-300">
                Shopping, dining, paying bills—earn cash every time you swipe.
              </p>
            </div>
            
            <div className="bg-white dark:bg-[#022b5c] rounded-xl p-8 shadow-lg transform transition-transform hover:-translate-y-2 duration-300 border-t-4 border-[#43EB3E]">
              <div className="w-16 h-16 bg-gray-100 dark:bg-[#01162f] rounded-full flex items-center justify-center mb-6 shadow-md">
                <Gift className="h-8 w-8 text-[#43EB3E]" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-foreground dark:text-white">Build Your Own Reward Stack</h3>
              <p className="text-[rgb(8,42,90)] dark:text-gray-300">
                Combine the power of our Rewards System with your current rewards cards to create Double Rewards in your pocket!
              </p>
            </div>
            
            <div className="bg-white dark:bg-[#022b5c] rounded-xl p-8 shadow-lg transform transition-transform hover:-translate-y-2 duration-300 border-t-4 border-[#43EB3E]">
              <div className="w-16 h-16 bg-gray-100 dark:bg-[#01162f] rounded-full flex items-center justify-center mb-6 shadow-md">
                <Users className="h-8 w-8 text-[#43EB3E]" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-foreground dark:text-white">Make Your Money Work for You</h3>
              <p className="text-[rgb(8,42,90)] dark:text-gray-300">
                With the help of our Financial Partners, make smarter financial planning decisions to Save and Earn extra money!
              </p>
            </div>
          </div>
        </div>
        
        {/* Background decorations with blue base and green overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-white dark:bg-[#01162f] z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[#43EB3E] mix-blend-overlay opacity-5 dark:opacity-15 z-0"></div>
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-32 h-64 bg-gray-100 dark:bg-[#022b5c] rounded-r-full opacity-60 z-0"></div>
        <div className="absolute right-0 bottom-1/4 w-48 h-48 bg-[#43EB3E] rounded-full mix-blend-overlay opacity-10 z-0"></div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 relative overflow-hidden text-foreground dark:text-white">
        {/* Background for light/dark mode */}
        <div className="absolute top-0 left-0 w-full h-full bg-white dark:bg-[#01162f] z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[#43EB3E] mix-blend-overlay opacity-5 dark:opacity-15 z-0"></div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Left side - Text content */}
            <div className="w-full lg:w-1/2">
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-foreground dark:text-white">
                Simple Steps.<br/>Serious Rewards.
              </h2>
              <div className="text-lg text-[rgb(8,42,90)] dark:text-gray-300 space-y-6">
                <p>
                  Getting started with Opian Rewards is simple and empowering. Every step is designed to help you 
                  earn more and unlock greater benefits—just by doing what you already do.
                </p>
                <p>
                  Our process is straightforward and user-friendly, allowing you to quickly begin earning rewards 
                  on your everyday purchases and bill payments.
                </p>
                <p>
                  Start your journey today and discover how Opian Rewards can transform your financial life with 
                  just a few simple steps.
                </p>
                
                <div className="flex flex-col sm:flex-row gap-4 mt-8">
                  <Button 
                    onClick={() => navigate("/contact-us")}
                    className="bg-[#43EB3E] hover:bg-[#3ad036] text-black"
                    size="lg"
                  >
                    More Information
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    onClick={() => navigate("/how-it-works")}
                    variant="outline"
                    className="border-foreground dark:border-white text-foreground dark:text-white hover:bg-foreground/10 dark:hover:bg-white/10"
                    size="lg"
                  >
                    Learn More
                    <ArrowUpRight className="ml-2 h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
            
            {/* Right side - Carousel */}
            <div className="w-full lg:w-1/2 relative mt-10 lg:mt-0">
              <div className="embla relative overflow-hidden rounded-xl shadow-xl">
                <div className="embla__viewport" ref={emblaRef}>
                  <div className="embla__container flex">
                    {STEPS.map((step, index) => (
                      <div key={index} className="embla__slide flex-[0_0_100%] min-w-0 relative">
                        {/* Background image using img tag */}
                        <img 
                          src={step.backgroundImage} 
                          alt={step.title}
                          className="absolute inset-0 w-full h-full object-cover rounded-xl z-0"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.onerror = null;
                            img.style.backgroundColor = step.fallbackColor;
                          }}
                        />
                        
                        {/* Gradient overlay for better text readability */}
                        <div className="absolute inset-0 bg-gradient-to-r from-[#01162f] to-transparent opacity-90 rounded-xl z-10"></div>
                        
                        {/* Content - centered with increased padding to avoid navigation buttons */}
                        <div className="relative h-[500px] flex flex-col justify-center px-24 py-10 z-20">
                          <h3 className="text-2xl font-bold mb-4 text-white">{step.title}</h3>
                          <p className="text-gray-300 text-lg max-w-md">
                            {step.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Navigation buttons */}
                <button 
                  className="absolute top-1/2 left-4 transform -translate-y-1/2 bg-[#01162f]/60 hover:bg-[#01162f] text-white rounded-full p-2 z-30 transition-all duration-200"
                  onClick={scrollPrev}
                >
                  <ChevronLeft className="h-8 w-8" />
                </button>
                <button 
                  className="absolute top-1/2 right-4 transform -translate-y-1/2 bg-[#01162f]/60 hover:bg-[#01162f] text-white rounded-full p-2 z-30 transition-all duration-200"
                  onClick={scrollNext}
                >
                  <ChevronRight className="h-8 w-8" />
                </button>
                
                {/* Indicators */}
                <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-2 z-30">
                  {STEPS.map((_, index) => (
                    <button
                      key={index}
                      className={`w-3 h-3 rounded-full transition-all duration-300 ${
                        currentStep === index ? 'bg-[#43EB3E] w-6' : 'bg-white/50 hover:bg-white/80'
                      }`}
                      onClick={() => emblaApi?.scrollTo(index)}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          {/* Earn Points section with heading+image on right, content on left */}
          <div className="mt-20 mb-16 mx-auto container">
            <div className="flex flex-col md:flex-row">
              {/* Left side - Image with heading overlay - exactly 50% width */}
              <div className="w-full md:w-1/2 md:order-0">
                <div className="relative h-full">
                  {/* Background image covering the entire left section */}
                  <div className="relative h-full min-h-[500px]">
                    <img 
                      src="/Opian-Earn-Points-Effortlessly.jpg" 
                      alt="Woman earning points with Opian Rewards Card" 
                      className="rounded-xl w-full h-full object-cover absolute inset-0"
                    />
                    {/* Gradient overlay to ensure text readability */}
                    <div className="absolute inset-0 bg-gradient-to-b from-[#01162f]/80 via-[#01162f]/40 to-[#01162f]/70 rounded-xl"></div>
                    
                    {/* Content positioned over the image */}
                    <div className="relative z-10 p-6 pt-10 flex flex-col h-full">
                      <h3 className="text-3xl font-bold mb-6 text-white mt-8">Earn Points Effortlessly</h3>
                      <p className="text-gray-100 mb-8 text-lg">
                        Opian Rewards is designed to make your financial life more rewarding
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right side - Content points - exactly 50% width */}
              <div className="w-full md:w-1/2 space-y-16 p-4 pl-8 md:order-1 flex flex-col justify-center">
                <div className="flex items-start w-full">
                  <div className="w-12 h-12 flex-shrink-0 bg-gray-100 dark:bg-[#043375] rounded-full flex items-center justify-center mr-4 shadow-md">
                    <ShoppingCart className="h-5 w-5 text-[#43EB3E]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-foreground dark:text-white text-lg mb-2">Shop Your Way</h4>
                    <p className="text-[rgb(8,42,90)] dark:text-gray-300 text-base">
                      Use your Opian Rewards Card for everyday purchases—from groceries to online shopping—and watch the points pile up!
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start w-full">
                  <div className="w-12 h-12 flex-shrink-0 bg-gray-100 dark:bg-[#043375] rounded-full flex items-center justify-center mr-4 shadow-md">
                    <Receipt className="h-5 w-5 text-[#43EB3E]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-foreground dark:text-white text-lg mb-2">Pay Your Accounts</h4>
                    <p className="text-[rgb(8,42,90)] dark:text-gray-300 text-base">
                      Simplify your bill payments and earn rewards at the same time. Every time you pay a bill with your Opian Rewards Card, you strengthen your point balance.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start w-full">
                  <div className="w-12 h-12 flex-shrink-0 bg-gray-100 dark:bg-[#043375] rounded-full flex items-center justify-center mr-4 shadow-md">
                    <BarChart2 className="h-5 w-5 text-[#43EB3E]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-foreground dark:text-white text-lg mb-2">Plan for Success</h4>
                    <p className="text-[rgb(8,42,90)] dark:text-gray-300 text-base">
                      Engage in smart financial planning and decision-making—whether it's budgeting, saving, or investing. We believe in rewarding your financial savvy!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>



          <div className="mb-16 mt-20 relative group">
            {/* Particle effects scattered throughout */}
            <div className="w-2 h-2 absolute top-[10%] right-[15%] rounded-full bg-[#43EB3E] opacity-20 
                group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:opacity-30 transition-all duration-1000"></div>
            <div className="w-1 h-1 absolute top-[75%] left-[18%] rounded-full bg-[#43EB3E] opacity-30
                group-hover:translate-x-2 group-hover:translate-y-1 group-hover:opacity-40 transition-all duration-700"></div>
            <div className="w-1.5 h-1.5 absolute bottom-[30%] right-[22%] rounded-full bg-[#43EB3E] opacity-25
                group-hover:-translate-x-1 group-hover:translate-y-2 group-hover:opacity-35 transition-all duration-900"></div>
            <div className="w-1 h-1 absolute top-[15%] left-[25%] rounded-full bg-[#43EB3E] opacity-30
                group-hover:-translate-x-2 group-hover:translate-y-1 transition-all duration-[1200ms]"></div>
            <div className="w-1 h-1 absolute top-[40%] left-[80%] rounded-full bg-[#43EB3E] opacity-25
                group-hover:-translate-x-3 group-hover:translate-y-1 transition-all duration-[1100ms]"></div>
            <div className="w-1.5 h-1.5 absolute top-[65%] left-[35%] rounded-full bg-[#43EB3E] opacity-20
                group-hover:translate-x-2 group-hover:-translate-y-2 transition-all duration-[1300ms]"></div>
            
            {/* Left and right layout - full width */}
            <div className="container mx-auto px-4 flex flex-col md:flex-row items-center">
              {/* Left side - Content */}
              <div className="w-full md:w-3/5 md:pr-12 text-left">
                <h3 className="text-3xl font-bold mb-6 text-foreground dark:text-white">Personalized Support at Your Fingertips</h3>
                <p className="text-[rgb(8,42,90)] dark:text-gray-300 mb-4 w-full">
                  Ready to make the most out of your Opian Rewards Card? Complete our quick contact form, and an Opian Rewards agent will reach out to explain all the incredible benefits you can unlock.
                </p>
                <p className="text-[rgb(8,42,90)] dark:text-gray-300 mb-8 w-full">
                  Our team is dedicated to guiding you through every step of the way, providing insights and support through a series of calls and emails on how to maximize your rewards.
                </p>
              </div>
              
              {/* Right side - CTA */}
              <div className="w-full md:w-2/5 mt-8 md:mt-0 text-center">
                <div className="relative transform transition-all duration-300 hover:scale-105 group bg-opacity-20 bg-gray-100 dark:bg-[#043375] p-8 rounded-xl w-full">
                  {/* Green particle dots with hover animations specific to the right side */}
                  <div className="absolute top-[10%] right-[20%] w-1.5 h-1.5 rounded-full bg-[#43EB3E] opacity-30 
                      group-hover:translate-x-1 group-hover:-translate-y-2 transition-all duration-700"></div>
                  <div className="absolute bottom-[15%] left-[25%] w-1 h-1 rounded-full bg-[#43EB3E] opacity-25
                      group-hover:-translate-x-2 group-hover:translate-y-1 transition-all duration-900"></div>
                  <div className="absolute top-[40%] right-[30%] w-1 h-1 rounded-full bg-[#43EB3E] opacity-20
                      group-hover:translate-x-3 group-hover:translate-y-2 transition-all duration-800"></div>
                  
                  <h4 className="text-2xl font-bold text-[#43EB3E] mb-4 relative z-10 w-full">Join Opian Rewards Today!</h4>
                  <p className="text-foreground dark:text-white mb-8 relative z-10 w-full">
                    Don't miss out on making your everyday spending a source of cash rewards!
                  </p>
                  <Button
                    onClick={() => navigate("/contact-us")}
                    className="bg-[#43EB3E] hover:bg-[#3ad036] text-[#01162f] font-bold px-10 py-4 text-lg transform transition-all duration-300 hover:scale-105 hover:shadow-lg relative z-10 w-full md:w-auto"
                  >
                    More Information
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background decorations with light/dark mode support */}
        <div className="absolute top-0 left-0 w-full h-full bg-white dark:bg-[#01162f] z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[#43EB3E] mix-blend-overlay opacity-5 dark:opacity-15 z-0"></div>
        <div className="absolute right-0 top-1/4 w-64 h-64 bg-gray-100 dark:bg-[#022b5c] rounded-full opacity-50 z-0"></div>
        <div className="absolute left-0 bottom-1/4 w-32 h-32 bg-[#43EB3E] rounded-full mix-blend-overlay opacity-10 dark:opacity-20 z-0"></div>
      </section>

      {/* Package Section */}
      <section className="py-20 relative overflow-hidden text-foreground dark:text-white">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground dark:text-white">Unlock More, Earn More, Be More.</h2>
            <p className="text-lg text-[rgb(8,42,90)] dark:text-gray-300 max-w-3xl mx-auto">
              Choose the package that matches your ambitions. Each tier opens new possibilities 
              for rewards and benefits.
            </p>
          </div>

          {/* Desktop Grid View */}
          {/* Mobile Carousel View */}
          <div className="md:hidden">
            <div className="relative">
              <div className="overflow-hidden" ref={productEmblaRef}>
                {/* Swipe indicator with animation - only shown until user interacts */}
                {showSwipeIndicator && (
                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center items-center pointer-events-none z-20">
                    <div className="w-auto bg-black/70 text-white/90 px-3 py-1.5 rounded-full text-sm flex items-center animate-pulse">
                      <ChevronLeft className="h-4 w-4 mr-1 text-[#43EB3E] animate-bounce-x-reverse" />
                      <span>Swipe</span>
                      <ChevronRight className="h-4 w-4 ml-1 text-[#43EB3E] animate-bounce-x" />
                    </div>
                  </div>
                )}
                
                <div className="flex">
                
                  {Object.entries(PACKAGE_FEATURES).map(([packageName, features]) => (
                    <div key={`mobile-${packageName}`} className="flex-[0_0_90%] min-w-0 pl-4 first:pl-8 pr-4">
                      <Card 
                        className={`border-t-8 ${PACKAGE_COLORS[packageName as keyof typeof PACKAGE_COLORS]} overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-2 bg-[#01162f] text-white relative group flex flex-col h-[800px]`}
                      >
                        {/* Particle-like green shade overlay */}
                        <div className="absolute inset-0 bg-[#43EB3E] opacity-5 dark:opacity-10 mix-blend-overlay pointer-events-none z-0"></div>
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full bg-[#43EB3E] opacity-10 dark:opacity-15 mix-blend-overlay group-hover:opacity-20 dark:group-hover:opacity-25 transition-all duration-700"></div>
                        <div className="absolute bottom-0 left-0 w-16 h-16 rounded-tr-full bg-[#43EB3E] opacity-10 dark:opacity-15 mix-blend-overlay group-hover:opacity-20 dark:group-hover:opacity-25 transition-all duration-700"></div>
                        
                        {/* Small particles for animation */}
                        <div className="absolute top-[10%] right-[15%] w-2 h-2 rounded-full bg-[#43EB3E] opacity-20 
                            group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:opacity-30 transition-all duration-1000"></div>
                        <div className="absolute top-[75%] left-[18%] w-1 h-1 rounded-full bg-[#43EB3E] opacity-30
                            group-hover:translate-x-2 group-hover:translate-y-1 group-hover:opacity-40 transition-all duration-700"></div>
                        <div className="absolute bottom-[30%] right-[22%] w-1.5 h-1.5 rounded-full bg-[#43EB3E] opacity-25
                            group-hover:-translate-x-1 group-hover:translate-y-2 group-hover:opacity-35 transition-all duration-900"></div>
                        
                        <CardHeader className="pb-2 relative z-10">
                          <Badge variant="outline" className={`mb-2 font-semibold border-[#43EB3E] text-[#43EB3E]`}>
                            {packageName}
                          </Badge>
                          <CardTitle className="text-2xl font-bold text-white">R{PACKAGE_PRICES[packageName as keyof typeof PACKAGE_PRICES]}</CardTitle>
                          <CardDescription className="text-gray-300 font-medium">per month</CardDescription>
                        </CardHeader>
                        <CardContent className="pb-2 relative z-10 flex-grow overflow-y-auto max-h-[550px]">
                          <ul className="space-y-1.5">
                            {ALL_FEATURES.map((feature, index) => {
                              const value = feature.values[packageName as keyof typeof feature.values];
                              const isAvailable = value !== false;
                              return (
                                <li key={index} className="flex items-start">
                                  {isAvailable ? (
                                    <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5 text-[#43EB3E]" />
                                  ) : (
                                    <X className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5 text-red-500" />
                                  )}
                                  <span className={`text-xs font-medium ${isAvailable ? 'text-gray-200' : 'text-gray-500'}`}>
                                    {typeof value === 'string' ? `${feature.name}: ${value}` : feature.name}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </CardContent>
                        <CardFooter className="relative z-10 mt-auto">
                          <Button 
                            className="w-full bg-[#43EB3E] hover:bg-[#3ad036] text-black font-semibold"
                            onClick={() => navigate(`/contact-us?package=${packageName}`)}
                          >
                            More Information
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </CardFooter>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Navigation buttons and indicators */}
              <div className="flex justify-center items-center mt-6 space-x-4">
                <Button 
                  onClick={scrollProductPrev} 
                  variant="ghost" 
                  className="rounded-full bg-black/60 text-[#43EB3E] hover:bg-black/80 h-10 w-10 p-0"
                >
                  <ChevronLeft className="h-6 w-6" />
                </Button>
                
                <div className="flex space-x-2">
                  {Object.keys(PACKAGE_FEATURES).map((_, index) => (
                    <div 
                      key={`indicator-${index}`}
                      className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                        currentProduct === index ? 'bg-[#43EB3E]' : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  ))}
                </div>
                
                <Button 
                  onClick={scrollProductNext} 
                  variant="ghost" 
                  className="rounded-full bg-black/60 text-[#43EB3E] hover:bg-black/80 h-10 w-10 p-0"
                >
                  <ChevronRight className="h-6 w-6" />
                </Button>
              </div>

            </div>
          </div>
          
          {/* Desktop Grid View */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {Object.entries(PACKAGE_FEATURES).map(([packageName, features]) => (
              <Card 
                key={packageName} 
                className={`border-t-8 ${PACKAGE_COLORS[packageName as keyof typeof PACKAGE_COLORS]} overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-2 bg-[#01162f] text-white relative group flex flex-col h-[800px]`}
              >
                {/* Particle-like green shade overlay */}
                <div className="absolute inset-0 bg-[#43EB3E] opacity-5 dark:opacity-10 mix-blend-overlay pointer-events-none z-0"></div>
                <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full bg-[#43EB3E] opacity-10 dark:opacity-15 mix-blend-overlay group-hover:opacity-20 dark:group-hover:opacity-25 transition-all duration-700"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 rounded-tr-full bg-[#43EB3E] opacity-10 dark:opacity-15 mix-blend-overlay group-hover:opacity-20 dark:group-hover:opacity-25 transition-all duration-700"></div>
                
                {/* Small particle dots - first layer with hover animations */}
                <div className="absolute top-[10%] right-[15%] w-2 h-2 rounded-full bg-[#43EB3E] opacity-20 
                    group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:opacity-30 transition-all duration-1000"></div>
                <div className="absolute top-[75%] left-[18%] w-1 h-1 rounded-full bg-[#43EB3E] opacity-30
                    group-hover:translate-x-2 group-hover:translate-y-1 group-hover:opacity-40 transition-all duration-700"></div>
                <div className="absolute bottom-[30%] right-[22%] w-1.5 h-1.5 rounded-full bg-[#43EB3E] opacity-25
                    group-hover:-translate-x-1 group-hover:translate-y-2 group-hover:opacity-35 transition-all duration-900"></div>
                
                {/* More small particles - scattered throughout with animations */}
                <div className="absolute top-[5%] left-[10%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-40
                    group-hover:translate-x-1 group-hover:translate-y-1 transition-all duration-[800ms]"></div>
                <div className="absolute top-[15%] left-[25%] w-1 h-1 rounded-full bg-[#43EB3E] opacity-30
                    group-hover:-translate-x-2 group-hover:translate-y-1 transition-all duration-[1200ms]"></div>
                <div className="absolute top-[25%] left-[40%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-35
                    group-hover:translate-x-3 group-hover:-translate-y-2 transition-all duration-[900ms]"></div>
                <div className="absolute top-[30%] left-[65%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-40
                    group-hover:-translate-x-2 group-hover:-translate-y-2 transition-all duration-[1000ms]"></div>
                <div className="absolute top-[40%] left-[80%] w-1 h-1 rounded-full bg-[#43EB3E] opacity-25
                    group-hover:-translate-x-3 group-hover:translate-y-1 transition-all duration-[1100ms]"></div>
                <div className="absolute top-[50%] left-[20%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-40
                    group-hover:translate-x-2 group-hover:translate-y-2 transition-all duration-[950ms]"></div>
                <div className="absolute top-[55%] left-[50%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-35
                    group-hover:-translate-x-1 group-hover:-translate-y-1 transition-all duration-[850ms]"></div>
                <div className="absolute top-[65%] left-[35%] w-1.5 h-1.5 rounded-full bg-[#43EB3E] opacity-20
                    group-hover:translate-x-2 group-hover:-translate-y-2 transition-all duration-[1300ms]"></div>
                <div className="absolute top-[70%] left-[70%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-40
                    group-hover:-translate-x-3 group-hover:-translate-y-1 transition-all duration-[750ms]"></div>
                <div className="absolute top-[80%] left-[85%] w-1 h-1 rounded-full bg-[#43EB3E] opacity-30
                    group-hover:-translate-x-2 group-hover:translate-y-3 transition-all duration-[1250ms]"></div>
                <div className="absolute top-[85%] left-[55%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-35
                    group-hover:translate-x-3 group-hover:translate-y-1 transition-all duration-[800ms]"></div>
                <div className="absolute top-[90%] left-[75%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-40
                    group-hover:-translate-x-2 group-hover:-translate-y-3 transition-all duration-[950ms]"></div>
                
                {/* Tiny particle specks with more subtle animations */}
                <div className="absolute top-[8%] left-[45%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-30
                    group-hover:translate-x-1 group-hover:-translate-y-0.5 transition-all duration-[700ms]"></div>
                <div className="absolute top-[12%] left-[58%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-25
                    group-hover:-translate-x-0.5 group-hover:translate-y-1 transition-all duration-[650ms]"></div>
                <div className="absolute top-[18%] left-[72%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-35
                    group-hover:-translate-x-1.5 group-hover:-translate-y-1 transition-all duration-[900ms]"></div>
                <div className="absolute top-[22%] left-[32%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-30
                    group-hover:translate-x-0.5 group-hover:translate-y-1.5 transition-all duration-[850ms]"></div>
                <div className="absolute top-[33%] left-[17%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-40
                    group-hover:translate-x-1 group-hover:-translate-y-1 transition-all duration-[750ms]"></div>
                <div className="absolute top-[37%] left-[88%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-25
                    group-hover:-translate-x-2 group-hover:-translate-y-0.5 transition-all duration-[600ms]"></div>
                <div className="absolute top-[45%] left-[42%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-35
                    group-hover:translate-x-1 group-hover:translate-y-2 transition-all duration-[950ms]"></div>
                <div className="absolute top-[58%] left-[23%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-30
                    group-hover:-translate-x-1 group-hover:-translate-y-1 transition-all duration-[800ms]"></div>
                <div className="absolute top-[62%] left-[63%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-40
                    group-hover:translate-x-2 group-hover:translate-y-0.5 transition-all duration-[700ms]"></div>
                <div className="absolute top-[72%] left-[52%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-25
                    group-hover:-translate-x-1 group-hover:translate-y-1.5 transition-all duration-[850ms]"></div>
                <div className="absolute top-[78%] left-[28%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-35
                    group-hover:translate-x-1.5 group-hover:-translate-y-1 transition-all duration-[1000ms]"></div>
                <div className="absolute top-[88%] left-[48%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-30
                    group-hover:-translate-x-0.5 group-hover:-translate-y-2 transition-all duration-[750ms]"></div>
                <div className="absolute top-[92%] left-[82%] w-0.5 h-0.5 rounded-full bg-[#43EB3E] opacity-40
                    group-hover:translate-x-1 group-hover:translate-y-1 transition-all duration-[900ms]"></div>
                
                <CardHeader className="pb-2 relative z-10">
                  <Badge variant="outline" className={`mb-2 font-semibold border-[#43EB3E] text-[#43EB3E]`}>
                    {packageName}
                  </Badge>
                  <CardTitle className="text-2xl font-bold text-white">R{PACKAGE_PRICES[packageName as keyof typeof PACKAGE_PRICES]}</CardTitle>
                  <CardDescription className="text-gray-300 font-medium">per month</CardDescription>
                </CardHeader>
                <CardContent className="pb-2 relative z-10 flex-grow overflow-y-auto max-h-[550px]">
                  <ul className="space-y-1.5">
                    {ALL_FEATURES.map((feature, index) => {
                      const value = feature.values[packageName as keyof typeof feature.values];
                      const isAvailable = value !== false;
                      return (
                        <li key={index} className="flex items-start">
                          {isAvailable ? (
                            <CheckCircle className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5 text-[#43EB3E]" />
                          ) : (
                            <X className="h-4 w-4 mr-2 flex-shrink-0 mt-0.5 text-red-500" />
                          )}
                          <span className={`text-xs font-medium ${isAvailable ? 'text-gray-200' : 'text-gray-500'}`}>
                            {typeof value === 'string' ? `${feature.name}: ${value}` : feature.name}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
                <CardFooter className="relative z-10 mt-auto">
                  <Button 
                    className="w-full bg-[#43EB3E] hover:bg-[#3ad036] text-black font-semibold"
                    onClick={() => navigate(`/contact-us?package=${packageName}`)}
                  >
                    More Information
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Background decorations with light/dark mode support */}
        <div className="absolute top-0 left-0 w-full h-full bg-gray-50 dark:bg-[#01162f] z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[#43EB3E] mix-blend-overlay opacity-5 dark:opacity-15 z-0"></div>
        <div className="absolute top-20 left-0 w-full h-32 bg-gray-100 dark:bg-[#022b5c] transform -skew-y-3 opacity-30 z-0"></div>
        <div className="absolute bottom-20 left-0 w-full h-32 bg-gray-100 dark:bg-[#022b5c] transform skew-y-3 opacity-30 z-0"></div>
      </section>

      {/* CTA Section */}
      <section className="py-16 text-foreground dark:text-white relative overflow-hidden">
        <div className="container mx-auto px-4 text-center relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Join Opian Rewards Today!</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Don't miss out on making your everyday spending a source of cash rewards! Join the Opian Rewards 
            community and start your journey towards a financially rewarding lifestyle. 
            Fill out the contact form now, and let us help you start earning more from what you already do every day.
          </p>
          <p className="text-xl font-medium text-[#43EB3E] mb-8">
            With Opian Rewards, every transaction is an opportunity waiting to be seized!
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button 
              onClick={() => navigate("/contact-us")}
              className="bg-[#43EB3E] hover:bg-[#3ad036] text-black text-lg py-6 px-8 rounded-md"
              size="lg"
            >
              Get Information
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
        </div>

        {/* Background decorations with light/dark mode support */}
        <div className="absolute top-0 left-0 w-full h-full bg-gray-50 dark:bg-[#01162f] z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[#43EB3E] mix-blend-overlay opacity-5 dark:opacity-15 z-0"></div>
        
        {/* Additional decorative elements */}
        <div className="absolute bottom-0 left-0 w-1/3 h-2/3 bg-gray-100 dark:bg-[#022b5c] transform -skew-x-12 -translate-x-1/4 rounded-tr-3xl z-0 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-2/3 bg-[#43EB3E] transform -skew-x-12 -translate-x-1/4 rounded-tr-3xl mix-blend-overlay opacity-10 dark:opacity-20 z-0"></div>
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
                <Phone className="h-4 w-4 mr-2 flex-shrink-0" />
                <a href="tel:+27861263346" className="text-[rgb(8,42,90)] dark:text-inherit hover:text-[#43EB3E] transition-colors">+27 86 126 3346</a>
              </p>
              <p className="flex items-center mb-2">
                <Mail className="h-4 w-4 mr-2 flex-shrink-0" />
                <a href="mailto:info@opianrewards.com" className="text-[rgb(8,42,90)] dark:text-inherit hover:text-[#43EB3E] transition-colors">info@opianrewards.com</a>
              </p>
              <p className="flex items-start">
                <MapPin className="h-4 w-4 mr-2 mt-1 flex-shrink-0" />
                <span className="text-[rgb(8,42,90)] dark:text-inherit">260 Uys Krige Dr, Loevenstein, Cape Town, 7530, South Africa</span>
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
              <p className="mb-2 text-sm text-[rgb(8,42,90)] dark:text-inherit">Opian Rewards (Pty) Ltd is a Juristic Representative of Opian Financial Services (Pty) Ltd</p>
              <p className="mb-2 text-sm text-[rgb(8,42,90)] dark:text-inherit">Company Registration Number: 2021/411623/07</p>
              <p className="mb-2 text-sm text-[rgb(8,42,90)] dark:text-inherit">Opian Financial Services (Pty) Ltd is an Authorised Financial Services Provider</p>
              <p className="mb-2 text-sm text-[rgb(8,42,90)] dark:text-inherit">Company Registration Number: 2018/584168/07</p>
              <p className="text-sm text-[rgb(8,42,90)] dark:text-inherit">FSP No: 50974</p>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-800 pt-6 text-center text-[rgb(8,42,90)] dark:text-gray-400">
            <p>&copy; {new Date().getFullYear()} OPIAN Rewards. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}