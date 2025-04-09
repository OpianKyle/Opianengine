import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Package as PackageIcon, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FaXTwitter as TwitterIcon,
  FaFacebook as FacebookIcon,
  FaLinkedin as LinkedInIcon,
  FaWhatsapp as WhatsAppIcon,
  FaTelegram as TelegramIcon,
  FaEnvelope as EmailIcon
} from "react-icons/fa6";

interface ReferralInfo {
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
      referralFee: {
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
      referralFee: {
        percentage: number;
        randValue: string;
        points: number;
      };
    }>;
  };
}

export default function ReferralSection() {
  const [copied, setCopied] = useState(false);
  const [packageUpgradeRequired, setPackageUpgradeRequired] = useState(false);
  const [userPackage, setUserPackage] = useState<string>("");
  const { toast } = useToast();

  const { data: referralInfo, isLoading, error } = useQuery<ReferralInfo>({
    queryKey: ["/api/customer/referral"],
    queryFn: async () => {
      console.log('Fetching referral data...');
      const response = await fetch("/api/customer/referral", {
        credentials: 'include'
      });
      
      // Check for package restrictions (403 error)
      if (response.status === 403) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Package restriction error:', errorData);
        
        if (errorData.details && errorData.details.currentPackage) {
          // Store user package with original case
          setUserPackage(errorData.details.currentPackage);
        }
        
        // Make sure the package upgrade message only shows for users without the right package
        // Check this here in case the server sent 403 but package is actually eligible
        const currentPackage = errorData.details?.currentPackage || "";
        const requiredPackages = errorData.details?.requiredPackages || ['PROSPER', 'PRESTIGE', 'PINNACLE'];
        const eligibilityCheck = errorData.details?.eligibleCheck;
        
        // Use the server's eligibility check result if available, otherwise check locally
        const isPackageEligible = eligibilityCheck !== undefined 
          ? eligibilityCheck 
          : (currentPackage && requiredPackages.includes(currentPackage.toUpperCase()));
        
        console.log(`Package verification: "${currentPackage}" => eligible: ${isPackageEligible}`, errorData.details);
        
        if (!isPackageEligible) {
          setPackageUpgradeRequired(true);
          // Store user package with original case
          setUserPackage(currentPackage);
          throw new Error("Package upgrade required");
        } else {
          console.log('Package should be eligible but got 403:', currentPackage);
          // User has the right package but still got 403, try to continue
          throw new Error("Failed to access referral program despite having eligible package");
        }
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Referral fetch error:', { status: response.status, error: errorData });
        throw new Error(errorData.error || "Failed to fetch referral data");
      }
      
      const data = await response.json();
      console.log('Referral data received:', data);
      return data;
    },
    retry: (failureCount, error) => {
      // Don't retry on package restriction errors
      if (error instanceof Error && error.message === "Package upgrade required") {
        return false;
      }
      // Retry other errors up to 3 times
      return failureCount < 3;
    }
  });

  console.log('Current referral info:', referralInfo);

  const referralLink = referralInfo?.referralCode
    ? `${window.location.origin}/referral/${referralInfo.referralCode}`
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Refer & Earn Points</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-10" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (packageUpgradeRequired) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            <span>Refer & Earn Points</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border border-[#43EB3E]/30 rounded-lg overflow-hidden">
              <div className="bg-[#43EB3E]/5 p-4 border-b border-[#43EB3E]/20">
                <h3 className="text-[#43EB3E] font-medium flex items-center gap-2">
                  <PackageIcon className="h-5 w-5 text-[#43EB3E]" />
                  Package Upgrade Required
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <p>
                  The referral program is available exclusively to customers with the <strong>PROSPER</strong> package or higher.
                </p>
                <p className="text-sm text-muted-foreground">
                  Your current package: <strong>{userPackage || "OPPORTUNITY"}</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  Access is granted to users with any PROSPER, PRESTIGE, or PINNACLE package.
                </p>
                <div className="bg-[#43EB3E]/5 p-3 rounded-md border border-[#43EB3E]/20">
                  <h4 className="text-[#43EB3E] text-sm font-medium mb-2">Why upgrade?</h4>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc pl-5">
                    <li>Earn referral fees from your direct referrals</li>
                    <li>Earn additional rewards from your referral network</li> 
                    <li>Access exclusive PROSPER-level benefits</li>
                  </ul>
                </div>
                <div className="flex justify-center mt-4">
                  <Button className="bg-[#43EB3E] hover:bg-[#43EB3E]/80 text-black">
                    Upgrade to PROSPER Package
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Refer & Earn Points</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">
            Failed to load referral information. Please try again later.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Refer & Earn Points</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          Share your referral link with friends. When they register, you'll earn 2,500 points!
        </div>
        <div className="bg-[rgba(255,255,255,0.05)] p-5 rounded-lg my-5">
          <h3 className="text-[#43EB3E] mt-0">Your Referral Rewards</h3>
          <ul className="list-none pl-0 my-2.5">
            <li className="my-1.5">• Level 1: 7.5% referral fee + 2000 points per direct referral</li>
            <li className="my-1.5">• Level 2: 5% referral fee from your referrals' referrals</li>
            <li className="my-1.5">• Level 3: 2.5% referral fee from level 3 referrals</li>
          </ul>
        </div>
        {referralLink && (
          <>
            <div className="flex items-center gap-2">
              <Input
                value={referralLink}
                readOnly
                className="font-mono text-sm"
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
          </>
        )}
        {referralInfo && referralInfo.referralCount > 0 && (
          <div className="text-sm">
            <span className="font-medium">{referralInfo.referralCount}</span> successful referrals
          </div>
        )}
        {referralInfo && referralInfo.referralsByLevel && referralInfo.referralsByLevel[1] && referralInfo.referralsByLevel[1].length > 0 && (
          <div className="space-y-2">
            <div className="text-sm font-medium">Recent Referrals</div>
            <div className="space-y-2">
              {referralInfo && referralInfo.referralsByLevel && referralInfo.referralsByLevel[1] && referralInfo.referralsByLevel[1].map((referral) => (
                <div
                  key={referral.id}
                  className="text-sm p-2 bg-muted rounded-lg flex justify-between items-center"
                >
                  <div>
                    <span className="font-medium">{referral.firstName} {referral.lastName}</span>
                    <span className="text-muted-foreground"> joined on </span>
                    <span>{new Date(referral.createdAt).toLocaleDateString()}</span>
                  </div>
                  <Badge variant="outline">+{referral.referralFee.points} points</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}