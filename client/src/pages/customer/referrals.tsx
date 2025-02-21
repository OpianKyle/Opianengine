import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { AchievementBadges, referralBadges, type AchievementBadge } from "@/components/ui/badges";
import { 
  FaXTwitter as TwitterIcon,
  FaFacebook as FacebookIcon,
  FaLinkedin as LinkedInIcon,
  FaWhatsapp as WhatsAppIcon,
  FaTelegram as TelegramIcon,
  FaEnvelope as EmailIcon
} from "react-icons/fa6";

interface ReferralStats {
  level1Count: number;
  level2Count: number;
  level3Count: number;
  referralCode: string;
  referrals: Array<{
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    createdAt: string;
    selectedPackage: string | null;
  }>;
  commission: {
    level1Amount: number;
    level2Amount: number;
    level3Amount: number;
    totalAmount: number;
    isPaid: boolean;
  };
}

export default function ReferralsPage() {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const { data: referralStats, isLoading } = useQuery<ReferralStats>({
    queryKey: ["/api/customer/referrals"],
    queryFn: async () => {
      const response = await fetch("/api/customer/referrals", {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error("Failed to fetch referral data");
      }
      return response.json();
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

  const badges = calculateBadgeProgress(referralStats?.level1Count || 0);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount / 100); // Assuming amount is in cents
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">My Referrals</h1>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Commission Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Your commission earnings for the current month based on your referral network's premium packages.
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Level 1 (15%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(referralStats?.commission.level1Amount || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From {referralStats?.level1Count || 0} direct referrals
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Level 2 (10%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(referralStats?.commission.level2Amount || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From {referralStats?.level2Count || 0} indirect referrals
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Level 3 (5%)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(referralStats?.commission.level3Amount || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    From {referralStats?.level3Count || 0} level 3 referrals
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-primary/5">
                <CardHeader className="py-3">
                  <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {formatCurrency(referralStats?.commission.totalAmount || 0)}
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

      <Card className="bg-primary/5">
        <CardHeader>
          <CardTitle>Your Referral Link</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Share this link with others to earn referral points. You'll receive points when they sign up and start participating!
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
              {referralStats?.referrals.map((referral) => (
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
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant="outline">
                      Package: {referral.selectedPackage || 'None'}
                    </Badge>
                  </div>
                </div>
              ))}
              {(!referralStats?.referrals || referralStats.referrals.length === 0) && (
                <p className="text-center text-muted-foreground py-4">
                  No referrals yet. Share your referral link to get started!
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

const calculateBadgeProgress = (totalReferrals: number): AchievementBadge[] => {
  return referralBadges.map(badge => ({
    ...badge,
    earned: totalReferrals >= badge.requirement,
    progress: Math.min(totalReferrals, badge.requirement)
  }));
};