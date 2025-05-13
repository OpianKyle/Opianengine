import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AchievementBadges, referralBadges } from "@/components/ui/badges";
import {
  FaXTwitter as TwitterIcon,
  FaFacebook as FacebookIcon,
  FaLinkedin as LinkedInIcon,
  FaWhatsapp as WhatsAppIcon,
  FaTelegram as TelegramIcon,
  FaEnvelope as EmailIcon,
  FaGem as PackageIcon
} from "react-icons/fa6";
import { PackageIcon as LucidePackageIcon } from "lucide-react";
import ReferralsTour from "@/components/onboarding/ReferralsTour";
import { useOnboarding, OnboardingProvider } from "@/contexts/OnboardingContext";


interface ReferralStats {
  referralCode: string;
  referralCount: number;
  packagePrices: Record<string, number>;
  packageStatsByLevel: {
    [key: number]: {
      [key: string]: {
        count: number;
        totalReferrals: number;
        referralsByPackage: {
          OPPORTUNITY: number;
          MOMENTUM: number;
          PROSPER: number;
          PRESTIGE: number;
          PINNACLE: number;
        };
        commission: {
          percentage: number;
          baseAmount: number;
        };
      };
    };
  };
  referralsByLevel: {
    [key: number]: Array<{
      id: number;
      firstName: string;
      lastName: string;
      email: string;
      selectedPackage: string;
      createdAt: string;
      level: number;
      directReferralCount: number;
      referralPackageStats: any[];
      commission: {
        percentage: number;
        randValue: string;
        points: number;
      };
    }>;
  };
}

const packageColors = {
  OPPORTUNITY: "bg-zinc-400",
  MOMENTUM: "bg-blue-400", 
  PROSPER: "bg-green-400",
  PRESTIGE: "bg-purple-400",
  PINNACLE: "bg-amber-400"
};

const PackageEmblem = ({ type, count, totalReferrals, level }: {
  type: string;
  count: number;
  totalReferrals: number;
  level: number;
}) => (
  <div className="flex flex-col items-center space-y-2">
    <div className={`p-4 rounded-full ${packageColors[type as keyof typeof packageColors] || "bg-gray-200"}`}>
      <LucidePackageIcon className="h-6 w-6 text-white" />
    </div>
    <div className="text-center">
      <div className="font-semibold">{type}</div>
      <div className="text-sm text-muted-foreground">{count} level {level} referrals</div>
      <div className="text-xs text-muted-foreground">
        ({totalReferrals} sub-referrals)
      </div>
    </div>
  </div>
);

function ReferralsPageContent() {
  // Use the onboarding context but only access properties after confirming user is logged in
  const onboarding = useOnboarding();
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: referralStats, isLoading, error } = useQuery<ReferralStats>({
    queryKey: ["/api/customer/referrals"],
    queryFn: async () => {
      console.log('Fetching referral data...');
      try {
        const response = await fetch("/api/customer/referrals", {
          credentials: 'include'
        });

        console.log('Referral response status:', response.status);
        
        // For 401/403 errors, handle appropriately
        if (response.status === 401) {
          console.error('Authentication error: User not logged in');
          throw new Error("Please log in to access the referral program");
        }
        
        // For 403 errors, properly handle the package restriction
        if (response.status === 403) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Package restriction error:', errorData);
          
          // Add package information to the error
          const userPackage = errorData?.details?.currentPackage || '';
          const requiredPackages = errorData?.details?.requiredPackages || ['PROSPER', 'PRESTIGE', 'PINNACLE'];
          
          console.log(`Package check: User has "${userPackage}" (upper: "${userPackage.toUpperCase()}"), needs one of:`, 
            requiredPackages.map((p: string) => `"${p}"`).join(', '));
            
          throw new Error(JSON.stringify({
            status: 403,
            error: "Package upgrade required",
            message: "You need to upgrade to PROSPER package or higher to access the referral program",
            details: {
              ...errorData,
              packageInfo: {
                current: userPackage,
                currentUpper: userPackage.toUpperCase(),
                required: requiredPackages
              }
            }
          }));
        }
        
        // For other error responses
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Referral fetch error:', { 
            status: response.status, 
            error: errorData,
            statusText: response.statusText 
          });
          throw new Error(errorData.error || "Failed to fetch referral data");
        }

        // Only parse JSON for successful responses
        const data = await response.json();
        console.log('Referral data received:', data);
        return data;
      } catch (error) {
        console.error('Error fetching referrals:', error);
        throw error;
      }
    },
    retry: (failureCount, error) => {
      // Don't retry on authentication or package restriction errors
      if (error.message && (
        error.message.includes('403') || 
        error.message.includes('Please log in')
      )) {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    }
  });

  const referralLink = referralStats?.referralCode
    ? `${window.location.origin}/referral/${referralStats.referralCode}`
    : '';

  const shareText = "Join me on OPIAN Rewards and get 2,000 bonus points! Use my referral link:";

  const socialShareUrls = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(referralLink)}`,
    facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}&quote=${encodeURIComponent(shareText)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(referralLink)}`,
    whatsapp: `https://wa.me/?text=${encodeURIComponent(`${shareText} ${referralLink}`)}`,
    telegram: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(shareText)}`,
    email: `mailto:?subject=${encodeURIComponent("Join OPIAN Rewards")}&body=${encodeURIComponent(`${shareText}\n\n${referralLink}`)}`
  };

  const copyToClipboard = async () => {
    if (!referralLink) return;

    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast({
        title: "Success",
        description: "Referral link copied to clipboard!",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to copy referral link",
      });
    }
  };

  // Calculate total referral fees for each level
  const calculateLevelCommission = (level: number) => {
    if (!referralStats?.referralsByLevel[level]) return 0;
    return referralStats.referralsByLevel[level].reduce((sum, ref) => {
      return sum + Number(ref.commission.randValue);
    }, 0);
  };

  const badges = referralStats ? referralBadges.map(badge => ({
    ...badge,
    earned: referralStats.referralCount >= badge.requirement,
    progress: Math.min(referralStats.referralCount, badge.requirement)
  })) : [];

  if (error) {
    // Check if the error is due to package restriction
    const errorObj = error as any;
    console.log('Detailed error object:', errorObj);
    
    // Try to extract error details from the exception
    let errorResponse;
    try {
      // The error object structure can vary depending on how fetch errors are handled
      if (errorObj.cause && typeof errorObj.cause === 'object') {
        errorResponse = errorObj.cause;
      } else if (errorObj.message && typeof errorObj.message === 'string') {
        // Try to parse JSON from error message if it contains JSON
        const jsonMatch = errorObj.message.match(/{.*}/);
        if (jsonMatch) {
          try {
            errorResponse = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('Failed to parse JSON from error message:', e);
          }
        }
      }
    } catch (e) {
      console.error('Error while extracting error details:', e);
    }
    
    console.log('Extracted error response:', errorResponse);
    
    const packageUpgradeRequired = 
      errorObj?.message?.includes('upgrade to PROSPER package') || 
      errorObj?.message?.includes('Package upgrade required') ||
      (errorResponse && (
        errorResponse.error === 'Package upgrade required' ||
        errorResponse.message?.includes('upgrade to PROSPER package')
      ));
      
    if (packageUpgradeRequired) {
      return (
        <div className="p-8 max-w-4xl mx-auto">
          <Card className="border-[#43EB3E]/30">
            <CardHeader className="bg-[#43EB3E]/5 border-b border-[#43EB3E]/20">
              <CardTitle className="flex items-center gap-2 text-[#43EB3E]">
                <PackageIcon className="h-6 w-6 text-[#43EB3E]" />
                Package Upgrade Required
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <p className="text-foreground">
                  The referral program is available exclusively to customers with the <strong>PROSPER</strong> package or higher.
                </p>
                <p className="text-sm text-muted-foreground">
                  Access is granted to users with any PROSPER, PRESTIGE, or PINNACLE package. If you believe your package should grant you access, please contact support.
                </p>
                <div className="bg-[#43EB3E]/5 p-4 rounded-lg border border-[#43EB3E]/20">
                  <h3 className="font-medium text-[#43EB3E] mb-2">Why upgrade?</h3>
                  <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                    <li>Earn referral fees from your direct referrals</li>
                    <li>Earn additional rewards from your referral network</li>
                    <li>Access exclusive PROSPER-level benefits</li>
                    <li>Increase your monthly reward potential</li>
                  </ul>
                </div>
                <div className="flex justify-center mt-6">
                  <Button className="bg-[#43EB3E] hover:bg-[#43EB3E]/80 text-black">
                    Upgrade to PROSPER Package
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      );
    }
    
    return (
      <div className="p-4">
        <p className="text-red-500">Error loading referral data. Please try again later.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-4">
        <p>Loading referral data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Add ReferralsTour component */}
      <ReferralsTour />
      
      <div className="referral-header">
        <h1 className="text-3xl font-bold">My Referrals</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Referral Fees Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 referral-rewards-info">
            <p className="text-sm text-muted-foreground">
              Your referral fee earnings based on your referral network's packages.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Level 1 (7.5%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    R{calculateLevelCommission(1).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From {referralStats?.referralsByLevel[1]?.length || 0} direct referrals
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Level 2 (5%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    R{calculateLevelCommission(2).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From {referralStats?.referralsByLevel[2]?.length || 0} indirect referrals
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Level 3 (2.5%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    R{calculateLevelCommission(3).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From {referralStats?.referralsByLevel[3]?.length || 0} level 3 referrals
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Total Referral Fees</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-white">
                    R{(
                      calculateLevelCommission(1) +
                      calculateLevelCommission(2) +
                      calculateLevelCommission(3)
                    ).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paid out monthly
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Add a card for sharing referral link - this was missing in the original */}
      <Card className="referral-link-section">
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Share this unique link with friends and family. When they sign up, you'll earn 2,000 points and ongoing referral fees!
            </p>
            <div className="flex items-center gap-3">
              <Input
                value={referralLink}
                readOnly
                className="font-mono text-sm"
              />
              <Button size="sm" onClick={copyToClipboard} disabled={!referralLink}>
                {copied ? "Copied!" : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <div className="social-share-buttons mt-4">
              <p className="text-sm font-medium mb-2">Share via:</p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={socialShareUrls.twitter}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-[#1DA1F2] text-white hover:bg-opacity-80"
                >
                  <TwitterIcon size={18} />
                </a>
                <a
                  href={socialShareUrls.facebook}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-[#4267B2] text-white hover:bg-opacity-80"
                >
                  <FacebookIcon size={18} />
                </a>
                <a
                  href={socialShareUrls.linkedin}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-[#0077B5] text-white hover:bg-opacity-80"
                >
                  <LinkedInIcon size={18} />
                </a>
                <a
                  href={socialShareUrls.whatsapp}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-[#25D366] text-white hover:bg-opacity-80"
                >
                  <WhatsAppIcon size={18} />
                </a>
                <a
                  href={socialShareUrls.telegram}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-[#0088CC] text-white hover:bg-opacity-80"
                >
                  <TelegramIcon size={18} />
                </a>
                <a
                  href={socialShareUrls.email}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-full bg-gray-600 text-white hover:bg-opacity-80"
                >
                  <EmailIcon size={18} />
                </a>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="referral-stats">
        <CardHeader>
          <CardTitle>Your Direct Referrals</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-4">
              {referralStats?.referralsByLevel[1]?.map((referral) => (
                <div
                  key={referral.id}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium">
                      {referral.firstName} {referral.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {referral.email}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Joined: {new Date(referral.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Direct Referrals: {referral.directReferralCount}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline" className={packageColors[referral.selectedPackage as keyof typeof packageColors]}>
                      Package: {referral.selectedPackage || 'None'}
                    </Badge>
                    <Badge className="bg-primary text-white">
                      Referral Fee: R{referral.commission.randValue}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!referralStats?.referralsByLevel[1] || referralStats.referralsByLevel[1].length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  No referrals yet. Share your referral link to get started!
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {[1, 2, 3].map(level => (
        <Card key={level}>
          <CardHeader>
            <CardTitle>Level {level} Referral Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Overview of your level {level} referrals by package type and their subsequent referrals.
              </p>
              <div className="grid grid-cols-5 gap-4">
                {Object.entries(referralStats?.packageStatsByLevel[level] || {}).map(([packageType, stats]) => (
                  <PackageEmblem
                    key={packageType}
                    type={packageType}
                    count={stats.count}
                    totalReferrals={stats.totalReferrals}
                    level={level}
                  />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      <Card className="referral-badges">
        <CardHeader>
          <CardTitle>Achievement Badges</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Earn badges by growing your referral network. Each badge represents a milestone in your journey!
          </p>
          <AchievementBadges badges={badges} />
        </CardContent>
      </Card>
    </div>
  );
}

// Export the wrapped component with OnboardingProvider
export default function ReferralsPage() {
  return (
    <OnboardingProvider section="referrals">
      <ReferralsPageContent />
    </OnboardingProvider>
  );
}