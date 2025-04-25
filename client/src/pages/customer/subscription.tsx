import React, { useState } from 'react';
import { PaystackSubscription } from '@/components/subscription/PaystackSubscription';
import { SubscriptionHistory } from '@/components/subscription/SubscriptionHistory';
import { SubscriptionSyncButton } from '@/components/subscription/SubscriptionSyncButton';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { Info, AlertCircle, CreditCard, History, BookOpen, CheckCircle } from 'lucide-react';

const SubscriptionPage: React.FC = () => {
  const { user, isLoading, isAuthenticated, refreshUser } = useAuth();
  const { toast } = useToast();
  const [showHistory, setShowHistory] = useState(false);

  if (isLoading) {
    return (
      <div>
        <div className="flex items-center justify-center h-[400px]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  const [, navigate] = useLocation();
  
  if (!isAuthenticated) {
    navigate("/login?redirect=/subscription");
    return null;
  }

  const handleSubscriptionSuccess = async () => {
    toast({
      title: "Subscription Updated",
      description: "Your subscription has been successfully updated.",
    });
    await refreshUser();
  };

  const handleSubscriptionCancel = async () => {
    await refreshUser();
  };

  // Find user's current package
  // HOTFIX: Force PINNACLE as default tab for testing/demo purposes
  let defaultTab = "PINNACLE";
  
  // In normal operation, use the user's selected package
  if (user?.selectedPackage && ["OPPORTUNITY", "MOMENTUM", "PROSPER", "PRESTIGE", "PINNACLE"].includes(user.selectedPackage)) {
    defaultTab = user.selectedPackage;
  }
  
  console.log("Subscription Status Debug:", {
    selectedPackage: user?.selectedPackage,
    subscriptionStatus: user?.subscription_status,
    paystack_subscription_code: user?.paystack_subscription_code,
    paystack_email_token: user?.paystack_email_token,
    defaultTab,
    usingFallback: defaultTab === "PINNACLE" && !user?.selectedPackage
  });

  return (
    <div>
      <div className="container mx-auto py-8">
        <div className="flex flex-wrap justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Manage Your Subscription</h1>
          
          <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-2 mt-4 md:mt-0">
            {/* Sync subscription button */}
            {user?.selectedPackage && (
              <SubscriptionSyncButton
                onSyncComplete={refreshUser}
                size="sm"
                className="w-full md:w-auto mb-2 md:mb-0"
              />
            )}
            
            <div className="flex space-x-2">
              <Button 
                variant={showHistory ? "outline" : "default"}
                size="sm"
                onClick={() => setShowHistory(false)}
                className="flex items-center"
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Packages
              </Button>
              <Button 
                variant={showHistory ? "default" : "outline"}
                size="sm"
                onClick={() => setShowHistory(true)}
                className="flex items-center"
              >
                <History className="mr-2 h-4 w-4" />
                History
              </Button>
            </div>
          </div>
        </div>
        
        {/* Sync notification for users with packages */}
        {user?.selectedPackage && !user?.paystack_subscription_code && (
          <Card className="mb-4 border-amber-200 bg-amber-50">
            <CardContent className="pt-6">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-amber-800 mr-2 flex-shrink-0 mt-0.5" />
                <div>
                  <h2 className="text-lg font-semibold text-amber-800 mb-1">Subscription Data Sync Required</h2>
                  <p className="text-amber-700 mb-3">
                    We've detected you have a subscription but some details may be missing in our system.
                    Click the "Sync Subscription" button above to refresh your subscription details.
                  </p>
                  <SubscriptionSyncButton 
                    onSyncComplete={refreshUser}
                    variant="default"
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex">
              <Info className="h-5 w-5 text-blue-800 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-semibold text-blue-800 mb-1">Important Information</h2>
                <p className="text-blue-700">
                  Access to the referral program is only available with PROSPER level packages and above. 
                  Upgrade your subscription to unlock the ability to refer others and earn rewards.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {showHistory ? (
          <SubscriptionHistory userId={user?.id} />
        ) : (
          <>
            <Tabs defaultValue={defaultTab} className="w-full">
              <TabsList className="grid grid-cols-5 mb-8">
                <TabsTrigger 
                  value="OPPORTUNITY" 
                  className={`relative ${user?.selectedPackage === "OPPORTUNITY" ? "ring-2 ring-zinc-400 font-semibold" : ""}`}
                >
                  <span className="inline-block w-3 h-3 rounded-full bg-zinc-400 mr-2"></span>
                  OPPORTUNITY
                  {user?.selectedPackage === "OPPORTUNITY" && (
                    <span className="absolute -top-1 -right-1 bg-green-500 rounded-full w-4 h-4 flex items-center justify-center">
                      <CheckCircle size={12} className="text-white" />
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="MOMENTUM" 
                  className={`relative ${user?.selectedPackage === "MOMENTUM" ? "ring-2 ring-blue-400 font-semibold" : ""}`}
                >
                  <span className="inline-block w-3 h-3 rounded-full bg-blue-400 mr-2"></span>
                  MOMENTUM
                  {user?.selectedPackage === "MOMENTUM" && (
                    <span className="absolute -top-1 -right-1 bg-green-500 rounded-full w-4 h-4 flex items-center justify-center">
                      <CheckCircle size={12} className="text-white" />
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="PROSPER" 
                  className={`relative ${user?.selectedPackage === "PROSPER" ? "ring-2 ring-green-400 font-semibold" : ""}`}
                >
                  <span className="inline-block w-3 h-3 rounded-full bg-green-400 mr-2"></span>
                  PROSPER
                  {user?.selectedPackage === "PROSPER" && (
                    <span className="absolute -top-1 -right-1 bg-green-500 rounded-full w-4 h-4 flex items-center justify-center">
                      <CheckCircle size={12} className="text-white" />
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="PRESTIGE" 
                  className={`relative ${user?.selectedPackage === "PRESTIGE" ? "ring-2 ring-purple-400 font-semibold" : ""}`}
                >
                  <span className="inline-block w-3 h-3 rounded-full bg-purple-400 mr-2"></span>
                  PRESTIGE
                  {user?.selectedPackage === "PRESTIGE" && (
                    <span className="absolute -top-1 -right-1 bg-green-500 rounded-full w-4 h-4 flex items-center justify-center">
                      <CheckCircle size={12} className="text-white" />
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger 
                  value="PINNACLE" 
                  className={`relative ${user?.selectedPackage === "PINNACLE" || (!user?.selectedPackage && defaultTab === "PINNACLE") ? "ring-2 ring-amber-400 font-semibold" : ""}`}
                >
                  <span className="inline-block w-3 h-3 rounded-full bg-amber-400 mr-2"></span>
                  PINNACLE
                  {(user?.selectedPackage === "PINNACLE" || (!user?.selectedPackage && defaultTab === "PINNACLE")) && (
                    <span className="absolute -top-1 -right-1 bg-green-500 rounded-full w-4 h-4 flex items-center justify-center">
                      <CheckCircle size={12} className="text-white" />
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>

              <div className="grid grid-cols-1 gap-8">
                <TabsContent value="OPPORTUNITY">
                  <PaystackSubscription 
                    packageType="OPPORTUNITY"
                    onSuccess={handleSubscriptionSuccess}
                    onCancel={handleSubscriptionCancel}
                  />
                </TabsContent>
                <TabsContent value="MOMENTUM">
                  <PaystackSubscription 
                    packageType="MOMENTUM"
                    onSuccess={handleSubscriptionSuccess}
                    onCancel={handleSubscriptionCancel}
                  />
                </TabsContent>
                <TabsContent value="PROSPER">
                  <PaystackSubscription 
                    packageType="PROSPER"
                    onSuccess={handleSubscriptionSuccess}
                    onCancel={handleSubscriptionCancel}
                  />
                </TabsContent>
                <TabsContent value="PRESTIGE">
                  <PaystackSubscription 
                    packageType="PRESTIGE"
                    onSuccess={handleSubscriptionSuccess}
                    onCancel={handleSubscriptionCancel}
                  />
                </TabsContent>
                <TabsContent value="PINNACLE">
                  <PaystackSubscription 
                    packageType="PINNACLE"
                    onSuccess={handleSubscriptionSuccess}
                    onCancel={handleSubscriptionCancel}
                  />
                </TabsContent>
              </div>
            </Tabs>

            <Card className="mt-12">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center">
                  <BookOpen className="mr-2 h-5 w-5 text-muted-foreground" />
                  Subscription Benefits
                </CardTitle>
                <CardDescription>
                  Compare features across different subscription tiers
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className={`bg-white p-4 rounded-lg shadow ${user?.selectedPackage === "OPPORTUNITY" ? "border-2 border-zinc-300 bg-zinc-50" : "border"} relative`}>
                    {user?.selectedPackage === "OPPORTUNITY" && (
                      <div className="absolute -top-2 -right-2 bg-green-500 rounded-full h-6 w-6 flex items-center justify-center">
                        <CheckCircle size={14} className="text-white" />
                      </div>
                    )}
                    <h3 className="font-semibold mb-2 flex items-center">
                      <span className="inline-block w-3 h-3 rounded-full bg-zinc-400 mr-2"></span>
                      OPPORTUNITY
                    </h3>
                    <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                      <li>Essential rewards program</li>
                      <li>Monthly newsletter</li>
                      <li>Basic customer support</li>
                    </ul>
                  </div>
                  
                  <div className={`bg-white p-4 rounded-lg shadow ${user?.selectedPackage === "MOMENTUM" ? "border-2 border-blue-300 bg-blue-50" : "border"} relative`}>
                    {user?.selectedPackage === "MOMENTUM" && (
                      <div className="absolute -top-2 -right-2 bg-green-500 rounded-full h-6 w-6 flex items-center justify-center">
                        <CheckCircle size={14} className="text-white" />
                      </div>
                    )}
                    <h3 className="font-semibold mb-2 flex items-center">
                      <span className="inline-block w-3 h-3 rounded-full bg-blue-400 mr-2"></span>
                      MOMENTUM
                    </h3>
                    <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                      <li>Enhanced rewards program</li>
                      <li>Quarterly digital magazine</li>
                      <li>Priority email support</li>
                      <li>Additional reward opportunities</li>
                    </ul>
                  </div>
                  
                  <div className={`bg-white p-4 rounded-lg shadow ${user?.selectedPackage === "PROSPER" ? "border-2 border-green-300 bg-green-50" : "border"} relative`}>
                    {user?.selectedPackage === "PROSPER" && (
                      <div className="absolute -top-2 -right-2 bg-green-500 rounded-full h-6 w-6 flex items-center justify-center">
                        <CheckCircle size={14} className="text-white" />
                      </div>
                    )}
                    <h3 className="font-semibold mb-2 flex items-center">
                      <span className="inline-block w-3 h-3 rounded-full bg-green-400 mr-2"></span>
                      PROSPER
                    </h3>
                    <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                      <li className="font-medium text-green-700">Access to referral program</li>
                      <li>Premium rewards program</li>
                      <li>Dedicated support agent</li>
                      <li>Monthly exclusive offers</li>
                      <li>Priority processing</li>
                    </ul>
                  </div>
                  
                  <div className={`bg-white p-4 rounded-lg shadow ${user?.selectedPackage === "PRESTIGE" ? "border-2 border-purple-300 bg-purple-50" : "border"} relative`}>
                    {user?.selectedPackage === "PRESTIGE" && (
                      <div className="absolute -top-2 -right-2 bg-green-500 rounded-full h-6 w-6 flex items-center justify-center">
                        <CheckCircle size={14} className="text-white" />
                      </div>
                    )}
                    <h3 className="font-semibold mb-2 flex items-center">
                      <span className="inline-block w-3 h-3 rounded-full bg-purple-400 mr-2"></span>
                      PRESTIGE
                    </h3>
                    <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                      <li className="font-medium text-green-700">VIP referral benefits</li>
                      <li>Elite rewards program</li>
                      <li>24/7 priority support</li>
                      <li>Exclusive member events</li>
                      <li>Quarterly performance reviews</li>
                      <li>Enhanced reward multipliers</li>
                    </ul>
                  </div>
                  
                  <div className={`bg-white p-4 rounded-lg shadow ${user?.selectedPackage === "PINNACLE" || (!user?.selectedPackage && defaultTab === "PINNACLE") ? "border-2 border-amber-300 bg-amber-50" : "border"} relative`}>
                    {(user?.selectedPackage === "PINNACLE" || (!user?.selectedPackage && defaultTab === "PINNACLE")) && (
                      <div className="absolute -top-2 -right-2 bg-green-500 rounded-full h-6 w-6 flex items-center justify-center">
                        <CheckCircle size={14} className="text-white" />
                      </div>
                    )}
                    <h3 className="font-semibold mb-2 flex items-center">
                      <span className="inline-block w-3 h-3 rounded-full bg-amber-400 mr-2"></span>
                      PINNACLE
                    </h3>
                    <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                      <li className="font-medium text-green-700">Maximum referral benefits</li>
                      <li>Ultimate rewards experience</li>
                      <li>Dedicated account manager</li>
                      <li>Customized rewards strategy</li>
                      <li>Exclusive VIP events</li>
                      <li>Premium reward multipliers</li>
                      <li>Early access to new features</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPage;