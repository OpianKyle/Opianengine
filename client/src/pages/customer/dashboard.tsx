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
import { Package as PackageIcon, Award } from "lucide-react";

import { useOnboarding, OnboardingProvider } from "@/contexts/OnboardingContext";
import AnimatedMetric from "@/components/shared/animated-metric";
import CustomerTour from "@/components/onboarding/CustomerTour";
import { HelpCircle } from "lucide-react";

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
  const currentDateString = currentDate.toLocaleDateString();
  const timeOfDay = currentDate.getHours() < 12 ? 'morning' : currentDate.getHours() < 17 ? 'afternoon' : 'evening';
  
  // Last updated timestamp for cards
  const lastUpdated = `Last Updated: ${currentDateString} @${currentDate.getHours()}:${currentDate.getMinutes().toString().padStart(2, '0')}`;

  return (
    <div className="space-y-4 md:space-y-6 welcome-dashboard">
      <div className="flex flex-row justify-between items-center mb-2 md:mb-4">
        <div className="flex flex-wrap items-center space-x-1 md:space-x-3">
          <h2 className="text-lg md:text-xl font-semibold break-words">
            Good {timeOfDay}, {user ? `${user.firstName} ${user.lastName}` : 'Welcome'}
          </h2>
          <Button
            onClick={() => onboarding.startTour()}
            variant="ghost"
            size="icon"
            className="tour-guide-button h-8 w-8 md:h-9 md:w-9 bg-background shadow-sm flex items-center justify-center border rounded-full ml-1 md:ml-2"
            title="Start Tour Guide"
          >
            <HelpCircle className="h-4 w-4 md:h-5 md:w-5 text-[#43EB3E]" />
          </Button>
        </div>
        <div> {/* Empty div to maintain the flex spacing */}
        </div>
      </div>

      {/* First row: Points Balance and Cash Redemption side by side */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 sm:grid-cols-2">
        {/* Profile Balance Card - Points */}
        <Card className="bg-card dark:bg-[#011d3d] text-card-foreground dark:text-white border-border dark:border-[#022b5c] shadow-md overflow-hidden points-card">
          <CardHeader className="pb-1 pt-3 md:pb-2 md:pt-4">
            <CardTitle className="text-card-foreground dark:text-white text-base md:text-lg">Your Points Balance</CardTitle>
            <p className="text-xs text-muted-foreground dark:text-gray-400 mb-2 md:mb-6">{lastUpdated}</p>
          </CardHeader>
          <CardContent className="pt-0 px-3 md:px-6">
            <div className="flex items-center mb-2">
              <div className="w-1/6 md:w-1/5">
                <div className="flex justify-start">
                  <Award className="h-10 w-10 md:h-14 md:w-14 text-primary dark:text-blue-400 opacity-80" />
                </div>
              </div>
              <div className="w-5/6 md:w-4/5">
                <h3 className="text-3xl md:text-5xl font-bold">{points.toLocaleString()}</h3>
              </div>
            </div>
            
            <div className="flex items-center mt-2 md:mt-4">
              <div className="w-full">
                <div className="flex items-center gap-2 mb-1 md:mb-2">
                  <span className="text-sm md:text-base font-medium text-card-foreground dark:text-gray-300">{tierInfo.name}</span>
                  <span className="text-muted-foreground dark:text-gray-500">•</span>
                  <span className="text-sm md:text-base font-medium text-card-foreground dark:text-gray-300">{points.toLocaleString()}</span>
                </div>
                
                {tierInfo.nextTier && (
                  <div className="space-y-1 md:space-y-2">
                    <p className="text-xs md:text-sm text-muted-foreground dark:text-gray-300">
                      {tierInfo.nextTier.pointsNeeded.toLocaleString()} points to {tierInfo.nextTier.name}
                    </p>
                    <Progress
                      value={(points / tierInfo.nextTier.pointsNeeded) * 100}
                      className="h-1.5 md:h-2 bg-muted dark:bg-gray-700"
                    />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Redeem Points Card - Cash Value */}
        <Card className="bg-card dark:bg-[#011d3d] text-card-foreground dark:text-white border-border dark:border-[#022b5c] shadow-md overflow-hidden cash-redemption">
          <CardHeader className="pb-1 pt-3 md:pb-2 md:pt-4">
            <CardTitle className="text-card-foreground dark:text-white text-base md:text-lg">Cash Redemption</CardTitle>
            <p className="text-xs text-muted-foreground dark:text-gray-400 mb-2 md:mb-6">{lastUpdated}</p>
          </CardHeader>
          <CardContent className="pt-0 px-3 md:px-6">
            <div className="flex flex-col gap-2 md:gap-4">
              <div className="flex items-center mb-1 md:mb-2">
                <div className="flex justify-center items-center w-16 h-16 bg-muted/50 dark:bg-[#022757] rounded-lg mr-2 md:mr-4">
                  <AnimatedMetric
                    value={randValue}
                    prefix="R"
                    className="text-xl md:text-3xl font-bold"
                  />
                </div>
                <div className="text-sm md:text-base">
                  <p className="font-normal mb-1">Cash Value</p>
                  <p className="text-xs md:text-sm text-muted-foreground dark:text-gray-400">
                    {pointsToRedeem > 0 ? pointsToRedeem.toLocaleString() : 0} points selected
                  </p>
                </div>
              </div>
              
              <div className="grid gap-2 md:gap-3 grid-cols-1">
                <div className="flex flex-col md:flex-row gap-2 md:gap-3">
                  <Input
                    type="number"
                    placeholder="Points to redeem"
                    value={pointsToRedeem || ''}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      setPointsToRedeem(isNaN(val) ? 0 : val);
                    }}
                    min={1}
                    max={points}
                    className="h-9 md:h-10 text-sm md:text-base w-full"
                  />
                </div>
                <Button 
                  onClick={() => redeemCashMutation.mutate(pointsToRedeem)}
                  disabled={!canRedeem || redeemCashMutation.isPending}
                  className="h-9 md:h-10 w-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm md:text-base"
                >
                  {redeemCashMutation.isPending ? (
                    "Processing..."
                  ) : (
                    `Redeem R${randValue}`
                  )}
                </Button>
                <p className="text-xs md:text-sm text-center text-muted-foreground dark:text-gray-400">
                  Points are redeemed at a rate of R0.015 per point
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Second row: Referral Program on left, Activity and Training Videos stacked on right */}
      <div className="grid gap-3 md:gap-4 grid-cols-1 md:grid-cols-2">
        {/* Left column - Referral Program */}
        <div>
          {/* Referral Section */}
          {hasReferralAccess ? (
            <Card className="bg-card dark:bg-[#011d3d] text-card-foreground dark:text-white border-border dark:border-[#022b5c] shadow-md overflow-hidden relative referral-section">
              <div 
                className="absolute inset-0 bg-cover bg-center z-0 opacity-20" 
                style={{ backgroundImage: 'url(/DancingRichChick.png)' }}
              />
              <div className="relative z-10">
                <CardHeader className="pb-1 pt-3 md:pb-2 md:pt-4">
                  <CardTitle className="text-card-foreground dark:text-white text-base md:text-lg">Referral Program</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 md:px-6">
                  <div className="mb-2 md:mb-4">
                    <ReferralSection className="bg-transparent p-0 text-card-foreground dark:text-white border-0 shadow-none" />
                  </div>
                </CardContent>
              </div>
            </Card>
          ) : (
            <Card className="bg-card dark:bg-[#011d3d] text-card-foreground dark:text-white border-border dark:border-[#022b5c] shadow-md overflow-hidden relative">
              <div 
                className="absolute inset-0 bg-cover bg-center z-0 opacity-15" 
                style={{ backgroundImage: 'url(/DancingRichChick.png)' }}
              />
              <div className="relative z-10">
                <CardHeader className="pb-1 pt-3 md:pb-2 md:pt-4">
                  <CardTitle className="text-card-foreground dark:text-white text-base md:text-lg">Referral Program</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 px-3 md:px-6">
                  <div className="space-y-3 md:space-y-4">
                    <div className="space-y-1 md:space-y-2">
                      <p className="text-sm md:text-base">Unlock our referral program by upgrading to PROSPER package or higher.</p>
                      <p className="text-xs md:text-sm text-muted-foreground dark:text-gray-300">
                        Earn points when your referrals join and receive additional bonuses from their referrals.
                      </p>
                      <p className="text-xs text-muted-foreground dark:text-gray-400">
                        Access is granted to users with any PROSPER, PRESTIGE, or PINNACLE package.
                      </p>
                    </div>
                    <Button 
                      className="w-full h-9 md:h-10 bg-primary text-primary-foreground hover:bg-primary/90 text-sm md:text-base"
                      onClick={() => toast({
                        title: "Package Upgrade",
                        description: "Please contact support to upgrade your package."
                      })}
                    >
                      Upgrade Package
                    </Button>
                  </div>
                </CardContent>
              </div>
            </Card>
          )}
        </div>
        
        {/* Right column - Activity and Training Videos stacked */}
        <div className="grid gap-3 md:gap-4">
          {/* Recent Activity Section */}
          <Card className="bg-card dark:bg-[#011d3d] text-card-foreground dark:text-white border-border dark:border-[#022b5c] shadow-md overflow-hidden recent-transactions">
            <CardHeader className="pb-1 pt-3 md:pb-2 md:pt-4">
              <CardTitle className="text-card-foreground dark:text-white text-base md:text-lg">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-3 md:px-6">
              <ScrollArea className="h-[180px] md:h-[220px]">
                <div className="space-y-2 md:space-y-4">
                  {isTransactionsLoading ? (
                    // Skeleton loading state
                    Array(3).fill(0).map((_, index) => (
                      <div key={`skeleton-${index}`} className="flex items-center justify-between p-2 md:p-4 border border-border dark:border-[#043675] rounded-lg bg-muted/50 dark:bg-[#022757]">
                        <div className="space-y-1">
                          <div className="h-4 md:h-5 w-32 md:w-64 bg-muted dark:bg-[#043675] rounded animate-pulse"></div>
                          <div className="h-3 md:h-4 w-24 md:w-32 bg-muted dark:bg-[#043675] rounded animate-pulse"></div>
                        </div>
                        <div className="h-6 md:h-8 w-16 md:w-20 bg-muted dark:bg-[#043675] rounded animate-pulse"></div>
                      </div>
                    ))
                  ) : transactions && transactions.length > 0 ? (
                    transactions.map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-2 md:p-4 border border-border dark:border-[#043675] rounded-lg bg-muted/50 dark:bg-[#022757]"
                      >
                        <div className="space-y-1">
                          <p className="font-medium text-xs md:text-sm break-words">
                            {transaction.type ? formatTransactionType(transaction.type) : ''} - {transaction.description}
                          </p>
                          <p className="text-xs md:text-sm text-muted-foreground dark:text-gray-400">
                            {new Date(transaction.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className={`font-mono font-bold text-xs md:text-sm ${transaction.points > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {transaction.points > 0 ? '+' : ''}{transaction.points.toLocaleString()}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 md:py-6 text-muted-foreground dark:text-gray-400">
                      <p className="text-sm">No recent activity to display</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
          
          {/* Training Videos */}
          <Card className="bg-card dark:bg-[#011d3d] text-card-foreground dark:text-white border-border dark:border-[#022b5c] shadow-md overflow-hidden relative training-videos">
            <div 
              className="absolute inset-0 bg-cover bg-center z-0 opacity-30" 
              style={{ backgroundImage: 'url(/Training.JPG)' }}
            />
            <div className="relative z-10">
              <CardHeader className="pb-1 pt-3 md:pb-2 md:pt-4">
                <CardTitle className="text-card-foreground dark:text-white text-base md:text-lg">Training Videos</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 px-3 md:px-6">
                <div className="p-1 md:p-2 flex items-center justify-center min-h-[100px] md:min-h-[120px]">
                  <div className="flex flex-col items-center gap-2 md:gap-3 text-center">
                    <div className="h-12 w-12 md:h-14 md:w-14 rounded-full bg-black/30 flex items-center justify-center cursor-pointer hover:bg-black/40 transition-colors">
                      <div className="h-0 w-0 border-y-[8px] border-y-transparent border-l-[12px] border-l-white translate-x-[2px]"></div>
                    </div>
                    <p className="text-sm md:text-base font-medium">Watch Training Videos</p>
                    <p className="text-xs md:text-sm text-muted-foreground dark:text-gray-300">Learn how to maximize your benefits</p>
                  </div>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// Export the wrapped component with OnboardingProvider
export default function CustomerDashboard() {
  return (
    <OnboardingProvider section="dashboard">
      <CustomerTour />
      <CustomerDashboardContent />
    </OnboardingProvider>
  );
}