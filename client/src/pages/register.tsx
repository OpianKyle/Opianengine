import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/hooks/use-user";
import { Link } from "wouter";
import SignatureCanvas from "react-signature-canvas";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const packages = [
  {
    id: 1,
    name: "Bronze",
    price: 99,
    perks: [
      "5% Cashback on Purchases",
      "Basic Email Support",
      "Monthly Newsletter",
      "Basic Reward Points",
      "Standard Processing Time"
    ]
  },
  {
    id: 2,
    name: "Silver",
    price: 199,
    perks: [
      "10% Cashback on Purchases",
      "Priority Email Support",
      "Quarterly Digital Magazine",
      "1.5x Reward Points",
      "Fast-Track Processing",
      "Basic Insurance Coverage"
    ]
  },
  {
    id: 3,
    name: "Gold",
    price: 299,
    perks: [
      "15% Cashback on Purchases",
      "24/7 Phone Support",
      "Monthly Digital Magazine",
      "2x Reward Points",
      "Priority Processing",
      "Extended Insurance Coverage",
      "Quarterly Bonus Points"
    ]
  },
  {
    id: 4,
    name: "Platinum",
    price: 499,
    perks: [
      "20% Cashback on Purchases",
      "Dedicated Account Manager",
      "Premium Digital Content",
      "3x Reward Points",
      "VIP Processing",
      "Premium Insurance Package",
      "Monthly Bonus Points",
      "Exclusive Event Access"
    ]
  },
  {
    id: 5,
    name: "Diamond",
    price: 999,
    perks: [
      "25% Cashback on Purchases",
      "Personal Concierge Service",
      "Exclusive Print Magazine",
      "5x Reward Points",
      "Instant Priority Processing",
      "Comprehensive Insurance",
      "Weekly Bonus Points",
      "VIP Event Access",
      "Travel Benefits",
      "Family Coverage"
    ]
  }
];

const languages = ["English", "Afrikaans", "Zulu", "Xhosa", "Sotho", "Tswana"];

const benefitsInfo = [
  {
    title: "Exclusive Rewards",
    description: "Earn points on every purchase and redeem them for exciting rewards."
  },
  {
    title: "Cashback Benefits",
    description: "Get up to 25% cashback on your purchases depending on your package."
  },
  {
    title: "Priority Service",
    description: "Enjoy faster processing and dedicated support as you upgrade your package."
  },
  {
    title: "Insurance Coverage",
    description: "Comprehensive insurance benefits with higher-tier packages."
  },
  {
    title: "Exclusive Events",
    description: "Access to VIP events and experiences with premium packages."
  }
];

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    isSouthAfrican: false,
    idNumber: "",
    dateOfBirth: "",
    gender: "",
    language: "",
    mobileNumber: "",
    selectedPackage: null,
    // Banking Details
    accountHolderName: "",
    bankName: "",
    branchCode: "",
    accountNumber: "",
    accountType: "",
  });

  const [signature, setSignature] = useState<SignatureCanvas | null>(null);
  const [error, setError] = useState("");
  const [referralCode, setReferralCode] = useState<string | null>(null);

  const { registerMutation, user, isLoading } = useUser();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setReferralCode(ref);
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    navigate(user.isAdmin ? '/admin' : '/dashboard');
    return null;
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName ||
        !formData.idNumber || !formData.dateOfBirth || !formData.gender || !formData.language ||
        !formData.mobileNumber || !formData.selectedPackage || !formData.accountHolderName ||
        !formData.bankName || !formData.branchCode || !formData.accountNumber || !formData.accountType) {
      setError("Please fill in all required fields");
      return;
    }

    if (!signature?.isEmpty()) {
      setError("Please provide your signature");
      return;
    }

    const signatureData = signature?.toDataURL();

    try {
      const user = await registerMutation.mutateAsync({
        ...formData,
        signature: signatureData,
        ...(referralCode ? { referralCode } : {})
      });

      toast({
        title: "Success",
        description: "Registration successful",
      });

      navigate(user.isAdmin ? '/admin' : '/dashboard');
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || "Registration failed. Please try again.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Error",
        description: errorMessage,
      });
    }
  };

  const clearSignature = () => {
    signature?.clear();
  };

  return (
    <div className="min-h-screen bg-background p-0">
      <div className="max-w-[1800px] mx-auto">
        <div className="flex flex-col items-center mb-4 pt-4">
          <img
            src="/Assets/opian-logo-white.png"
            alt="OPIAN Rewards"
            className="h-12 w-auto dark:invert"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.onerror = null;
              img.src = '/logo-fallback.png';
            }}
          />
          <h2 className="mt-4 text-3xl font-semibold text-center">Create Your Account</h2>
          {referralCode && (
            <p className="mt-2 text-sm text-muted-foreground">
              You've been referred by a friend!
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          {/* Registration Form - Left Column */}
          <Card className="lg:col-span-2 p-4">
            <CardHeader className="p-4">
              <CardTitle>Personal Information</CardTitle>
              <CardDescription>
                Please fill in your details to create your account
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <form onSubmit={handleRegister} className="space-y-6">
                {/* Personal Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                  />
                  <Input
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                  />
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isSouthAfrican"
                      name="isSouthAfrican"
                      checked={formData.isSouthAfrican}
                      onCheckedChange={(checked) =>
                        setFormData(prev => ({ ...prev, isSouthAfrican: checked as boolean }))
                      }
                    />
                    <label htmlFor="isSouthAfrican" className="text-sm">
                      Are you a South African citizen?
                    </label>
                  </div>
                  <Input
                    name="idNumber"
                    placeholder="ID Number/Passport"
                    value={formData.idNumber}
                    onChange={handleInputChange}
                  />
                  <Input
                    name="dateOfBirth"
                    type="date"
                    placeholder="Date of Birth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                  />
                  <Select
                    onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Language" />
                    </SelectTrigger>
                    <SelectContent>
                      {languages.map(lang => (
                        <SelectItem key={lang} value={lang.toLowerCase()}>{lang}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    name="email"
                    type="email"
                    placeholder="Email address"
                    value={formData.email}
                    onChange={handleInputChange}
                  />
                  <Input
                    name="password"
                    type="password"
                    placeholder="Password"
                    value={formData.password}
                    onChange={handleInputChange}
                  />
                  <Input
                    name="mobileNumber"
                    placeholder="Mobile Number"
                    value={formData.mobileNumber}
                    onChange={handleInputChange}
                  />
                </div>

                {/* Package Selection with Carousel */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Select Your Package</h3>
                  <div className="relative">
                    <Carousel className="w-full">
                      <CarouselContent className="-ml-2 md:-ml-4">
                        {packages.map((pkg) => (
                          <CarouselItem key={pkg.id} className="pl-2 md:pl-4 basis-full md:basis-1/2 lg:basis-1/3">
                            <Card
                              className={`cursor-pointer transition-all hover:border-primary h-full ${
                                formData.selectedPackage === pkg.id ? 'border-primary ring-2 ring-primary' : ''
                              }`}
                              onClick={() => setFormData(prev => ({ ...prev, selectedPackage: pkg.id }))}
                            >
                              <CardHeader className="p-4">
                                <CardTitle className="flex justify-between items-center">
                                  {pkg.name}
                                  {formData.selectedPackage === pkg.id && (
                                    <Check className="h-5 w-5 text-primary" />
                                  )}
                                </CardTitle>
                                <CardDescription>R{pkg.price}/month</CardDescription>
                              </CardHeader>
                              <CardContent className="p-4">
                                <ul className="space-y-2">
                                  {pkg.perks.map((perk, index) => (
                                    <li key={index} className="flex items-center">
                                      <Badge variant="outline" className="mr-2">✓</Badge>
                                      {perk}
                                    </li>
                                  ))}
                                </ul>
                              </CardContent>
                            </Card>
                          </CarouselItem>
                        ))}
                      </CarouselContent>
                      <CarouselPrevious className="absolute -left-4 md:-left-6" />
                      <CarouselNext className="absolute -right-4 md:-right-6" />
                    </Carousel>
                  </div>
                </div>

                {/* Banking Details */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Banking Details</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      name="accountHolderName"
                      placeholder="Account Holder Name"
                      value={formData.accountHolderName}
                      onChange={handleInputChange}
                    />
                    <Input
                      name="bankName"
                      placeholder="Bank Name"
                      value={formData.bankName}
                      onChange={handleInputChange}
                    />
                    <Input
                      name="branchCode"
                      placeholder="Branch & Code"
                      value={formData.branchCode}
                      onChange={handleInputChange}
                    />
                    <Input
                      name="accountNumber"
                      placeholder="Account Number"
                      value={formData.accountNumber}
                      onChange={handleInputChange}
                    />
                    <Select
                      onValueChange={(value) => setFormData(prev => ({ ...prev, accountType: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Type of Account" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="savings">Savings</SelectItem>
                        <SelectItem value="current">Current</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Digital Signature */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Digital Signature</h3>
                  <div className="border rounded-lg p-4 bg-white">
                    <SignatureCanvas
                      ref={(ref) => setSignature(ref)}
                      canvasProps={{
                        className: "signature-canvas w-full h-40 border rounded",
                        style: { backgroundColor: 'white' }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={clearSignature}
                      className="mt-2"
                    >
                      Clear Signature
                    </Button>
                  </div>
                </div>

                {error && (
                  <div className="text-sm text-red-500 text-center">
                    {error}
                  </div>
                )}

                <div className="flex flex-col space-y-4">
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={registerMutation.isPending}
                  >
                    {registerMutation.isPending ? (
                      <div className="flex items-center justify-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Creating account...
                      </div>
                    ) : (
                      "Create account"
                    )}
                  </Button>

                  <div className="text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      className="text-[#43EB3E] hover:text-[#3AD936]"
                      asChild
                    >
                      <Link href="/login">Already have an account? Sign in</Link>
                    </Button>
                  </div>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Information Section - Right Column */}
          <div className="hidden lg:block space-y-4 sticky top-8 self-start">
            <Card className="h-full">
              <CardHeader className="p-4">
                <CardTitle>Program Benefits</CardTitle>
                <CardDescription>
                  Join our rewards program and enjoy these exclusive benefits
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-6">
                {benefitsInfo.map((benefit, index) => (
                  <div key={index} className="space-y-2">
                    <h4 className="font-semibold text-primary">{benefit.title}</h4>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4">
                <CardTitle>Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground mb-4">
                  If you have any questions about our packages or the registration process,
                  our support team is here to help.
                </p>
                <p className="text-sm font-semibold">Contact us:</p>
                <ul className="text-sm text-muted-foreground">
                  <li>Email: support@opianrewards.com</li>
                  <li>Phone: 0800 123 456</li>
                  <li>Hours: Mon-Fri 8am-5pm</li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}