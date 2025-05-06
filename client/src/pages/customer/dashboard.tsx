import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import PointsDisplay from "@/components/shared/points-display";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { queryClient } from "@/lib/queryClient";
import { useState } from "react";
import ReferralSection from "@/components/shared/referral-section";
import { formatTransactionType } from "@/lib/utils";
import { Package as PackageIcon, Award, DollarSign } from "lucide-react";
import CustomerTour from "@/components/onboarding/CustomerTour";
import { useOnboarding, OnboardingProvider } from "@/contexts/OnboardingContext";
import AnimatedMetric from "@/components/shared/animated-metric";

interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  points: number;
  selectedPackage?: string;
}

interface Transaction {
  id: number;
  points: number;
  description: string;
  createdAt: string;
  type?: string;
}

const getTierInfo = (points: number): { name: string; color: string; nextTier?: { name: string; pointsNeeded: number } } => {
  // Ensure points is a number
  const numPoints = typeof points === 'number' ? points : Number(points || 0);

  if (numPoints >= 150000) {
    return {
      name: "Platinum",
      color: "bg-gradient-to-r from-purple-400 to-gray-300 text-white",
    };
  }
  if (numPoints >= 100000) {
    return {
      name: "Gold",
      color: "bg-yellow-500 text-white",
      nextTier: { name: "Platinum", pointsNeeded: 150000 - numPoints },
    };
  }
  if (numPoints >= 50000) {
    return {
      name: "Purple",
      color: "bg-purple-500 text-white",
      nextTier: { name: "Gold", pointsNeeded: 100000 - numPoints },
    };
  }
  if (numPoints >= 10000) {
    return {
      name: "Silver",
      color: "bg-gray-400 text-white",
      nextTier: { name: "Purple", pointsNeeded: 50000 - numPoints },
    };
  }
  return {
    name: "Bronze",
    color: "bg-amber-600 text-white",
    nextTier: { name: "Silver", pointsNeeded: 10000 - numPoints },
  };
};

function CustomerDashboardContent() {
  // Use the onboarding context but don't access until we know the user is logged in
  const onboarding = useOnboarding();
  
  const { data: user, isLoading: isUserLoading } = useQuery<User>({
    queryKey: ["/api/customer/points"],
    queryFn: async () => {
      const response = await fetch("/api/customer/points", {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("Failed to fetch user points");
      }
      const data = await response.json();
      console.log('Fetched user points:', {
        points: data.points,
        pointsType: typeof data.points
      });
      return data;
    }
  });
  
  // Check if user has access to the referral program (case-insensitive)
  const hasReferralAccess = user?.selectedPackage && 
    ['PROSPER', 'PRESTIGE', 'PINNACLE'].includes(user.selectedPackage?.toUpperCase());
  
  // Log package access for debugging purposes
  if (user?.selectedPackage) {
    console.log(`Package access check: ${user.selectedPackage} (upper: ${user.selectedPackage.toUpperCase()}) - Access: ${hasReferralAccess}`);
  }

  const { data: transactions, isLoading: isTransactionsLoading } = useQuery<Transaction[]>({
    queryKey: ["/api/customer/transactions"],
    queryFn: async () => {
      const response = await fetch("/api/customer/transactions", {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("Failed to fetch transactions");
      }
      return response.json();
    }
  });

  const [pointsToRedeem, setPointsToRedeem] = useState<number>(0);
  const { toast } = useToast();

  const redeemCashMutation = useMutation({
    mutationFn: async (points: number) => {
      const res = await fetch("/api/rewards/redeem-cash", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ points }),
        credentials: 'include'
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/customer/points"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customer/transactions"] });
      toast({
        title: "Success",
        description: `Successfully redeemed R${(pointsToRedeem * 0.015).toFixed(2)}`,
      });
      setPointsToRedeem(0);
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const points = typeof user?.points === 'number' ? user.points : Number(user?.points || 0);
  const tierInfo = getTierInfo(points);
  const randValue = (pointsToRedeem * 0.015).toFixed(2);
  const canRedeem = pointsToRedeem > 0 && pointsToRedeem <= points;

  // Get current time of day
  const currentDate = new Date();
  const timeOfDay = currentDate.getHours() < 12 ? 'morning' : currentDate.getHours() < 17 ? 'afternoon' : 'evening';

  return (
    <div className="space-y-6">
      {/* Tour Component */}
      <CustomerTour />
      
      {/* Header with user welcome */}
      <div className="flex justify-between items-center mb-8 mt-2 px-2">
        <div className="space-y-1">
          <h2 className="text-xl font-medium text-muted-foreground">
            Good {timeOfDay}, {user ? `${user.firstName} ${user.lastName}` : 'Welcome back'}
          </h2>
          <h1 className="text-2xl font-bold text-[#1b75bc]">OPIAN Rewards Dashboard</h1>
        </div>
        <div className="hidden md:block">
          <p className="text-xs text-muted-foreground">Last updated: {new Date().toLocaleDateString()} @ {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
        </div>
      </div>

      {/* Profile Balance Section */}
      <Card className="bg-[#011d3d] border-[#022b5c] text-white shadow-md overflow-hidden">
        <CardHeader>
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <img src="/opian-logo-white.png" alt="Opian" className="h-10 w-auto" />
            </div>
            <CardTitle className="text-white text-xl">Your Profile Balance</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold text-white">R{((points || 0) * 0.015).toFixed(2)}</div>
            <Button className="bg-[#43EB3E] hover:bg-[#3ad036] text-[#011d3d] ml-auto">
              Top-Up Balance
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Grid Layout for Card Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card Activity */}
        <Card className="bg-[#011d3d] border-[#022b5c] text-white shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-white">Card Activity</CardTitle>
            <p className="text-xs text-slate-400">Last Updated: {new Date().toLocaleDateString()} @ {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center p-4">
              <div className="relative w-32 h-32">
                <div className="absolute inset-0 rounded-full border-4 border-slate-700"></div>
                <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#43EB3E] border-r-blue-500 border-b-purple-500 transform rotate-45"></div>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-sm font-medium text-slate-300">Points</span>
                    <p className="text-xl font-bold">{points?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-wrap justify-around mt-2 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-[#43EB3E]"></div>
                <span className="text-xs">Deposits</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span className="text-xs">Referrals</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                <span className="text-xs">Bonuses</span>
              </div>
            </div>
            <div className="mt-4 text-center">
              <Button variant="outline" className="text-white border-slate-600 text-xs hover:bg-slate-800">
                VIEW INACTIVE CARDS
              </Button>
            </div>
          </CardContent>
        </Card>
        
        {/* Profile Activity */}
        <Card className="bg-[#011d3d] border-[#022b5c] text-white shadow-md overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-white">Profile Activity</CardTitle>
            <p className="text-xs text-slate-400">Last Updated: {new Date().toLocaleDateString()} @ {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</p>
          </CardHeader>
          <CardContent>
            <div className="relative h-[200px] mt-2 px-4">
              {/* Simplified line chart */}
              <div className="absolute bottom-0 left-0 right-0 h-px bg-slate-700"></div>
              <div className="absolute left-0 bottom-0 top-0 w-px bg-slate-700"></div>
              
              {/* Activity line path */}
              <div className="absolute bottom-[20px] left-[20px] w-[calc(100%-40px)] h-[140px]">
                <svg className="w-full h-full" viewBox="0 0 100 50" preserveAspectRatio="none">
                  <path 
                    d="M0,50 L10,45 L20,40 L30,20 L40,10 L50,5 L60,10 L70,15 L80,30 L90,40 L100,45" 
                    fill="none" 
                    stroke="#43EB3E" 
                    strokeWidth="2"
                  />
                  <path 
                    d="M0,50 L10,45 L20,40 L30,20 L40,10 L50,5 L60,10 L70,15 L80,30 L90,40 L100,45" 
                    fill="url(#activityGradient)" 
                    fillOpacity="0.2"
                    stroke="none"
                  />
                  <defs>
                    <linearGradient id="activityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#43EB3E" stopOpacity="0.5" />
                      <stop offset="100%" stopColor="#43EB3E" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              
              {/* Activity dots */}
              <div className="absolute bottom-[20px] left-[20px] w-[calc(100%-40px)] h-[140px] flex justify-between items-end">
                <div className="w-1 h-1 rounded-full bg-[#43EB3E]"></div>
                <div className="w-1 h-1 rounded-full bg-[#43EB3E]"></div>
                <div className="w-1 h-1 rounded-full bg-[#43EB3E]"></div>
                <div className="w-1 h-1 rounded-full bg-[#43EB3E]"></div>
                <div className="w-1 h-1 rounded-full bg-[#43EB3E]"></div>
                <div className="w-1 h-1 rounded-full bg-[#43EB3E]"></div>
                <div className="w-1 h-1 rounded-full bg-[#43EB3E]"></div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Action Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Load Cards */}
        <Card className="bg-[#011d3d] border-[#022b5c] text-white shadow-md overflow-hidden group hover:bg-[#01162f] transition-colors">
          <CardContent className="pt-6 pb-6">
            <h3 className="text-xl font-bold mb-4">Load Cards</h3>
            <p className="text-sm text-slate-300 mb-4">Batch Card Loads</p>
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-[#43EB3E] transition-colors">
              <span className="text-lg">→</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Fund Profile */}
        <Card className="bg-[#011d3d] border-[#022b5c] text-white shadow-md overflow-hidden group hover:bg-[#01162f] transition-colors">
          <CardContent className="pt-6 pb-6">
            <h3 className="text-xl font-bold mb-4">Fund Profile</h3>
            <p className="text-sm text-slate-300 mb-4">Request Quote/Invoice/Banking Details</p>
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-[#43EB3E] transition-colors">
              <span className="text-lg">→</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Active Cards */}
        <Card className="bg-[#011d3d] border-[#022b5c] text-white shadow-md overflow-hidden group hover:bg-[#01162f] transition-colors">
          <CardContent className="pt-6 pb-6">
            <h3 className="text-xl font-bold mb-4">Active Cards</h3>
            <p className="text-sm text-slate-300 mb-4">Single Card Loads</p>
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-[#43EB3E] transition-colors">
              <span className="text-lg">→</span>
            </div>
          </CardContent>
        </Card>
        
        {/* Activate Cards */}
        <Card className="bg-[#011d3d] border-[#022b5c] text-white shadow-md overflow-hidden group hover:bg-[#01162f] transition-colors">
          <CardContent className="pt-6 pb-6">
            <h3 className="text-xl font-bold mb-4">Activate Cards</h3>
            <p className="text-sm text-slate-300 mb-4">View Inactive Cards</p>
            <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center group-hover:bg-[#43EB3E] transition-colors">
              <span className="text-lg">→</span>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Order Cards Section */}
      <Card className="bg-[#011d3d] border-[#022b5c] text-white shadow-md overflow-hidden">
        <CardHeader>
          <CardTitle className="text-white">Order Cards</CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <p className="text-slate-300">Request Quote/Invoice</p>
            <Button variant="outline" className="text-white border-slate-600 hover:bg-slate-800">
              Request Quote
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Training Section */}
      <Card className="bg-[#011d3d] border-[#022b5c] text-white shadow-md overflow-hidden">
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h3 className="text-xl font-bold">Training Videos</h3>
              <p className="text-sm text-slate-300 mt-1">
                Learn how to use the OPIAN Rewards system effectively
              </p>
            </div>
            <Button variant="outline" className="text-white border-slate-600 hover:bg-slate-800">
              View Training
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Original Cards - Hidden but kept for reference */}
      <div className="hidden">
        <div className="grid gap-6 md:grid-cols-3">
          <Card className="points-card overflow-hidden shadow-sm">
            <CardHeader className="flex justify-between items-center border-b border-border/40">
              <CardTitle className="text-primary-700 dark:text-primary-300 font-semibold">Current Points & Tier</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {isUserLoading ? (
                <>
                  <div className="h-10 w-36 bg-muted rounded animate-pulse mb-4"></div>
                  <div className="space-y-4">
                    <div className="h-8 w-24 bg-muted rounded animate-pulse"></div>
                    <div className="space-y-2">
                      <div className="h-2 w-full bg-muted rounded animate-pulse"></div>
                      <div className="h-5 w-48 bg-muted rounded animate-pulse"></div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <AnimatedMetric 
                    title="Your Points Balance"
                    value={points}
                    icon={Award}
                    formatter={(val) => val.toLocaleString()}
                    description={
                      <div className="mt-2">
                        <Badge className={`${tierInfo.color} text-sm px-3 py-1`}>
                          {tierInfo.name} Tier
                        </Badge>
                        {tierInfo.nextTier && (
                          <div className="mt-3 space-y-2">
                            <Progress
                              value={(points / tierInfo.nextTier.pointsNeeded) * 100}
                              className="h-2"
                            />
                            <p className="text-xs text-muted-foreground">
                              {tierInfo.nextTier.pointsNeeded.toLocaleString()} points needed to reach{" "}
                              {tierInfo.nextTier.name}
                            </p>
                          </div>
                        )}
                      </div>
                    }
                    isLoading={isUserLoading}
                    delay={100}
                    colorScheme="primary"
                    className="mb-2 -mt-4 -mx-6 p-0"
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card className="rewards-section shadow-sm">
            <CardHeader className="border-b border-border/40">
              <CardTitle className="flex items-center gap-2 text-primary-700 dark:text-primary-300 font-semibold">
                <DollarSign className="h-5 w-5 text-muted-foreground" /> Cash Redemption
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {isUserLoading ? (
                <>
                  <div className="space-y-2">
                    <div className="h-5 w-32 bg-muted rounded animate-pulse"></div>
                    <div className="h-10 w-full bg-muted rounded animate-pulse"></div>
                    <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
                  </div>
                  <div className="h-10 w-full bg-muted rounded animate-pulse"></div>
                </>
              ) : (
                <>
                  <AnimatedMetric 
                    title="Cash Value"
                    value={points * 0.015}
                    prefix="R"
                    formatter={(val) => val.toFixed(2)}
                    description="Current points exchange rate: 1 point = R0.015"
                    isLoading={isUserLoading}
                    delay={250}
                    colorScheme="success"
                    className="mb-4 -mt-4 -mx-6 p-0"
                  />
                  <div className="space-y-2 mt-4">
                    <label className="text-sm font-medium">Points to Redeem</label>
                    <Input
                      type="number"
                      min="0"
                      max={points}
                      value={pointsToRedeem}
                      onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                      placeholder="Enter points amount"
                    />
                    {pointsToRedeem > 0 && (
                      <p className="text-sm font-medium mt-2">
                        You will receive: <span className="text-green-500">R{randValue}</span>
                      </p>
                    )}
                  </div>
                  <Button
                    className="w-full mt-2"
                    onClick={() => redeemCashMutation.mutate(pointsToRedeem)}
                    disabled={!canRedeem}
                  >
                    {canRedeem ? "Redeem for Cash" : "Insufficient Points"}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>

          {/* Only show referral section for users with PROSPER package or higher */}
          {hasReferralAccess && <div className="referral-section"><ReferralSection /></div>}
          
          {/* Show upgrade message for users without access */}
          {!hasReferralAccess && (
            <Card className="referral-section bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700">
              <CardHeader>
                <CardTitle className="text-[#43EB3E] flex items-center gap-2">
                  <PackageIcon className="h-5 w-5" /> Refer & Earn Points
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <p>Unlock our referral program by upgrading to PROSPER package or higher.</p>
                  <p className="text-sm text-slate-300">
                    Earn points when your referrals join and receive additional bonuses from their referrals.
                  </p>
                  <p className="text-xs text-slate-400">
                    Access is granted to users with any PROSPER, PRESTIGE, or PINNACLE package.
                  </p>
                </div>
                <Button 
                  className="w-full bg-[#43EB3E] text-slate-900 hover:bg-[#3ad036]"
                  onClick={() => toast({
                    title: "Package Upgrade",
                    description: "Please contact support to upgrade your package."
                  })}
                >
                  Upgrade Package
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <Card className="recent-transactions shadow-sm">
          <CardHeader className="border-b border-border/40">
            <CardTitle className="text-primary-700 dark:text-primary-300 font-semibold">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <ScrollArea className="h-[300px]">
              <div className="space-y-4">
                {isTransactionsLoading ? (
                  // Skeleton loading state
                  Array(5).fill(0).map((_, index) => (
                    <div key={`skeleton-${index}`} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="space-y-1">
                        <div className="h-5 w-64 bg-muted rounded animate-pulse"></div>
                        <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
                      </div>
                      <div className="h-8 w-20 bg-muted rounded animate-pulse"></div>
                    </div>
                  ))
                ) : transactions?.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="space-y-1">
                      <p className="font-medium">
                        {transaction.type ? formatTransactionType(transaction.type) : ''} - {transaction.description}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(transaction.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <PointsDisplay
                      points={transaction.points}
                      showSign
                      size="small"
                    />
                  </div>
                ))}
                {(!isTransactionsLoading && (!transactions || transactions.length === 0)) && (
                  <p className="text-center text-muted-foreground py-4">
                    No recent activity
                  </p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Export the wrapped component with OnboardingProvider
export default function CustomerDashboard() {
  return (
    <OnboardingProvider section="dashboard">
      <CustomerDashboardContent />
    </OnboardingProvider>
  );
}