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
      
      <div className="space-y-2 welcome-dashboard">
        <h2 className="text-2xl font-semibold text-muted-foreground">
          Good {timeOfDay}, {user ? `${user.firstName} ${user.lastName}` : 'Welcome to OPIAN Rewards'}
        </h2>
        <h1 className="text-3xl font-bold text-[#1b75bc]">Your Dashboard</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="points-card overflow-hidden shadow-sm bg-[#011d3d] border-[#022b5c] text-white">
          <CardHeader className="flex justify-between items-center border-b border-[#022b5c]/60">
            <CardTitle className="text-white font-semibold">Current Points & Tier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {isUserLoading ? (
              <>
                <div className="h-10 w-36 bg-[#022b5c] rounded animate-pulse mb-4"></div>
                <div className="space-y-4">
                  <div className="h-8 w-24 bg-[#022b5c] rounded animate-pulse"></div>
                  <div className="space-y-2">
                    <div className="h-2 w-full bg-[#022b5c] rounded animate-pulse"></div>
                    <div className="h-5 w-48 bg-[#022b5c] rounded animate-pulse"></div>
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
                            className="h-2 bg-[#022b5c]"
                          />
                          <p className="text-xs text-slate-300">
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

        <Card className="rewards-section shadow-sm bg-[#011d3d] border-[#022b5c] text-white">
          <CardHeader className="border-b border-[#022b5c]/60">
            <CardTitle className="flex items-center gap-2 text-white font-semibold">
              <DollarSign className="h-5 w-5 text-[#43EB3E]" /> Cash Redemption
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 p-6">
            {isUserLoading ? (
              <>
                <div className="space-y-2">
                  <div className="h-5 w-32 bg-[#022b5c] rounded animate-pulse"></div>
                  <div className="h-10 w-full bg-[#022b5c] rounded animate-pulse"></div>
                  <div className="h-4 w-48 bg-[#022b5c] rounded animate-pulse"></div>
                </div>
                <div className="h-10 w-full bg-[#022b5c] rounded animate-pulse"></div>
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
                  <label className="text-sm font-medium text-white">Points to Redeem</label>
                  <Input
                    type="number"
                    min="0"
                    max={points}
                    value={pointsToRedeem}
                    onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                    placeholder="Enter points amount"
                    className="bg-[#022b5c] border-[#043b7c] text-white placeholder:text-slate-400"
                  />
                  {pointsToRedeem > 0 && (
                    <p className="text-sm font-medium mt-2">
                      You will receive: <span className="text-[#43EB3E]">R{randValue}</span>
                    </p>
                  )}
                </div>
                <Button
                  className="w-full mt-2 bg-[#43EB3E] hover:bg-[#43EB3E]/90 text-[#011d3d] font-medium"
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
          <Card className="referral-section bg-[#011d3d] border-[#022b5c] text-white">
            <CardHeader className="border-b border-[#022b5c]/60">
              <CardTitle className="text-[#43EB3E] flex items-center gap-2">
                <PackageIcon className="h-5 w-5" /> Refer & Earn Points
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
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
                className="w-full bg-[#43EB3E] text-[#011d3d] hover:bg-[#43EB3E]/90"
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

      <Card className="recent-transactions shadow-sm bg-[#011d3d] border-[#022b5c] text-white">
        <CardHeader className="border-b border-[#022b5c]/60">
          <CardTitle className="text-white font-semibold">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <ScrollArea className="h-[300px]">
            <div className="space-y-4">
              {isTransactionsLoading ? (
                // Skeleton loading state
                Array(5).fill(0).map((_, index) => (
                  <div key={`skeleton-${index}`} className="flex items-center justify-between p-4 border border-[#022b5c] rounded-lg">
                    <div className="space-y-1">
                      <div className="h-5 w-64 bg-[#022b5c] rounded animate-pulse"></div>
                      <div className="h-4 w-32 bg-[#022b5c] rounded animate-pulse"></div>
                    </div>
                    <div className="h-8 w-20 bg-[#022b5c] rounded animate-pulse"></div>
                  </div>
                ))
              ) : transactions?.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-4 border border-[#022b5c] rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-white">
                      {transaction.type ? formatTransactionType(transaction.type) : ''} - {transaction.description}
                    </p>
                    <p className="text-sm text-slate-300">
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
                <p className="text-center text-slate-300 py-4">
                  No recent activity
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
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