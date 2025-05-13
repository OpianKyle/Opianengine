import React, { useState, useEffect } from "react";
import { useTheme } from "@/providers/theme-provider";
import { useLocation, Link } from "wouter";
import { 
  Menu, 
  X,
  Users,
  Compass,
  Shield,
  Award,
  Phone,
  Mail,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { useUser } from "@/hooks/use-user";
import MetaTags from "@/components/seo/meta-tags";
import { StructuredData } from "@/components/seo/structured-data";
import { useAnalytics } from "@/hooks/use-analytics";
import { trackEvent } from "@/lib/analytics";

// Define the type for team members
interface TeamMember {
  id: number;
  name: string;
  title: string;
  description: string;
  image: string;
}

export default function TeamPage() {
  const { user, isLoading } = useUser();
  const { theme } = useTheme();
  const [location, navigate] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  // Track page views
  useAnalytics();
  
  // Track page visit
  useEffect(() => {
    trackEvent('page_view', 'engagement', 'meet_the_team');
  }, []);
  
  // Team member data
  const teamMembers: TeamMember[] = [
    {
      id: 1,
      name: "Lance Heynes",
      title: "Director of Operations",
      description: "Lance ensures the seamless integration of our services to enhance member satisfaction and engagement. With over 10 years of experience in operations management, Lance has developed efficient systems that prioritize both member benefits and company growth. His expertise in customer experience design has been instrumental in shaping the rewarding journey that our members enjoy.",
      image: "/Lance.jpg"
    },
    {
      id: 2,
      name: "Andre Visser",
      title: "Head of Marketing",
      description: "Andre crafts innovative strategies to promote our reward programs, helping our members maximize their benefits. His background in digital marketing and consumer psychology gives him unique insights into creating campaigns that truly resonate with our audience. Andre believes in data-driven approaches combined with creative storytelling to showcase the value of our rewards platform.",
      image: "/Andre.jpg"
    },
    {
      id: 3,
      name: "Wessel Krige",
      title: "Social Media Manager",
      description: "Wessel focuses on building strong relationships with our members via all social media channels, ensuring they understand and utilize their rewards. He has pioneered our community engagement approach, creating spaces where members can share experiences and tips with each other. Wessel's content strategy emphasizes educational content that helps members get the most value from their membership.",
      image: "/Wessel.jpg"
    },
    {
      id: 4,
      name: "Mic-Shane Brown",
      title: "Head of Admin",
      description: "Mic-Shane focuses on managing internal systems and the team that ensures an unparalleled and rewarding customer experience. His attention to detail and process optimization skills have created a seamless administrative backbone for our operations. Mic-Shane leads a dedicated team that handles everything from member inquiries to complex reward tracking scenarios.",
      image: "/Mic-Shane.jpg"
    },
    {
      id: 5,
      name: "Lionel Lottering",
      title: "Head of Investor Matters",
      description: "Lionel looks after our investors and ensures the establishment of win-win relationships between investors and the company. With a background in finance and business development, he maintains transparency and alignment between company growth and investor expectations. Lionel has been instrumental in securing the funding that powers our rewards innovation.",
      image: "/Lionel.jpg"
    },
    {
      id: 6,
      name: "Shannon Heugh",
      title: "Client Services Specialist",
      description: "Shannon is responsible for data management and ensuring communications that result in an amazing customer service journey. Her meticulous approach to member data ensures that rewards are accurately tracked and delivered. Shannon works closely with our systems team to continuously improve the member experience through data-driven insights.",
      image: "/Shannon.jpg"
    },
    {
      id: 7,
      name: "Jodi Rensburg",
      title: "Client Services Specialist",
      description: "Jodi is responsible for data management and ensuring communications that result in an amazing customer service journey. Her expertise in customer communications has helped develop our personalized notification system that keeps members informed about their rewards opportunities. Jodi believes that timely, relevant communication is key to member satisfaction.",
      image: "/Jodie.jpg"
    },
    {
      id: 8,
      name: "Cheslin Matinka",
      title: "Client Consultant",
      description: "Cheslin is responsible for sales and client interactions that ensured our clients have an amazing customer service journey. His consultative approach helps match prospective members with the perfect package for their needs. Cheslin's deep knowledge of our rewards ecosystem allows him to demonstrate exactly how each member can maximize their benefits.",
      image: "/Cheslin.jpg"
    },
    {
      id: 9,
      name: "Kyle McBryne",
      title: "Systems Developer", 
      description: "Kyle is responsible for our programs and systems and ensures the smooth workflows that empower our clients with the correct data. His technical expertise has created the robust platform that powers our rewards tracking and delivery. Kyle continuously innovates to add new features that enhance the member experience and streamline internal operations.",
      image: "/Kyle.jpg"
    },
    {
      id: 10,
      name: "Jamie Koen",
      title: "Business Development Specialist", 
      description: "Jamie specializes in optimizing our business operations and implementing strategic initiatives that drive growth and efficiency. With a keen eye for process improvement and a talent for cross-departmental coordination, Jamie ensures that our business objectives align with our commitment to delivering exceptional value to our members.",
      image: "/Jamie.jpg"
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#01162f] flex flex-col">
      {/* SEO Optimization */}
      <MetaTags 
        title="Meet Our Team - Opian Rewards"
        description="Meet the dedicated team behind Opian Rewards. Our experienced professionals are committed to providing exceptional service and innovative insurance and rewards solutions."
        ogType="website"
      />
      
      <StructuredData 
        type="AboutPage"
        data={{
          name: "Meet the Opian Rewards Team",
          description: "Our team of experienced professionals is dedicated to providing exceptional service",
          mainEntity: {
            "@type": "Organization",
            name: "Opian Rewards",
            member: teamMembers.map(member => ({
              "@type": "Person",
              name: member.name,
              jobTitle: member.title,
              description: member.description.substring(0, 150) + "...",
              image: `https://www.opianrewards.com${member.image}`
            }))
          }
        }}
      />
      
      {/* Header */}
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
            <nav className="hidden lg:flex space-x-8 justify-center">
              <a href="/" className="text-foreground dark:text-white hover:text-[#43EB3E] transition-colors">Home</a>
              <a href="/how-it-works" className="text-foreground dark:text-white hover:text-[#43EB3E] transition-colors">How It Works</a>
              <a href="/meet-the-team" className="text-[#43EB3E] font-medium">Meet The Team</a>
              <a href="#" className="text-foreground dark:text-white hover:text-[#43EB3E] transition-colors">FAQ</a>
            </nav>
            
            {/* Desktop buttons */}
            <div className="hidden lg:flex items-center space-x-4 justify-center">
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
              <nav className="flex flex-col space-y-3 items-center text-center">
                <a 
                  href="/" 
                  className="text-foreground dark:text-white hover:text-[#43EB3E] px-2 py-1.5 rounded-md hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors w-full text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </a>
                <a 
                  href="/how-it-works" 
                  className="text-foreground dark:text-white hover:text-[#43EB3E] px-2 py-1.5 rounded-md hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors w-full text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  How It Works
                </a>
                <a 
                  href="/meet-the-team" 
                  className="text-[#43EB3E] px-2 py-1.5 rounded-md hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors w-full text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Meet The Team
                </a>
                <a 
                  href="#" 
                  className="text-foreground dark:text-white hover:text-[#43EB3E] px-2 py-1.5 rounded-md hover:bg-gray-100/50 dark:hover:bg-gray-800/50 transition-colors w-full text-center"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  FAQ
                </a>
              </nav>
              
              <div className="flex space-x-2 pt-2 border-t border-gray-100 dark:border-gray-800 justify-center">
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
      
      {/* Main content */}
      <main className="flex-1">
        {/* Hero section */}
        <section className="relative py-8 bg-white dark:bg-[#01162f] overflow-hidden">
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
        
        {/* Mission, Vision, Values Section */}
        <section className="py-8 bg-white dark:bg-[#01162f] text-[rgb(8,42,90)] dark:text-white">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center">Our Mission, Vision and Values</h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="bg-[#022b5c] p-8 rounded-lg shadow-md relative overflow-hidden transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                {/* Background image with overlay */}
                <div className="absolute inset-0 z-0">
                  <img 
                    src="/FlashingtheOpiancard.png" 
                    alt="Our Mission" 
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-[#022b5c]/75"></div>
                </div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#43EB3E]/5 rounded-bl-full z-10"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-[#43EB3E]/10 rounded-full flex items-center justify-center mb-6">
                    <Compass className="h-8 w-8 text-[#43EB3E]" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-white">Our Mission</h3>
                  <p className="text-gray-300">
                    To enhance the lives of our members through innovative and accessible financial product offerings, building a community of empowered individuals.
                  </p>
                </div>
              </div>
              
              <div className="bg-[#022b5c] p-8 rounded-lg shadow-md relative overflow-hidden transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                {/* Background image with overlay */}
                <div className="absolute inset-0 z-0">
                  <img 
                    src="/jane-holding-card-2.jpg" 
                    alt="Our Vision" 
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-[#022b5c]/75"></div>
                </div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#43EB3E]/5 rounded-bl-full z-10"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-[#43EB3E]/10 rounded-full flex items-center justify-center mb-6">
                    <Shield className="h-8 w-8 text-[#43EB3E]" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-white">Our Vision</h3>
                  <p className="text-gray-300">
                    To be the leading rewards platform that transforms ordinary financial interactions into extraordinary opportunities for growth and prosperity.
                  </p>
                </div>
              </div>
              
              <div className="bg-[#022b5c] p-8 rounded-lg shadow-md relative overflow-hidden transform transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
                {/* Background image with overlay */}
                <div className="absolute inset-0 z-0">
                  <img 
                    src="/jane-holding-card-1.jpg" 
                    alt="Our Values" 
                    className="w-full h-full object-cover opacity-60"
                  />
                  <div className="absolute inset-0 bg-[#022b5c]/75"></div>
                </div>
                <div className="absolute top-0 right-0 w-20 h-20 bg-[#43EB3E]/5 rounded-bl-full z-10"></div>
                <div className="relative z-10">
                  <div className="w-16 h-16 bg-[#43EB3E]/10 rounded-full flex items-center justify-center mb-6">
                    <Award className="h-8 w-8 text-[#43EB3E]" />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-white">Our Values</h3>
                  <p className="text-gray-300">
                    Integrity, innovation, inclusivity, and excellence guide everything we do. We believe in creating meaningful value for every member through transparency and commitment.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Team Members Grid Section */}
        <section className="py-12 bg-[#f5f7fa] dark:bg-[#01162f] text-[rgb(8,42,90)] dark:text-white relative overflow-hidden transition-colors duration-300">
          {/* Background decorative elements */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Light mode decorations */}
            <div className="absolute -right-20 top-1/4 w-40 h-40 rounded-full bg-[#43EB3E]/5 dark:opacity-0"></div>
            <div className="absolute left-10 bottom-10 w-20 h-20 rounded-full bg-[#43EB3E]/5 dark:opacity-0"></div>
            <div className="absolute top-20 right-20 w-4 h-4 rounded-full bg-[#43EB3E]/10 dark:opacity-0"></div>
            <div className="absolute bottom-40 right-1/4 w-6 h-1 rounded bg-[#43EB3E]/10 dark:opacity-0"></div>
            <div className="absolute top-1/2 left-1/4 w-1 h-6 rounded bg-[#43EB3E]/10 dark:opacity-0"></div>
            
            {/* Dark mode decorations */}
            <div className="absolute -left-10 top-10 w-40 h-40 rounded-full bg-[#043375]/20 opacity-0 dark:opacity-100"></div>
            
            {/* Scattered small elements - dark mode only */}
            <div className="opacity-0 dark:opacity-100">
              <div className="absolute top-20 right-20 w-4 h-4 rounded-full bg-[#43EB3E]/10"></div>
              <div className="absolute bottom-40 right-1/4 w-6 h-1 rounded bg-[#43EB3E]/10"></div>
              <div className="absolute top-1/2 left-1/4 w-1 h-6 rounded bg-[#43EB3E]/10"></div>
            </div>
          </div>
          
          {/* Team Member Grid Container */}
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-10">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Meet Our Leadership Team</h2>
              <p className="text-xl max-w-3xl mx-auto text-gray-600 dark:text-gray-300">
                The passionate professionals who drive Opian's vision and ensure excellence in all our services.
              </p>
              <div className="flex items-center justify-center gap-2 mt-4">
                <span className="inline-flex items-center text-[#43EB3E]">
                  <Users className="h-4 w-4 mr-1" />
                  Click on any team member to learn more
                </span>
              </div>
            </div>
            
            {/* Team Members Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {teamMembers.map((member) => (
                <Dialog key={member.id}>
                  <DialogTrigger asChild>
                    <div 
                      className="bg-[#011d3d] rounded-lg overflow-hidden cursor-pointer transition-transform duration-300 hover:scale-105 hover:shadow-xl"
                    >
                      <div className="flex flex-col items-center py-8 px-6">
                        {/* Circular image */}
                        <div className="w-52 h-52 rounded-full overflow-hidden mb-4 border-2 border-[#43EB3E]/20">
                          <img 
                            src={member.image} 
                            alt={member.name} 
                            className={`w-full h-full object-cover ${
                              member.name === "Lance Heynes" || 
                              member.name === "Mic-Shane Brown" || 
                              member.name === "Lionel Lottering" 
                                ? "object-top" 
                                : "object-center"
                            }`}
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.onerror = null;
                              img.src = '/Kyle-McBryne.png';
                            }}
                          />
                        </div>
                        
                        {/* Name and title */}
                        <h3 className="text-white text-xl font-semibold text-center mb-1">{member.name}</h3>
                        <p className="text-[#43EB3E] text-sm text-center mb-4">{member.title}</p>
                        
                        {/* Short description */}
                        <p className="text-gray-300 text-sm text-center">
                          {member.description.length > 120 
                            ? `${member.description.substring(0, 120)}...` 
                            : member.description
                          }
                        </p>
                      </div>
                    </div>
                  </DialogTrigger>
                  
                  <DialogContent className="max-w-3xl p-0 bg-[rgb(8,42,90)] dark:bg-[#01162f] border-[rgb(8,42,90)]/40 dark:border-[#022b5c] text-white overflow-hidden [&>button]:hidden">
                    <div className="md:flex">
                      <div className="hidden md:block md:w-2/5">
                        <div className="h-64 md:h-full">
                          <img 
                            src={member.image} 
                            alt={member.name} 
                            className={`w-full h-full object-cover ${
                              member.name === "Lance Heynes" || 
                              member.name === "Mic-Shane Brown" || 
                              member.name === "Lionel Lottering" 
                                ? "object-top" 
                                : "object-center"
                            }`}
                            onError={(e) => {
                              const img = e.target as HTMLImageElement;
                              img.onerror = null;
                              img.src = '/Kyle-McBryne.png';
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="p-6 sm:p-8 w-full md:w-3/5">
                        <DialogHeader className="mb-4">
                          <div>
                            <DialogTitle className="text-2xl font-bold mb-1 text-white">
                              {member.name}
                            </DialogTitle>
                            <DialogDescription className="text-[#43EB3E] font-medium text-base">
                              {member.title}
                            </DialogDescription>
                          </div>
                        </DialogHeader>
                        
                        <div className="text-gray-200">
                          <p>{member.description}</p>
                        </div>
                        
                        {/* Close buttons - different styles for mobile and desktop */}
                        <div className="mt-8 flex justify-end">
                          <DialogClose asChild>
                            <button className="md:hidden inline-flex px-4 py-2.5 bg-white/10 text-white rounded-md hover:bg-white/20 transition-colors">
                              Close
                            </button>
                          </DialogClose>
                          <DialogClose asChild>
                            <button className="hidden md:inline-flex px-4 py-2.5 bg-[#43EB3E]/20 text-[#43EB3E] rounded-md hover:bg-[#43EB3E]/30 transition-colors">
                              Close
                            </button>
                          </DialogClose>
                        </div>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              ))}
            </div>
          </div>
        </section>
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-100 dark:bg-[#01162f] text-gray-600 dark:text-gray-300 py-12">
        <div className="container mx-auto px-4">
          <div className="flex justify-center w-full mb-8">
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-8 text-center lg:text-left">
            {/* Left column - Contact Information */}
            <div className="md:col-span-2 lg:col-span-1 flex flex-col items-center lg:items-start">
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
              <div className="flex flex-col items-center lg:items-center">
                <h3 className="text-lg font-semibold mb-4">Packages</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Opportunity</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Momentum</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Prosper</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Prestige</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Pinnacle</a></li>
                </ul>
              </div>
              <div className="flex flex-col items-center lg:items-center">
                <h3 className="text-lg font-semibold mb-4">Resources</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Help Center</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">FAQs</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Blog</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Contact</a></li>
                </ul>
              </div>
              <div className="flex flex-col items-center lg:items-center">
                <h3 className="text-lg font-semibold mb-4">Legal</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Cookie Policy</a></li>
                </ul>
              </div>
            </div>
            
            {/* Right column - Legal Information */}
            <div className="md:col-span-2 lg:col-span-1 flex flex-col items-center lg:items-start">
              <h3 className="font-semibold mb-4">Legal Information</h3>
              <div className="text-center lg:text-left w-full max-w-xs">
                <p className="mb-2 text-sm">Opian Rewards (Pty) Ltd is a Juristic Representative of Opian Financial Services (Pty) Ltd</p>
                <p className="mb-2 text-sm">Company Registration Number: 2021/411623/07</p>
                <p className="mb-2 text-sm">Opian Financial Services (Pty) Ltd is an Authorised Financial Services Provider</p>
                <p className="mb-2 text-sm">Company Registration Number: 2018/584168/07</p>
                <p className="text-sm">FSP No: 50974</p>
              </div>
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