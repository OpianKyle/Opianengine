import { useEffect, useCallback, useState } from "react";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Loader2, CheckCircle, ArrowRight, CreditCard, Users, Gift, ArrowUpRight, ShoppingCart, Receipt, BarChart2, ChevronLeft, ChevronRight } from "lucide-react";
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

// Package prices in ZAR
const PACKAGE_PRICES = {
  OPPORTUNITY: 350,
  MOMENTUM: 450,
  PROSPER: 550,
  PRESTIGE: 695,
  PINNACLE: 825
};

// Package descriptions
const PACKAGE_FEATURES = {
  OPPORTUNITY: [
    'Activation Points: 2,500',
    'EMS Assist',
    'Legal Assist',
    'Repatriation Cover',
    'Celebrate Life',
    '24/7 Nurse On-Call'
  ],
  MOMENTUM: [
    'Activation Points: 5,000',
    'Funeral Cover: R5,000',
    'Funeral Assist',
    'EMS Assist',
    'Legal Assist',
    'Repatriation Cover',
    'Celebrate Life',
    '24/7 Nurse On-Call'
  ],
  PROSPER: [
    'Activation Points: 7,500',
    'Funeral Cover: R10,000',
    'Accidental Death Cover: R20,000',
    'Funeral Assist',
    'Family Income Benefit: R5,000 x6',
    'EMS Assist',
    'Legal Assist',
    'Repatriation Cover',
    'Celebrate Life',
    '24/7 Nurse On-Call',
    'Virtual GP Assistant',
    'Medical Second Opinion'
  ],
  PRESTIGE: [
    'Activation Points: 10,000',
    'Funeral Cover: R15,000',
    'Accidental Death Cover: R50,000',
    'Funeral Assist',
    'Family Income Benefit: R5,000 x6',
    'EMS Assist',
    'Legal Assist',
    'Repatriation Cover',
    'Celebrate Life',
    '24/7 Nurse On-Call',
    'Virtual GP Assistant',
    'Medical Second Opinion',
    'Crime Victim Assist',
    'Assault & Trauma Assist',
    'Emergency Medical Services'
  ],
  PINNACLE: [
    'Activation Points: 12,500',
    'Funeral Cover: R20,000',
    'Accidental Death Cover: R100,000',
    'Funeral Assist',
    'Family Income Benefit: R5,000 x6',
    'EMS Assist',
    'Legal Assist',
    'Lawyer Assist',
    'Repatriation Cover',
    'Celebrate Life',
    '24/7 Nurse On-Call',
    'Virtual GP Assistant',
    'Medical Second Opinion',
    'Crime Victim Assist',
    'Assault & Trauma Assist',
    'Emergency Medical Services'
  ]
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
  const [, navigate] = useLocation();
  
  // Carousel logic for How It Works section
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [currentStep, setCurrentStep] = useState(0);
  
  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);
  
  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);
  
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
      <header className="bg-[#01162f] text-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center">
              <img
                src="/opian-logo-white.png"
                alt="OPIAN Rewards"
                className="h-10 w-auto"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.onerror = null;
                  img.src = '/logo-fallback.png';
                }}
              />
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#" className="text-white hover:text-[#43EB3E] transition-colors">Home</a>
              <a href="#how-it-works" className="text-white hover:text-[#43EB3E] transition-colors">How It Works</a>
              <a href="#" className="text-white hover:text-[#43EB3E] transition-colors">FAQ</a>
            </nav>
            <Button 
              onClick={() => navigate("/register")}
              className="bg-[#43EB3E] hover:bg-[#3ad036] text-black font-medium"
            >
              Sign Up
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-[#01162f] text-white py-16 relative overflow-hidden">
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 z-10">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                The Card that Works for You
              </h1>
              <p className="text-xl mb-6">
                Make your money go further with Opian Rewards. Earn Rewards when you purchase 
                and pay accounts with your Opian Rewards Card, and enhance your Rewards when 
                you make smart financial planning decisions. Reward yourself and effortlessly 
                put more money in your pocket by doing every day things with Opian Rewards.
              </p>
              <Button 
                onClick={() => navigate("/register")}
                className="bg-[#43EB3E] hover:bg-[#3ad036] text-black text-lg py-6 px-8 rounded-md"
                size="lg"
              >
                Start Earning
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
        <div className="absolute top-0 left-0 w-full h-full bg-[#01162f] z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[#43EB3E] mix-blend-overlay opacity-15 z-0"></div>
        <div className="absolute top-0 right-0 w-2/3 h-full bg-[#022b5c] transform skew-x-12 translate-x-1/3 z-0 opacity-50"></div>
        <div className="absolute top-0 right-0 w-2/3 h-full bg-[#43EB3E] transform skew-x-12 translate-x-1/3 mix-blend-overlay z-0 opacity-20"></div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-20 relative overflow-hidden text-white">
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-white">
            What If Your Card Paid You Back?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-[#022b5c] rounded-xl p-8 shadow-lg transform transition-transform hover:-translate-y-2 duration-300 border-t-4 border-[#43EB3E]">
              <div className="w-16 h-16 bg-[#01162f] rounded-full flex items-center justify-center mb-6 shadow-md">
                <CreditCard className="h-8 w-8 text-[#43EB3E]" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-white">Cash Back on Everything</h3>
              <p className="text-gray-300">
                Shopping, dining, paying bills—earn cash every time you swipe.
              </p>
            </div>
            
            <div className="bg-[#022b5c] rounded-xl p-8 shadow-lg transform transition-transform hover:-translate-y-2 duration-300 border-t-4 border-[#43EB3E]">
              <div className="w-16 h-16 bg-[#01162f] rounded-full flex items-center justify-center mb-6 shadow-md">
                <Gift className="h-8 w-8 text-[#43EB3E]" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-white">Build Your Own Reward Stack</h3>
              <p className="text-gray-300">
                Combine the power of our Rewards System with your current rewards cards to create Double Rewards in your pocket!
              </p>
            </div>
            
            <div className="bg-[#022b5c] rounded-xl p-8 shadow-lg transform transition-transform hover:-translate-y-2 duration-300 border-t-4 border-[#43EB3E]">
              <div className="w-16 h-16 bg-[#01162f] rounded-full flex items-center justify-center mb-6 shadow-md">
                <Users className="h-8 w-8 text-[#43EB3E]" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-white">Make Your Money Work for You</h3>
              <p className="text-gray-300">
                With the help of our Financial Partners, make smarter financial planning decisions to Save and Earn extra money!
              </p>
            </div>
          </div>
        </div>
        
        {/* Background decorations with blue base and green overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-[#01162f] z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[#43EB3E] mix-blend-overlay opacity-15 z-0"></div>
        <div className="absolute left-0 top-1/2 transform -translate-y-1/2 w-32 h-64 bg-[#022b5c] rounded-r-full opacity-60 z-0"></div>
        <div className="absolute right-0 bottom-1/4 w-48 h-48 bg-[#43EB3E] rounded-full mix-blend-overlay opacity-10 z-0"></div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 relative overflow-hidden text-white">
        <div className="container mx-auto px-4 relative z-10">
          <div className="flex flex-col lg:flex-row gap-12">
            {/* Left side - Text content */}
            <div className="w-full lg:w-1/2">
              <h2 className="text-3xl md:text-4xl font-bold mb-8 text-white">
                Simple Steps.<br/>Serious Rewards.
              </h2>
              <div className="text-lg text-gray-300 space-y-6">
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
                
                <Button 
                  onClick={() => navigate("/register")}
                  className="bg-[#43EB3E] hover:bg-[#3ad036] text-black mt-8"
                  size="lg"
                >
                  Begin Your Journey
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
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
                          <div className="w-16 h-16 bg-[#01162f] text-white rounded-full flex items-center justify-center font-bold text-2xl mb-6 shadow-lg border-2 border-[#43EB3E]">
                            {index + 1}
                          </div>
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
                    <div className="relative z-10 p-6 flex flex-col h-full">
                      <h3 className="text-3xl font-bold mb-6 text-white border-l-4 border-[#43EB3E] pl-4">Earn Points Effortlessly</h3>
                      <p className="text-gray-100 mb-8 text-lg">
                        Opian Rewards is designed to make your financial life more rewarding:
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Right side - Content points - exactly 50% width */}
              <div className="w-full md:w-1/2 space-y-12 p-4 md:order-1">
                <div className="flex items-start">
                  <div className="w-14 h-14 flex-shrink-0 bg-[#043375] rounded-full flex items-center justify-center mr-5 shadow-md">
                    <ShoppingCart className="h-7 w-7 text-[#43EB3E]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xl mb-3">Shop Your Way</h4>
                    <p className="text-gray-300 text-lg">
                      Use your Opian Rewards Card for everyday purchases—from groceries to online shopping—and watch the points pile up!
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-14 h-14 flex-shrink-0 bg-[#043375] rounded-full flex items-center justify-center mr-5 shadow-md">
                    <Receipt className="h-7 w-7 text-[#43EB3E]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xl mb-3">Pay Your Accounts</h4>
                    <p className="text-gray-300 text-lg">
                      Simplify your bill payments and earn rewards at the same time. Every time you pay a bill with your Opian Rewards Card, you strengthen your point balance.
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="w-14 h-14 flex-shrink-0 bg-[#043375] rounded-full flex items-center justify-center mr-5 shadow-md">
                    <BarChart2 className="h-7 w-7 text-[#43EB3E]" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-xl mb-3">Plan for Success</h4>
                    <p className="text-gray-300 text-lg">
                      Engage in smart financial planning and decision-making—whether it's budgeting, saving, or investing. We believe in rewarding your financial savvy!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-20 mt-16 max-w-5xl mx-auto">
            <h3 className="text-3xl font-bold mb-6 text-white border-l-4 border-[#43EB3E] pl-4">Stack Your Rewards</h3>
            <p className="text-gray-300 mb-8 text-lg">
              Accumulate points with every transaction and see how they can translate into real value. The points you earn can be converted into cash based on Opian Rewards' conditions, which take into account:
            </p>
            <ul className="list-disc pl-8 space-y-3 text-gray-300 text-lg ml-5">
              <li>Your points level</li>
              <li>Your engagement with the program</li>
              <li>Other applicable terms and conditions</li>
            </ul>
            <p className="text-gray-300 mt-6 font-medium text-lg">
              The more involved you are, the greater your rewards can be!
            </p>
          </div>

          <div className="mb-16">
            <div className="bg-[#01162f] p-8 rounded-xl shadow-lg flex flex-col md:flex-row items-center text-white border border-[#043375]">
              <div className="md:w-2/3 md:pr-8">
                <h3 className="text-2xl font-bold mb-6 text-white">Personalized Support at Your Fingertips</h3>
                <p className="text-gray-300 mb-4">
                  Ready to make the most out of your Opian Rewards Card? Complete our quick contact form, and an Opian Rewards agent will reach out to explain all the incredible benefits you can unlock.
                </p>
                <p className="text-gray-300">
                  Our team is dedicated to guiding you through every step of the way, providing insights and support through a series of calls and emails on how to maximize your rewards.
                </p>
              </div>
              <div className="md:w-1/3 flex justify-center mt-6 md:mt-0">
                <div className="bg-[#43EB3E] px-6 py-8 rounded-lg shadow-lg text-center transform transition-transform hover:scale-105 duration-300">
                  <h4 className="text-xl font-bold text-[#01162f] mb-4">Join Opian Rewards Today!</h4>
                  <p className="text-[#01162f] mb-4">
                    Don't miss out on making your everyday spending a source of cash rewards!
                  </p>
                  <Button
                    onClick={() => navigate("/register")}
                    className="bg-[#01162f] hover:bg-[#022b5c] text-white w-full"
                  >
                    Get Started Now
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Background decorations with blue base and green overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-[#01162f] z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[#43EB3E] mix-blend-overlay opacity-15 z-0"></div>
        <div className="absolute right-0 top-1/4 w-64 h-64 bg-[#022b5c] rounded-full opacity-50 z-0"></div>
        <div className="absolute left-0 bottom-1/4 w-32 h-32 bg-[#43EB3E] rounded-full mix-blend-overlay opacity-20 z-0"></div>
      </section>

      {/* Package Section */}
      <section className="py-20 relative overflow-hidden text-white">
        <div className="container mx-auto px-4 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Unlock More, Earn More, Be More.</h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              Choose the package that matches your ambitions. Each tier opens new possibilities 
              for rewards and benefits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {Object.entries(PACKAGE_FEATURES).map(([packageName, features]) => (
              <Card 
                key={packageName} 
                className={`border-t-8 ${PACKAGE_COLORS[packageName as keyof typeof PACKAGE_COLORS]} overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-2 bg-[#01162f] text-white relative group`}
              >
                {/* Particle-like green shade overlay */}
                <div className="absolute inset-0 bg-[#43EB3E] opacity-10 mix-blend-overlay pointer-events-none z-0"></div>
                <div className="absolute top-0 right-0 w-24 h-24 rounded-bl-full bg-[#43EB3E] opacity-15 mix-blend-overlay group-hover:opacity-25 transition-all duration-700"></div>
                <div className="absolute bottom-0 left-0 w-16 h-16 rounded-tr-full bg-[#43EB3E] opacity-15 mix-blend-overlay group-hover:opacity-25 transition-all duration-700"></div>
                
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
                
                <CardHeader className="pb-4 relative z-10">
                  <Badge variant="outline" className={`mb-2 font-semibold border-[#43EB3E] text-[#43EB3E]`}>
                    {packageName}
                  </Badge>
                  <CardTitle className="text-2xl font-bold text-white">R{PACKAGE_PRICES[packageName as keyof typeof PACKAGE_PRICES]}</CardTitle>
                  <CardDescription className="text-gray-300 font-medium">per month</CardDescription>
                </CardHeader>
                <CardContent className="pb-4 relative z-10">
                  <ul className="space-y-2">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 mr-2 flex-shrink-0 mt-0.5 text-[#43EB3E]" />
                        <span className="text-sm font-medium text-gray-200">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter className="relative z-10">
                  <Button 
                    className="w-full bg-[#43EB3E] hover:bg-[#3ad036] text-black font-semibold"
                    onClick={() => navigate(`/register?package=${packageName}`)}
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
        
        {/* Background decorations with blue base and green overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-[#01162f] z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[#43EB3E] mix-blend-overlay opacity-15 z-0"></div>
        <div className="absolute top-20 left-0 w-full h-32 bg-[#022b5c] transform -skew-y-3 opacity-30 z-0"></div>
        <div className="absolute bottom-20 left-0 w-full h-32 bg-[#022b5c] transform skew-y-3 opacity-30 z-0"></div>
      </section>

      {/* CTA Section */}
      <section className="py-16 text-white relative overflow-hidden">
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
              className="border-white text-white hover:bg-white/10 text-lg py-6 px-8 rounded-md"
              size="lg"
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Background decorations with blue base and green overlay */}
        <div className="absolute top-0 left-0 w-full h-full bg-[#01162f] z-0"></div>
        <div className="absolute top-0 left-0 w-full h-full bg-[#43EB3E] mix-blend-overlay opacity-15 z-0"></div>
        
        {/* Additional decorative elements */}
        <div className="absolute bottom-0 left-0 w-1/3 h-2/3 bg-[#022b5c] transform -skew-x-12 -translate-x-1/4 rounded-tr-3xl z-0 opacity-50"></div>
        <div className="absolute bottom-0 left-0 w-1/3 h-2/3 bg-[#43EB3E] transform -skew-x-12 -translate-x-1/4 rounded-tr-3xl mix-blend-overlay z-0 opacity-20"></div>
      </section>

      {/* Footer */}
      <footer className="bg-[#01162f] text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between">
            <div className="mb-8 md:mb-0">
              <img 
                src="/opian-logo-white.png" 
                alt="OPIAN Rewards" 
                className="h-10 w-auto mb-4"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.onerror = null;
                  img.src = '/logo-fallback.png';
                }}
              />
              <p className="text-gray-400 max-w-xs">
                OPIAN Rewards makes your money work harder. Earn rewards on every transaction, referral, and financial decision.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Packages</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-[#43EB3E] transition-colors">Opportunity</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-[#43EB3E] transition-colors">Momentum</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-[#43EB3E] transition-colors">Prosper</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-[#43EB3E] transition-colors">Prestige</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-[#43EB3E] transition-colors">Pinnacle</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Resources</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-[#43EB3E] transition-colors">Help Center</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-[#43EB3E] transition-colors">FAQs</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-[#43EB3E] transition-colors">Blog</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-[#43EB3E] transition-colors">Contact</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Legal</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-[#43EB3E] transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-[#43EB3E] transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-[#43EB3E] transition-colors">Cookie Policy</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-12 pt-8 text-center text-gray-400">
            <p>&copy; {new Date().getFullYear()} OPIAN Rewards. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}