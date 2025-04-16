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
import { Package as PackageIcon } from "lucide-react";

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

export default function CustomerDashboard() {
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
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold text-muted-foreground">
          Good {timeOfDay}, {user ? `${user.firstName} ${user.lastName}` : 'Welcome to OPIAN Rewards'}
        </h2>
        <h1 className="text-3xl font-bold text-[#1b75bc]">Your Dashboard</h1>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Current Points & Tier</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <PointsDisplay points={points} size="large" />
                <div className="space-y-4">
                  <Badge className={`${tierInfo.color} text-lg px-4 py-2`}>
                    {tierInfo.name} Tier
                  </Badge>
                  {tierInfo.nextTier && (
                    <div className="space-y-2">
                      <Progress
                        value={(points / tierInfo.nextTier.pointsNeeded) * 100}
                        className="h-2"
                      />
                      <p className="text-sm text-muted-foreground">
                        {tierInfo.nextTier.pointsNeeded.toLocaleString()} points needed to reach{" "}
                        {tierInfo.nextTier.name}
                      </p>
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cash Redemption</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
                <div className="space-y-2">
                  <label className="text-sm font-medium">Points to Redeem</label>
                  <Input
                    type="number"
                    min="0"
                    max={points}
                    value={pointsToRedeem}
                    onChange={(e) => setPointsToRedeem(Number(e.target.value))}
                    placeholder="Enter points amount"
                  />
                  <p className="text-sm text-muted-foreground">
                    Conversion rate: 1 point = R0.015
                  </p>
                  {pointsToRedeem > 0 && (
                    <p className="text-sm font-medium">
                      You will receive: R{randValue}
                    </p>
                  )}
                </div>
                <Button
                  className="w-full"
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
        {hasReferralAccess && <ReferralSection />}
        
        {/* Show upgrade message for users without access */}
        {!hasReferralAccess && (
          <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border border-slate-700">
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

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
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
  );
}