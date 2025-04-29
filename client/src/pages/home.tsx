import { useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import { useLocation } from "wouter";
import { Loader2, CheckCircle, ArrowRight } from "lucide-react";
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
    navigate(user.isAdmin ? '/admin' : '/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-[#011d3d] to-[#022b5c] text-white py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <img
                src="/opian-logo-white.png"
                alt="OPIAN Rewards"
                className="h-16 w-auto mb-6"
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.onerror = null;
                  img.src = '/logo-fallback.png';
                }}
              />
              <h1 className="text-4xl md:text-5xl font-bold mb-4">Unlock Your Reward Potential</h1>
              <p className="text-xl mb-8 text-gray-200">
                Join OPIAN Rewards and start earning points today. Our comprehensive rewards program offers 
                exclusive benefits, referral opportunities, and premium services.
              </p>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Button 
                  onClick={() => navigate("/login")}
                  className="bg-[#43EB3E] hover:bg-[#3ad036] text-black text-lg py-6 px-8"
                  size="lg"
                >
                  Sign In
                </Button>
                <Button 
                  onClick={() => navigate("/register")}
                  variant="outline" 
                  className="border-white text-white hover:bg-white/10 text-lg py-6 px-8"
                  size="lg"
                >
                  Register Now
                </Button>
              </div>
            </div>
            <div className="md:w-1/2">
              <div className="rounded-lg overflow-hidden shadow-2xl">
                <img 
                  src="/rewards-hero.jpg" 
                  alt="OPIAN Rewards" 
                  className="w-full h-auto"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.onerror = null;
                    img.src = 'https://placehold.co/600x400/011d3d/FFFFFF/?text=OPIAN+Rewards';
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Package Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#011d3d] mb-4">Choose Your Reward Package</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              OPIAN Rewards offers a range of packages to suit your needs. Find the perfect package 
              that aligns with your goals and start your rewards journey today.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {Object.entries(PACKAGE_FEATURES).map(([packageName, features]) => (
              <Card 
                key={packageName} 
                className={`border-t-8 ${PACKAGE_COLORS[packageName as keyof typeof PACKAGE_COLORS]} overflow-hidden hover:shadow-lg transition-shadow duration-300`}
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

      {/* Why Join Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-[#011d3d] mb-4">Why Join OPIAN Rewards?</h2>
            <p className="text-lg text-gray-600 max-w-3xl mx-auto">
              Joining OPIAN Rewards opens a world of opportunities and benefits designed 
              to enhance your experience and maximize your rewards.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Earn Points</h3>
              <p className="text-gray-600">
                Earn points with every interaction, referral, and activity. Accumulate points and redeem them 
                for exclusive rewards and benefits.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Refer Friends</h3>
              <p className="text-gray-600">
                Share your referral code with friends and family. Earn 2000 points for each successful referral 
                and watch your rewards grow.
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-md">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path>
                </svg>
              </div>
              <h3 className="text-xl font-semibold mb-2">Exclusive Benefits</h3>
              <p className="text-gray-600">
                Access exclusive benefits, dedicated support, and premium services based on your package level. 
                Enjoy a personalized rewards experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-[#011d3d] to-[#022b5c] text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Ready to Start Your Rewards Journey?</h2>
          <p className="text-xl mb-8 max-w-3xl mx-auto">
            Join thousands of members who are already enjoying the benefits of OPIAN Rewards. 
            Sign up today and start earning points immediately.
          </p>
          <div className="flex flex-col sm:flex-row justify-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Button 
              onClick={() => navigate("/register")}
              className="bg-[#43EB3E] hover:bg-[#3ad036] text-black text-lg py-6 px-8"
              size="lg"
            >
              Create Account
            </Button>
            <Button 
              onClick={() => navigate("/login")}
              variant="outline" 
              className="border-white text-white hover:bg-white/10 text-lg py-6 px-8"
              size="lg"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-12">
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
                OPIAN Rewards is your gateway to exclusive benefits, rewards, and a personalized experience.
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-4">Packages</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white">Opportunity</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">Momentum</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">Prosper</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">Prestige</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">Pinnacle</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Resources</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white">Help Center</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">FAQs</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">Blog</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">Contact</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold mb-4">Legal</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white">Terms of Service</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">Privacy Policy</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white">Cookie Policy</a></li>
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