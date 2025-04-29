import { useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Loader2, CheckCircle, ArrowRight, CreditCard, Users, Gift, ArrowUpRight, ShoppingCart, Receipt, BarChart2 } from "lucide-react";
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

export default function HomePage() {
  const { user, isLoading } = useUser();
  const [, navigate] = useLocation();

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
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-white">Simple Steps. Serious Rewards.</h2>
            <p className="text-lg text-gray-300 max-w-3xl mx-auto">
              Getting started with Opian Rewards is simple and empowering. Every step is designed to help you 
              earn more and unlock greater benefits—just by doing what you already do.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-16">
            <div className="bg-[#022b5c] p-8 rounded-xl shadow-md relative border-t-4 border-[#43EB3E]">
              <div className="absolute -top-5 -left-5 w-12 h-12 bg-[#01162f] text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg border-2 border-[#43EB3E]">
                1
              </div>
              <h3 className="text-xl font-bold mb-4 text-white pt-6">Submit Your Details</h3>
              <p className="text-gray-300">
                Submit your details and one of our friendly Opian agents will reach out to guide you 
                through the sign-up process.
              </p>
            </div>

            <div className="bg-[#022b5c] p-8 rounded-xl shadow-md relative border-t-4 border-[#43EB3E]">
              <div className="absolute -top-5 -left-5 w-12 h-12 bg-[#01162f] text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg border-2 border-[#43EB3E]">
                2
              </div>
              <h3 className="text-xl font-bold mb-4 text-white pt-6">Choose Your Product</h3>
              <p className="text-gray-300">
                Pick the rewards product that best suits your needs and lifestyle—each one comes with 
                increasing value and earning potential.
              </p>
            </div>

            <div className="bg-[#022b5c] p-8 rounded-xl shadow-md relative border-t-4 border-[#43EB3E]">
              <div className="absolute -top-5 -left-5 w-12 h-12 bg-[#01162f] text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg border-2 border-[#43EB3E]">
                3
              </div>
              <h3 className="text-xl font-bold mb-4 text-white pt-6">Receive Your Card & Load Funds</h3>
              <p className="text-gray-300">
                You'll get your personalised Opian Card, ready to be activated. Simply load funds to 
                activate it and unlock your rewards journey.
              </p>
            </div>

            <div className="bg-[#022b5c] p-8 rounded-xl shadow-md relative border-t-4 border-[#43EB3E]">
              <div className="absolute -top-5 -left-5 w-12 h-12 bg-[#01162f] text-white rounded-full flex items-center justify-center font-bold text-xl shadow-lg border-2 border-[#43EB3E]">
                4
              </div>
              <h3 className="text-xl font-bold mb-4 text-white pt-6">Swipe and Start Earning</h3>
              <p className="text-gray-300">
                Use your card for everyday purchases. Each swipe earns you points and brings you 
                closer to powerful benefits.
              </p>
            </div>
          </div>

          {/* Additional Info Sections */}
          <div className="mb-16">
            <div className="bg-[#022b5c] p-8 rounded-xl shadow-lg border-l-4 border-[#43EB3E]">
              <h3 className="text-2xl font-bold mb-6 text-white">Earn Points Effortlessly</h3>
              <p className="text-gray-300 mb-6">
                Opian Rewards is designed to make your financial life more rewarding:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-5 border border-[#01162f] rounded-lg bg-[#01162f] shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="w-10 h-10 bg-[#043375] rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <ShoppingCart className="h-5 w-5 text-[#43EB3E]" />
                  </div>
                  <h4 className="font-bold text-white mb-2">Shop Your Way</h4>
                  <p className="text-gray-300">
                    Use your Opian Rewards Card for everyday purchases—from groceries to online shopping—and watch the points pile up!
                  </p>
                </div>
                <div className="p-5 border border-[#01162f] rounded-lg bg-[#01162f] shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="w-10 h-10 bg-[#043375] rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <Receipt className="h-5 w-5 text-[#43EB3E]" />
                  </div>
                  <h4 className="font-bold text-white mb-2">Pay Your Accounts</h4>
                  <p className="text-gray-300">
                    Simplify your bill payments and earn rewards at the same time. Every time you pay a bill with your Opian Rewards Card, you strengthen your point balance.
                  </p>
                </div>
                <div className="p-5 border border-[#01162f] rounded-lg bg-[#01162f] shadow-sm hover:shadow-md transition-shadow duration-300">
                  <div className="w-10 h-10 bg-[#043375] rounded-full flex items-center justify-center mb-4 shadow-sm">
                    <BarChart2 className="h-5 w-5 text-[#43EB3E]" />
                  </div>
                  <h4 className="font-bold text-white mb-2">Plan for Success</h4>
                  <p className="text-gray-300">
                    Engage in smart financial planning and decision-making—whether it's budgeting, saving, or investing. We believe in rewarding your financial savvy!
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-16">
            <div className="bg-[#022b5c] p-8 rounded-xl shadow-lg border-l-4 border-[#43EB3E]">
              <h3 className="text-2xl font-bold mb-6 text-white">Stack Your Rewards</h3>
              <p className="text-gray-300 mb-6">
                Accumulate points with every transaction and see how they can translate into real value. The points you earn can be converted into cash based on Opian Rewards' conditions, which take into account:
              </p>
              <ul className="list-disc pl-6 space-y-2 text-gray-300">
                <li>Your points level</li>
                <li>Your engagement with the program</li>
                <li>Other applicable terms and conditions</li>
              </ul>
              <p className="text-gray-300 mt-4 font-medium">
                The more involved you are, the greater your rewards can be!
              </p>
            </div>
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
                className={`border-t-8 ${PACKAGE_COLORS[packageName as keyof typeof PACKAGE_COLORS]} overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-2 bg-white text-black`}
              >
                <CardHeader className="pb-4">
                  <Badge variant="outline" className={`mb-2 font-semibold ${packageName === 'PROSPER' || packageName === 'PINNACLE' ? 'border-[#43EB3E] text-[#43EB3E]' : 'border-[#01162f] text-[#01162f]'}`}>
                    {packageName}
                  </Badge>
                  <CardTitle className="text-2xl font-bold text-[#01162f]">R{PACKAGE_PRICES[packageName as keyof typeof PACKAGE_PRICES]}</CardTitle>
                  <CardDescription className="text-gray-600 font-medium">per month</CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <ul className="space-y-2">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${packageName === 'PROSPER' || packageName === 'PINNACLE' ? 'text-[#43EB3E]' : 'text-[#01162f]'}`} />
                        <span className="text-sm font-medium text-gray-800">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className={`w-full ${
                      packageName === 'PROSPER' || packageName === 'PINNACLE' 
                        ? 'bg-[#01162f] hover:bg-[#011d3d] text-white' 
                        : packageName === 'OPPORTUNITY' || packageName === 'MOMENTUM' || packageName === 'PRESTIGE'
                          ? 'bg-[#43EB3E] hover:bg-[#3ad036] text-black' 
                          : ''
                    }`}
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