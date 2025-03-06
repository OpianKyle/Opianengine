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

interface ReferralStats {
  referralCode: string;
  referralCount: number;
  packagePrices: Record<string, number>;
  directReferralsByPackage: {
    [key: string]: {
      count: number;
      totalReferrals: number;
      referralsByPackage: {
        BEGINNER: number;
        NOVICE: number;
        ACTIVE: number;
        PROFESSIONAL: number;
        EXPERT: number;
      };
      commission: {
        percentage: number;
        baseAmount: number;
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
      directReferralCount: number;
      commission: {
        percentage: number;
        randValue: string;
        points: number;
      };
    }>;
  };
}

const packageColors = {
  BEGINNER: "bg-zinc-400",
  NOVICE: "bg-blue-400",
  ACTIVE: "bg-green-400",
  PROFESSIONAL: "bg-purple-400",
  EXPERT: "bg-amber-400"
};

const PackageEmblem = ({ type, count, totalReferrals }: {
  type: string;
  count: number;
  totalReferrals: number;
}) => (
  <div className="flex flex-col items-center space-y-2">
    <div className={`p-4 rounded-full ${packageColors[type as keyof typeof packageColors] || "bg-gray-200"}`}>
      <PackageIcon className="h-6 w-6 text-white" />
    </div>
    <div className="text-center">
      <div className="font-semibold">{type}</div>
      <div className="text-sm text-muted-foreground">{count} referrals</div>
      <div className="text-xs text-muted-foreground">
        ({totalReferrals} sub-referrals)
      </div>
    </div>
  </div>
);

export default function ReferralsPage() {
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

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Referral fetch error:', { status: response.status, error: errorData });
          throw new Error(errorData.error || "Failed to fetch referral data");
        }

        const data = await response.json();
        console.log('Referral data received:', data);
        return data;
      } catch (error) {
        console.error('Error fetching referrals:', error);
        throw error;
      }
    },
  });

  const referralLink = referralStats?.referralCode
    ? `${window.location.origin}/?ref=${referralStats.referralCode}`
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

  // Calculate total commission for each level
  const calculateLevelCommission = (level: number) => {
    if (!referralStats?.referralsByLevel[level]) return 0;
    return referralStats.referralsByLevel[level].reduce((sum, ref) => {
      return sum + Number(ref.commission.randValue);
    }, 0);
  };

  const badges = referralStats ?  referralBadges.map(badge => ({
      ...badge,
      earned: referralStats.referralCount >= badge.requirement,
      progress: Math.min(referralStats.referralCount, badge.requirement)
  })) : [];

  if (error) {
    return (
      <div className="p-4">
        <p className="text-red-500">Error loading referral data. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Referrals</h1>

      <Card>
        <CardHeader>
          <CardTitle>Package Referral Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Overview of your direct referrals by package type and their subsequent referrals.
            </p>
            <div className="grid grid-cols-5 gap-4">
              {Object.entries(referralStats?.directReferralsByPackage || {}).map(([packageType, stats]) => (
                <PackageEmblem
                  key={packageType}
                  type={packageType}
                  count={stats.count}
                  totalReferrals={stats.totalReferrals}
                />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Commission Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your commission earnings based on your referral network's packages.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Level 1 (15%)</CardTitle>
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
                  <CardTitle className="text-sm font-medium">Level 2 (10%)</CardTitle>
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
                  <CardTitle className="text-sm font-medium">Level 3 (5%)</CardTitle>
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
                  <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
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

      <Card className="bg-primary/5">
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Share this link with others to earn referral points. You'll receive commission when they sign up and choose a package!
          </p>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Input
                value={referralLink}
                readOnly
                className="font-mono text-sm bg-background"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyToClipboard}
                className={copied ? "text-green-500" : ""}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex gap-2 justify-center">
              {/* Social share buttons */}
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(socialShareUrls.twitter, '_blank')}
                className="text-[#1DA1F2] hover:text-[#1DA1F2]/80"
              >
                <TwitterIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(socialShareUrls.facebook, '_blank')}
                className="text-[#4267B2] hover:text-[#4267B2]/80"
              >
                <FacebookIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(socialShareUrls.linkedin, '_blank')}
                className="text-[#0077B5] hover:text-[#0077B5]/80"
              >
                <LinkedInIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(socialShareUrls.whatsapp, '_blank')}
                className="text-[#25D366] hover:text-[#25D366]/80"
              >
                <WhatsAppIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(socialShareUrls.telegram, '_blank')}
                className="text-[#0088cc] hover:text-[#0088cc]/80"
              >
                <TelegramIcon className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => window.open(socialShareUrls.email, '_blank')}
                className="text-gray-600 hover:text-gray-800"
              >
                <EmailIcon className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
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
                    <Badge variant="outline" className="bg-green-50">
                      Commission: R{referral.commission.randValue}
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
      <Card>
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