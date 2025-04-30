import React, { useState, useRef, useEffect } from "react";
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
  
  // Carousel state
  const [activeIndex, setActiveIndex] = useState(0);
  const [expandedMember, setExpandedMember] = useState<number | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);

  // Team member data
  const teamMembers: TeamMember[] = [
    {
      id: 1,
      name: "Lance Heynes",
      title: "Director of Operations",
      description: "Lance ensures the seamless integration of our services to enhance member satisfaction and engagement. With over 10 years of experience in operations management, Lance has developed efficient systems that prioritize both member benefits and company growth. His expertise in customer experience design has been instrumental in shaping the rewarding journey that our members enjoy.",
      image: "/kyle-mcbryne-300x300.png"
    },
    {
      id: 2,
      name: "Andre Visser",
      title: "Head of Marketing",
      description: "Andre crafts innovative strategies to promote our reward programs, helping our members maximize their benefits. His background in digital marketing and consumer psychology gives him unique insights into creating campaigns that truly resonate with our audience. Andre believes in data-driven approaches combined with creative storytelling to showcase the value of our rewards platform.",
      image: "/kyle-mcbryne-300x300.png"
    },
    {
      id: 3,
      name: "Wessel Krige",
      title: "Social Media Manager",
      description: "Wessel focuses on building strong relationships with our members via all social media channels, ensuring they understand and utilize their rewards. He has pioneered our community engagement approach, creating spaces where members can share experiences and tips with each other. Wessel's content strategy emphasizes educational content that helps members get the most value from their membership.",
      image: "/kyle-mcbryne-300x300.png"
    },
    {
      id: 4,
      name: "Mic-Shane Brown",
      title: "Head of Admin",
      description: "Mic-Shane focuses on managing internal systems and the team that ensures an unparalleled and rewarding customer experience. His attention to detail and process optimization skills have created a seamless administrative backbone for our operations. Mic-Shane leads a dedicated team that handles everything from member inquiries to complex reward tracking scenarios.",
      image: "/kyle-mcbryne-300x300.png"
    },
    {
      id: 5,
      name: "Lionel Lottering",
      title: "Head of Investor Matters",
      description: "Lionel looks after our investors and ensures the establishment of win-win relationships between investors and the company. With a background in finance and business development, he maintains transparency and alignment between company growth and investor expectations. Lionel has been instrumental in securing the funding that powers our rewards innovation.",
      image: "/kyle-mcbryne-300x300.png"
    },
    {
      id: 6,
      name: "Shannon Heugh",
      title: "Client Services Specialist",
      description: "Shannon is responsible for data management and ensuring communications that result in an amazing customer service journey. Her meticulous approach to member data ensures that rewards are accurately tracked and delivered. Shannon works closely with our systems team to continuously improve the member experience through data-driven insights.",
      image: "/kyle-mcbryne-300x300.png"
    },
    {
      id: 7,
      name: "Jodi Rensburg",
      title: "Client Services Specialist",
      description: "Jodi is responsible for data management and ensuring communications that result in an amazing customer service journey. Her expertise in customer communications has helped develop our personalized notification system that keeps members informed about their rewards opportunities. Jodi believes that timely, relevant communication is key to member satisfaction.",
      image: "/kyle-mcbryne-300x300.png"
    },
    {
      id: 8,
      name: "Cheslin Matinka",
      title: "Client Consultant",
      description: "Cheslin is responsible for sales and client interactions that ensured our clients have an amazing customer service journey. His consultative approach helps match prospective members with the perfect package for their needs. Cheslin's deep knowledge of our rewards ecosystem allows him to demonstrate exactly how each member can maximize their benefits.",
      image: "/kyle-mcbryne-300x300.png"
    },
    {
      id: 9,
      name: "Kyle McBryne",
      title: "Systems Developer", 
      description: "Kyle is responsible for our programs and systems and ensures the smooth workflows that empower our clients with the correct data. His technical expertise has created the robust platform that powers our rewards tracking and delivery. Kyle continuously innovates to add new features that enhance the member experience and streamline internal operations.",
      image: "/kyle-mcbryne-300x300.png"
    },
  ];

  // Functions to navigate carousel
  const goToNext = () => {
    setActiveIndex((prevIndex) => (prevIndex + 1) % teamMembers.length);
    setExpandedMember(null);
  };

  const goToPrev = () => {
    setActiveIndex((prevIndex) => (prevIndex - 1 + teamMembers.length) % teamMembers.length);
    setExpandedMember(null);
  };

  const toggleMemberExpand = (memberId: number) => {
    setExpandedMember(expandedMember === memberId ? null : memberId);
  };

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
        
        {/* Team Members Carousel Section */}
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
          
          {/* Team Member Carousel Container */}
          <div className="container mx-auto px-4 relative z-10">
            <div className="relative">
              {/* Carousel Navigation Buttons */}
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/80 dark:bg-[#01162f]/80 text-[rgb(8,42,90)] dark:text-white hover:bg-white dark:hover:bg-[#01162f] rounded-full shadow-lg"
                onClick={goToPrev}
              >
                <ChevronLeft className="h-6 w-6" />
              </Button>
              
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute right-4 top-1/2 transform -translate-y-1/2 z-20 bg-white/80 dark:bg-[#01162f]/80 text-[rgb(8,42,90)] dark:text-white hover:bg-white dark:hover:bg-[#01162f] rounded-full shadow-lg"
                onClick={goToNext}
              >
                <ChevronRight className="h-6 w-6" />
              </Button>
              
              {/* Carousel Track */}
              <div 
                ref={carouselRef}
                className="relative overflow-hidden"
                style={{ 
                  height: expandedMember !== null ? "600px" : "400px",
                  transition: "height 0.5s ease-in-out"
                }}
              >
                <div 
                  className="absolute w-full flex transition-transform duration-500 ease-in-out"
                  style={{ 
                    transform: `translateX(${-activeIndex * 100}%)`,
                  }}
                >
                  {teamMembers.map((member, index) => {
                    // Calculate the position relative to active index
                    const isActive = index === activeIndex;
                    const distanceFromActive = Math.min(
                      Math.abs(index - activeIndex),
                      Math.abs(index - activeIndex - teamMembers.length),
                      Math.abs(index - activeIndex + teamMembers.length)
                    );
                    
                    // Determine if this member is expanded
                    const isExpanded = expandedMember === member.id;
                    
                    return (
                      <div 
                        key={member.id}
                        className={`w-full flex-shrink-0 flex flex-col items-center transition-all duration-500 ease-in-out ${isExpanded ? 'justify-start' : 'justify-center'}`}
                        style={{ 
                          opacity: 1 - (distanceFromActive * 0.2),
                          transform: `scale(${isActive ? 1 : 0.8 - (distanceFromActive * 0.1)})`,
                          zIndex: teamMembers.length - distanceFromActive,
                          pointerEvents: distanceFromActive <= 2 ? 'auto' : 'none',
                        }}
                      >
                        {/* Member Card */}
                        <div 
                          className={`relative overflow-hidden rounded-lg shadow-lg transition-all duration-500 ${
                            isExpanded ? 'w-4/5 mx-auto bg-white dark:bg-[#01162f]' : 'w-64 sm:w-72 md:w-80 cursor-pointer bg-white dark:bg-[#01162f]'
                          }`}
                          onClick={() => !isExpanded && isActive && toggleMemberExpand(member.id)}
                        >
                          {/* Image Container */}
                          <div className={`relative ${isExpanded ? 'h-64 w-full md:w-1/3 md:h-auto md:absolute md:left-0 md:top-0 md:bottom-0' : 'h-64'}`}>
                            <img 
                              src={member.image} 
                              alt={member.name}
                              className={`w-full h-full object-cover transition-transform duration-500 ${isActive && !isExpanded ? 'hover:scale-105' : ''}`}
                              onError={(e) => {
                                const img = e.target as HTMLImageElement;
                                img.onerror = null;
                                img.src = '/kyle-mcbryne-300x300.png';
                              }}
                            />
                            
                            {/* Name and Title Overlay */}
                            {!isExpanded && (
                              <div className="absolute inset-0 bg-gradient-to-t from-[#01162f] via-[#01162f]/40 to-transparent flex flex-col justify-end p-6">
                                <h3 className="text-xl font-bold text-white mb-1">{member.name}</h3>
                                <p className="text-[#43EB3E]">{member.title}</p>
                              </div>
                            )}
                            
                            {/* Expanded View Close Button */}
                            {isExpanded && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-2 right-2 md:hidden bg-white/80 dark:bg-[#01162f]/80 text-[#01162f] dark:text-white hover:bg-white/90 dark:hover:bg-[#01162f]/90 rounded-full"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleMemberExpand(member.id);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                          
                          {/* Member Details - Only shown when expanded */}
                          {isExpanded && (
                            <div className={`p-6 ${isExpanded ? 'md:ml-1/3 md:pl-[calc(33%+1.5rem)]' : ''}`}>
                              <div className="md:flex md:justify-between md:items-start">
                                <div>
                                  <h3 className="text-2xl font-bold text-[rgb(8,42,90)] dark:text-white mb-1">{member.name}</h3>
                                  <p className="text-[#43EB3E] text-lg mb-4">{member.title}</p>
                                </div>
                                
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="hidden md:flex bg-white/80 dark:bg-[#01162f]/80 text-[#01162f] dark:text-white hover:bg-white/90 dark:hover:bg-[#01162f]/90 rounded-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleMemberExpand(member.id);
                                  }}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                              
                              <p className="text-[rgb(8,42,90)] dark:text-gray-200 mb-4">{member.description}</p>
                              
                              <div className="border-t border-gray-200 dark:border-[#022b5c] pt-4 mt-4">
                                <h4 className="font-medium mb-2 text-[rgb(8,42,90)] dark:text-white">Connect with {member.name.split(' ')[0]}</h4>
                                <div className="flex space-x-3">
                                  <Button variant="outline" size="sm" className="text-[rgb(8,42,90)] dark:text-white border-[rgb(8,42,90)] dark:border-white">
                                    LinkedIn
                                  </Button>
                                  <Button variant="outline" size="sm" className="text-[rgb(8,42,90)] dark:text-white border-[rgb(8,42,90)] dark:border-white">
                                    Email
                                  </Button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {/* Indicator for active member */}
                        {isActive && !isExpanded && (
                          <div className="mt-4 flex items-center justify-center space-x-1">
                            <div className="h-1.5 w-1.5 rounded-full bg-[#43EB3E]"></div>
                            <div className="h-1.5 w-1.5 rounded-full bg-[#43EB3E]/50"></div>
                            <div className="h-1.5 w-1.5 rounded-full bg-[#43EB3E]/25"></div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Carousel Indicators */}
              <div className="flex justify-center mt-6 space-x-2">
                {teamMembers.map((_, index) => (
                  <button
                    key={index}
                    className={`h-2 rounded-full transition-all ${
                      index === activeIndex ? 'w-6 bg-[#43EB3E]' : 'w-2 bg-[#43EB3E]/30'
                    }`}
                    onClick={() => {
                      setActiveIndex(index);
                      setExpandedMember(null);
                    }}
                  />
                ))}
              </div>
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
      
      {/* Footer */}
      <footer className="bg-white dark:bg-[#011d3d] text-[rgb(8,42,90)] dark:text-white py-16">
        <div className="container mx-auto px-6">
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
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Privacy Policy</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Terms of Service</a></li>
                  <li><a href="#" className="text-gray-500 dark:text-gray-400 hover:text-[#43EB3E] transition-colors">Disclaimer</a></li>
                </ul>
              </div>
            </div>
            
            {/* Right column - Social Media */}
            <div className="lg:w-1/4 text-right">
              <h3 className="font-semibold mb-4 text-left lg:text-right">Follow Us</h3>
              <div className="flex justify-start lg:justify-end space-x-4">
                <a href="#" className="w-10 h-10 rounded-full bg-[#43EB3E]/10 flex items-center justify-center hover:bg-[#43EB3E]/20 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="text-[#43EB3E]" viewBox="0 0 16 16">
                    <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-[#43EB3E]/10 flex items-center justify-center hover:bg-[#43EB3E]/20 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="text-[#43EB3E]" viewBox="0 0 16 16">
                    <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-[#43EB3E]/10 flex items-center justify-center hover:bg-[#43EB3E]/20 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="text-[#43EB3E]" viewBox="0 0 16 16">
                    <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z"/>
                  </svg>
                </a>
                <a href="#" className="w-10 h-10 rounded-full bg-[#43EB3E]/10 flex items-center justify-center hover:bg-[#43EB3E]/20 transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" className="text-[#43EB3E]" viewBox="0 0 16 16">
                    <path d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z"/>
                  </svg>
                </a>
              </div>
              <div className="mt-8 text-left lg:text-right text-sm text-gray-500 dark:text-gray-400">
                <p>© 2025 Opian Rewards. All rights reserved.</p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}