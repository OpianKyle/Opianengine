import React, { useState } from "react";
import { useTheme } from "@/providers/theme-provider";
import { useLocation, Link } from "wouter";
import { 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  Sun, 
  Moon, 
  Users,
  Compass,
  Shield,
  Award
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

// Define the type for team members
interface TeamMember {
  id: number;
  name: string;
  title: string;
  description: string;
  image: string;
}

export default function TeamPage() {
  const { theme } = useTheme();
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTeamMember, setActiveTeamMember] = useState<TeamMember | null>(null);

  // Helper function to close the team member details sheet
  const closeActiveTeamMember = () => {
    setActiveTeamMember(null);
  };

  // Team member data
  const teamMembers: TeamMember[] = [
    {
      id: 1,
      name: "Lance Heynes",
      title: "Director of Operations",
      description: "Lance ensures the seamless integration of our services to enhance member satisfaction and engagement.",
      image: "/kyle-mcbryne-300x300.png"
    },
    {
      id: 2,
      name: "Andre Visser",
      title: "Head of Marketing",
      description: "Andre crafts innovative strategies to promote our reward programs, helping our members maximize their benefits.",
      image: "/kyle-mcbryne-300x300.png"
    },
    {
      id: 3,
      name: "Wessel Krige",
      title: "Social Media Manager",
      description: "Wessel focuses on building strong relationships with our members via all social media channels, ensuring they understand and utilize their rewards.",
      image: "/kyle-mcbryne-300x300.png"
    },
    {
      id: 4,
      name: "Mic-Shane Brown",
      title: "Head of Admin",
      description: "Mic-Shane focuses on managing internal systems and the team that ensures an unparalleled and rewarding customer experience.",
      image: "/kyle-mcbryne-300x300.png"
    },
    {
      id: 5,
      name: "Lionel Lottering",
      title: "Head of Investor Matters",
      description: "Lionel looks after our investors and ensures the establishment of win-win relationships between investors and the company.",
      image: "/kyle-mcbryne-300x300.png"
    },
    {
      id: 6,
      name: "Shannon Heugh",
      title: "Client Services Specialist",
      description: "Shannon is responsible for data management and ensuring communications that result in an amazing customer service journey.",
      image: "/kyle-mcbryne-300x300.png"
    },
    {
      id: 7,
      name: "Jodi Rensburg",
      title: "Client Services Specialist",
      description: "Jodi is responsible for data management and ensuring communications that result in an amazing customer service journey.",
      image: "/kyle-mcbryne-300x300.png"
    },
    {
      id: 8,
      name: "Cheslin Matinka",
      title: "Client Consultant",
      description: "Cheslin is responsible for sales and client interactions that ensured our clients have an amazing customer service journey.",
      image: "/kyle-mcbryne-300x300.png"
    },
    {
      id: 9,
      name: "Kyle McBryne",
      title: "Systems Developer", 
      description: "Kyle is responsible for our programs and systems and ensures the smooth workflows that empower our clients with the correct data.",
      image: "/kyle-mcbryne-300x300.png"
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#01162f] flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-200 dark:border-[#022b5c] py-4">
        <div className="container mx-auto px-4 flex justify-between items-center">
          {/* Logo */}
          <div className="flex items-center">
            <Link href="/">
              <div className="flex items-center">
                <img 
                  src={theme === 'dark' ? '/opian-logo-white.png' : '/opian-rewards-logo(R).png'}
                  alt="OPIAN Rewards" 
                  className="h-10"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.onerror = null;
                    img.src = '/logo-fallback.png';
                  }}
                />
              </div>
            </Link>
          </div>
          
          {/* Desktop navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/">
              <div className="text-[rgb(8,42,90)] dark:text-white hover:text-[#43EB3E] transition-colors">
                Home
              </div>
            </Link>
            <Link href="/how-it-works">
              <div className="text-[rgb(8,42,90)] dark:text-white hover:text-[#43EB3E] transition-colors">
                How It Works
              </div>
            </Link>
            <Link href="/meet-the-team">
              <div className="text-[#43EB3E] font-medium">
                Meet The Team
              </div>
            </Link>
            <div className="flex space-x-2">
              <ThemeToggle />
              <Button 
                onClick={() => navigate("/login")}
                variant="outline" 
                className="text-[rgb(8,42,90)] dark:text-white border-[rgb(8,42,90)] dark:border-white hover:bg-[rgb(8,42,90)]/10 dark:hover:bg-white/10"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => navigate("/register")}
                className="bg-[#43EB3E] hover:bg-[#3ad036] text-black"
              >
                Sign Up
              </Button>
            </div>
          </nav>
          
          {/* Mobile menu button */}
          <div className="flex items-center md:hidden space-x-4">
            <ThemeToggle />
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-[rgb(8,42,90)] dark:text-white">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="bg-white dark:bg-[#01162f] text-[rgb(8,42,90)] dark:text-white border-l border-gray-200 dark:border-[#022b5c]">
                <div className="flex flex-col h-full">
                  <div className="flex-1 py-6">
                    <div className="px-2 space-y-6">
                      <Link href="/">
                        <a className="block py-2 hover:text-[#43EB3E] transition-colors" onClick={() => setMobileMenuOpen(false)}>
                          Home
                        </a>
                      </Link>
                      <Link href="/how-it-works">
                        <a className="block py-2 hover:text-[#43EB3E] transition-colors" onClick={() => setMobileMenuOpen(false)}>
                          How It Works
                        </a>
                      </Link>
                      <Link href="/meet-the-team">
                        <a className="block py-2 text-[#43EB3E] font-medium" onClick={() => setMobileMenuOpen(false)}>
                          Meet The Team
                        </a>
                      </Link>
                    </div>
                  </div>
                  <div className="px-2 py-6 border-t border-gray-200 dark:border-[#022b5c] space-y-4">
                    <Button 
                      onClick={() => {
                        navigate("/login");
                        setMobileMenuOpen(false);
                      }}
                      variant="outline" 
                      className="w-full text-[rgb(8,42,90)] dark:text-white border-[rgb(8,42,90)] dark:border-white"
                    >
                      Sign In
                    </Button>
                    <Button 
                      onClick={() => {
                        navigate("/register");
                        setMobileMenuOpen(false);
                      }}
                      className="w-full bg-[#43EB3E] hover:bg-[#3ad036] text-black"
                    >
                      Sign Up
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
      
      {/* Main content */}
      <main className="flex-1">
        {/* Hero section */}
        <section className="relative py-16 bg-white dark:bg-[#01162f] overflow-hidden">
          {/* Decorative elements - similar to How It Works page */}
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
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-[rgb(8,42,90)] dark:text-white">Meet Our Team</h1>
            <p className="text-xl max-w-3xl mx-auto mb-12 text-[rgb(8,42,90)] dark:text-white">
              Get to know the passionate professionals behind Opian Rewards who are dedicated to enhancing your financial journey.
            </p>
          </div>
        </section>
        
        {/* Team Members Grid */}
        <section className="py-16 bg-gray-50 dark:bg-[#022b5c] relative overflow-hidden">
          {/* Background decorative elements */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Light mode decorations */}
            <div className="absolute -right-20 top-1/4 w-40 h-40 rounded-full bg-[#43EB3E]/5 dark:opacity-0"></div>
            <div className="absolute left-10 bottom-10 w-20 h-20 rounded-full bg-[#43EB3E]/5 dark:opacity-0"></div>
            
            {/* Dark mode decorations */}
            <div className="absolute -left-10 top-10 w-40 h-40 rounded-full bg-[#043375]/20 opacity-0 dark:opacity-100"></div>
            
            {/* Scattered small elements */}
            <div className="opacity-0 dark:opacity-100">
              <div className="absolute top-20 right-20 w-4 h-4 rounded-full bg-[#43EB3E]/10"></div>
              <div className="absolute bottom-40 right-1/4 w-6 h-1 rounded bg-[#43EB3E]/10"></div>
              <div className="absolute top-1/2 left-1/4 w-1 h-6 rounded bg-[#43EB3E]/10"></div>
            </div>
          </div>
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {teamMembers.map((member) => (
                <div 
                  key={member.id}
                  className="group relative overflow-hidden bg-white dark:bg-[#01162f] rounded-lg shadow-lg transform transition-all duration-300 hover:scale-105 hover:shadow-xl cursor-pointer"
                  onClick={() => setActiveTeamMember(member)}
                >
                  {/* Image */}
                  <div className="relative h-72 overflow-hidden">
                    <img 
                      src={member.image} 
                      alt={member.name}
                      className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
                      onError={(e) => {
                        const img = e.target as HTMLImageElement;
                        img.onerror = null;
                        img.src = '/kyle-mcbryne-300x300.png'; // Fallback to Kyle's image
                      }}
                    />
                    
                    {/* Hover overlay with name and title */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#01162f] via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-6">
                      <h3 className="text-xl font-bold text-white mb-1 transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">{member.name}</h3>
                      <p className="text-[#43EB3E] transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 delay-75">{member.title}</p>
                    </div>
                  </div>
                  
                  {/* Subtle indicator to click for more info */}
                  <div className="absolute top-2 right-2 w-8 h-8 rounded-full bg-[#43EB3E]/0 group-hover:bg-[#43EB3E]/20 flex items-center justify-center transform scale-0 group-hover:scale-100 transition-all duration-300">
                    <ChevronRight className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
        
        {/* Mission, Vision, Values Section */}
        <section className="py-16 bg-white dark:bg-[#01162f] text-[rgb(8,42,90)] dark:text-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">Our Mission, Vision and Values</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-gray-50 dark:bg-[#022b5c] p-8 rounded-lg shadow-md relative overflow-hidden transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#43EB3E]/5 rounded-bl-full"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-[#43EB3E]/10 rounded-full flex items-center justify-center mb-6">
                    <Compass className="h-8 w-8 text-[#43EB3E]" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Our Mission</h3>
                  <p className="text-[rgb(8,42,90)] dark:text-gray-300">
                    To enhance the lives of our members through innovative and accessible financial product offerings, building a community of empowered individuals.
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-[#022b5c] p-8 rounded-lg shadow-md relative overflow-hidden transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#43EB3E]/5 rounded-bl-full"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-[#43EB3E]/10 rounded-full flex items-center justify-center mb-6">
                    <Award className="h-8 w-8 text-[#43EB3E]" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Our Vision</h3>
                  <p className="text-[rgb(8,42,90)] dark:text-gray-300">
                    To establish a premier rewards loyalty program that effectively integrates essential financial products for our members, fostering economic wellbeing and growth.
                  </p>
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-[#022b5c] p-8 rounded-lg shadow-md relative overflow-hidden transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#43EB3E]/5 rounded-bl-full"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-[#43EB3E]/10 rounded-full flex items-center justify-center mb-6">
                    <Shield className="h-8 w-8 text-[#43EB3E]" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">Our Values</h3>
                  <p className="text-[rgb(8,42,90)] dark:text-gray-300">
                    Commitment, Trust, and Empowerment. We focus on creating transparent, mutually beneficial relationships that prioritize our members' financial success.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      {/* Team member details sheet that slides in when a team member is clicked */}
      <Sheet open={!!activeTeamMember} onOpenChange={(open) => !open && closeActiveTeamMember()}>
        <SheetContent side="right" className="sm:max-w-xl w-full p-0 overflow-auto bg-white dark:bg-[#01162f] border-l border-gray-200 dark:border-[#022b5c]">
          {activeTeamMember && (
            <div className="h-full flex flex-col">
              {/* Member image */}
              <div className="relative h-72 md:h-96 overflow-hidden">
                <img 
                  src={activeTeamMember.image} 
                  alt={activeTeamMember.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    const img = e.target as HTMLImageElement;
                    img.onerror = null;
                    img.src = '/kyle-mcbryne-300x300.png'; // Fallback to Kyle's image
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#01162f] to-transparent opacity-70"></div>
                
                {/* Close button */}
                <Button 
                  onClick={closeActiveTeamMember}
                  className="absolute top-4 right-4 rounded-full w-8 h-8 p-0 bg-black/50 hover:bg-black/70"
                  size="icon"
                  variant="ghost"
                >
                  <X className="h-4 w-4 text-white" />
                </Button>
              </div>
              
              {/* Member details */}
              <div className="p-6 flex-1">
                <div className="mb-6">
                  <h2 className="text-2xl md:text-3xl font-bold text-[rgb(8,42,90)] dark:text-white">{activeTeamMember.name}</h2>
                  <p className="text-[#43EB3E] text-lg">{activeTeamMember.title}</p>
                </div>
                
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-[#022b5c]/50 p-4 rounded-lg">
                    <h3 className="font-semibold text-[rgb(8,42,90)] dark:text-white mb-2">About</h3>
                    <p className="text-[rgb(8,42,90)] dark:text-gray-300">
                      {activeTeamMember.description}
                    </p>
                  </div>
                  
                  {/* Additional sections could be added here if more details become available */}
                  
                  {/* Decorative elements */}
                  <div className="absolute bottom-6 left-6 opacity-10">
                    <div className="w-16 h-1 bg-[#43EB3E] rounded mb-2"></div>
                    <div className="w-10 h-1 bg-[#43EB3E] rounded mb-2"></div>
                    <div className="w-6 h-1 bg-[#43EB3E] rounded"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
      
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