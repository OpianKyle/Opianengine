import React from 'react';
import { PaystackSubscription } from '@/components/subscription/PaystackSubscription';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';

const SubscriptionPage: React.FC = () => {
  const { user, isLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();

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

  const handleSubscriptionSuccess = () => {
    toast({
      title: "Subscription Updated",
      description: "Your subscription has been successfully updated.",
    });
  };

  // Find user's current package
  let defaultTab = user?.selectedPackage || "OPPORTUNITY";
  if (!["OPPORTUNITY", "MOMENTUM", "PROSPER", "PRESTIGE", "PINNACLE"].includes(defaultTab)) {
    defaultTab = "OPPORTUNITY";
  }

  return (
    <div>
      <div className="container mx-auto py-8">
        <h1 className="text-3xl font-bold mb-8">Manage Your Subscription</h1>
        
        <div className="mb-8 bg-blue-50 p-4 rounded-lg border border-blue-200">
          <h2 className="text-lg font-semibold text-blue-800 mb-2">Important Information</h2>
          <p className="text-blue-700">
            Packages with PROSPER level and above include access to the referral program. 
            Subscribe to unlock the ability to refer others and earn points.
          </p>
        </div>

        <Tabs defaultValue={defaultTab} className="w-full">
          <TabsList className="grid grid-cols-5 mb-8">
            <TabsTrigger value="OPPORTUNITY" className="relative">
              <span className="inline-block w-3 h-3 rounded-full bg-zinc-400 mr-2"></span>
              OPPORTUNITY
            </TabsTrigger>
            <TabsTrigger value="MOMENTUM" className="relative">
              <span className="inline-block w-3 h-3 rounded-full bg-blue-400 mr-2"></span>
              MOMENTUM
            </TabsTrigger>
            <TabsTrigger value="PROSPER" className="relative">
              <span className="inline-block w-3 h-3 rounded-full bg-green-400 mr-2"></span>
              PROSPER
            </TabsTrigger>
            <TabsTrigger value="PRESTIGE" className="relative">
              <span className="inline-block w-3 h-3 rounded-full bg-purple-400 mr-2"></span>
              PRESTIGE
            </TabsTrigger>
            <TabsTrigger value="PINNACLE" className="relative">
              <span className="inline-block w-3 h-3 rounded-full bg-amber-400 mr-2"></span>
              PINNACLE
            </TabsTrigger>
          </TabsList>

          <div className="grid grid-cols-1 gap-8">
            <TabsContent value="OPPORTUNITY">
              <PaystackSubscription 
                packageType="OPPORTUNITY"
                onSuccess={handleSubscriptionSuccess}
              />
            </TabsContent>
            <TabsContent value="MOMENTUM">
              <PaystackSubscription 
                packageType="MOMENTUM"
                onSuccess={handleSubscriptionSuccess}
              />
            </TabsContent>
            <TabsContent value="PROSPER">
              <PaystackSubscription 
                packageType="PROSPER"
                onSuccess={handleSubscriptionSuccess}
              />
            </TabsContent>
            <TabsContent value="PRESTIGE">
              <PaystackSubscription 
                packageType="PRESTIGE"
                onSuccess={handleSubscriptionSuccess}
              />
            </TabsContent>
            <TabsContent value="PINNACLE">
              <PaystackSubscription 
                packageType="PINNACLE"
                onSuccess={handleSubscriptionSuccess}
              />
            </TabsContent>
          </div>
        </Tabs>

        <div className="mt-8 space-y-4">
          <h2 className="text-xl font-semibold">Subscription Benefits</h2>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="bg-white p-4 rounded-lg shadow">
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
              
              <div className="bg-white p-4 rounded-lg shadow">
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
              
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-2 flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-green-400 mr-2"></span>
                  PROSPER
                </h3>
                <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                  <li>Premium rewards program</li>
                  <li>Access to referral program</li>
                  <li>Dedicated support agent</li>
                  <li>Monthly exclusive offers</li>
                  <li>Priority processing</li>
                </ul>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-2 flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-purple-400 mr-2"></span>
                  PRESTIGE
                </h3>
                <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                  <li>Elite rewards program</li>
                  <li>VIP referral benefits</li>
                  <li>24/7 priority support</li>
                  <li>Exclusive member events</li>
                  <li>Quarterly performance reviews</li>
                  <li>Enhanced reward multipliers</li>
                </ul>
              </div>
              
              <div className="bg-white p-4 rounded-lg shadow">
                <h3 className="font-semibold mb-2 flex items-center">
                  <span className="inline-block w-3 h-3 rounded-full bg-amber-400 mr-2"></span>
                  PINNACLE
                </h3>
                <ul className="list-disc list-inside text-sm space-y-1 text-gray-600">
                  <li>Ultimate rewards experience</li>
                  <li>Maximum referral benefits</li>
                  <li>Dedicated account manager</li>
                  <li>Customized rewards strategy</li>
                  <li>Exclusive VIP events</li>
                  <li>Premium reward multipliers</li>
                  <li>Early access to new features</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPage;