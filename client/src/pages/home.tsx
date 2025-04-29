import { useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Loader2, CheckCircle, ArrowRight, CreditCard, Users, Gift, ArrowUpRight } from "lucide-react";
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
    'Essential rewards program',
    'Monthly newsletter',
    'Basic customer support'
  ],
  MOMENTUM: [
    'Enhanced rewards program',
    'Quarterly digital magazine',
    'Priority email support',
    'Additional reward opportunities'
  ],
  PROSPER: [
    'Premium rewards program',
    'Access to referral program',
    'Dedicated support agent',
    'Monthly exclusive offers',
    'Priority processing'
  ],
  PRESTIGE: [
    'Elite rewards program',
    'VIP referral benefits',
    '24/7 priority support',
    'Exclusive member events',
    'Quarterly performance reviews',
    'Enhanced reward multipliers'
  ],
  PINNACLE: [
    'Ultimate rewards experience',
    'Maximum referral benefits',
    'Dedicated account manager',
    'Customized rewards strategy',
    'Exclusive VIP events',
    'Premium reward multipliers',
    'Early access to new features'
  ]
};

// Package colors
const PACKAGE_COLORS = {
  OPPORTUNITY: 'bg-zinc-400',
  MOMENTUM: 'bg-blue-400',
  PROSPER: 'bg-green-400',
  PRESTIGE: 'bg-purple-400',
  PINNACLE: 'bg-amber-400'
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
        <div className="container mx-auto px-4">
          <div className="flex flex-col lg:flex-row items-center">
            <div className="lg:w-1/2 z-10">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4">
                The Card that <span className="text-[#43EB3E]">Pays</span>
              </h1>
              <p className="text-xl mb-6">
                Opian Rewards makes every transaction <span className="text-[#43EB3E]">work for you</span>.<br />
                Get <span className="text-[#43EB3E]">cash back</span> on every <span className="text-[#43EB3E]">swipe</span>, 
                every <span className="text-[#43EB3E]">referral</span>, and every 
                financial choice—effortlessly.<br />
                Turn your everyday spending into real cash rewards.
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
              <div className="relative w-80 h-auto transform rotate-6 transition-transform hover:rotate-0 duration-500">
                <img 
                  src="/card-image.png" 
                  alt="OPIAN Rewards Card" 
                  className="w-full h-auto shadow-2xl rounded-xl"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.onerror = null;
                    img.src = 'https://placehold.co/600x400/011d3d/FFFFFF/?text=OPIAN+Card';
                  }}
                />
                <div className="absolute -right-4 -bottom-4 bg-[#43EB3E] text-black font-bold px-4 py-2 rounded-lg shadow-lg transform rotate-12">
                  Premium Benefits
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* Background decoration */}
        <div className="absolute top-0 right-0 w-2/3 h-full bg-[#022b5c] transform skew-x-12 translate-x-1/3 z-0 opacity-50"></div>
      </section>

      {/* Value Proposition Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16 text-[#011d3d]">
            What If Your Card Paid You Back?
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            <div className="bg-gray-50 rounded-xl p-8 shadow-lg transform transition-transform hover:-translate-y-2 duration-300">
              <div className="w-16 h-16 bg-[#43EB3E] rounded-full flex items-center justify-center mb-6 shadow-md">
                <CreditCard className="h-8 w-8 text-[#011d3d]" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-[#011d3d]">Cash Back on Everything</h3>
              <p className="text-gray-600">
                Shopping, dining, paying bills—earn cash every time you swipe.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-8 shadow-lg transform transition-transform hover:-translate-y-2 duration-300">
              <div className="w-16 h-16 bg-[#43EB3E] rounded-full flex items-center justify-center mb-6 shadow-md">
                <Gift className="h-8 w-8 text-[#011d3d]" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-[#011d3d]">Build Your Own Reward Stack</h3>
              <p className="text-gray-600">
                Combine spending, referrals, and bonuses to create a personalized stack of rewards.
              </p>
            </div>
            
            <div className="bg-gray-50 rounded-xl p-8 shadow-lg transform transition-transform hover:-translate-y-2 duration-300">
              <div className="w-16 h-16 bg-[#43EB3E] rounded-full flex items-center justify-center mb-6 shadow-md">
                <Users className="h-8 w-8 text-[#011d3d]" />
              </div>
              <h3 className="text-xl font-bold mb-4 text-[#011d3d]">Make Money While You Share</h3>
              <p className="text-gray-600">
                Spread the word about Opian and get paid every time someone joins through your referral.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#011d3d]">Simple Steps. Serious Rewards.</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Getting started with Opian Rewards is simple and empowering. Every step is designed to help you 
              earn more and unlock greater benefits—just by doing what you already do.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-md relative">
              <div className="absolute -top-5 -left-5 w-12 h-12 bg-[#011d3d] text-white rounded-full flex items-center justify-center font-bold text-xl">
                1
              </div>
              <h3 className="text-xl font-bold mb-4 text-[#011d3d] pt-6">Submit Your Details</h3>
              <p className="text-gray-600">
                Submit your details and one of our friendly Opian agents will reach out to guide you 
                through the sign-up process.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md relative">
              <div className="absolute -top-5 -left-5 w-12 h-12 bg-[#011d3d] text-white rounded-full flex items-center justify-center font-bold text-xl">
                2
              </div>
              <h3 className="text-xl font-bold mb-4 text-[#011d3d] pt-6">Choose Your Product</h3>
              <p className="text-gray-600">
                Pick the rewards product that best suits your needs and lifestyle—each one comes with 
                increasing value and earning potential.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md relative">
              <div className="absolute -top-5 -left-5 w-12 h-12 bg-[#011d3d] text-white rounded-full flex items-center justify-center font-bold text-xl">
                3
              </div>
              <h3 className="text-xl font-bold mb-4 text-[#011d3d] pt-6">Receive Your Card & Load Funds</h3>
              <p className="text-gray-600">
                You'll get your personalised Opian Card, ready to be activated. Simply load funds to 
                activate it and unlock your rewards journey.
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-md relative">
              <div className="absolute -top-5 -left-5 w-12 h-12 bg-[#011d3d] text-white rounded-full flex items-center justify-center font-bold text-xl">
                4
              </div>
              <h3 className="text-xl font-bold mb-4 text-[#011d3d] pt-6">Swipe and Start Earning</h3>
              <p className="text-gray-600">
                Use your card for everyday purchases. Each swipe earns you points and brings you 
                closer to powerful benefits.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Package Section */}
      <section className="py-20 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-[#011d3d]">Unlock More, Earn More, Be More.</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Choose the package that matches your ambitions. Each tier opens new possibilities 
              for rewards and benefits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {Object.entries(PACKAGE_FEATURES).map(([packageName, features]) => (
              <Card 
                key={packageName} 
                className={`border-t-8 ${PACKAGE_COLORS[packageName as keyof typeof PACKAGE_COLORS]} overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-2`}
              >
                <CardHeader className="pb-4">
                  <Badge variant="outline" className={`mb-2 ${packageName === 'PROSPER' ? 'border-green-500 text-green-600' : ''}`}>
                    {packageName}
                  </Badge>
                  <CardTitle className="text-2xl">R{PACKAGE_PRICES[packageName as keyof typeof PACKAGE_PRICES]}</CardTitle>
                  <CardDescription>per month</CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <ul className="space-y-2">
                    {features.map((feature, index) => (
                      <li key={index} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button 
                    className={`w-full ${packageName === 'PROSPER' ? 'bg-[#43EB3E] hover:bg-[#3ad036] text-black' : ''}`}
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
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-[#011d3d] text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Start Your Rewards Journey?</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Join thousands of members who are already enjoying the benefits of OPIAN Rewards. 
            Sign up today and start earning cash back immediately.
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