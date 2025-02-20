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
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

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

const salaryBrackets = [
  "R0 - R10,000",
  "R10,001 - R20,000",
  "R20,001 - R30,000",
  "R30,001 - R50,000",
  "R50,001+"
];

const industries = [
  "Agriculture",
  "Construction",
  "Education",
  "Finance",
  "Healthcare",
  "Information Technology",
  "Manufacturing",
  "Mining",
  "Retail",
  "Services",
  "Transport",
  "Other"
];

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

let MandateText = `This signed Authority and Mandate refers to our contract dated `;

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    isSouthAfrican: false,
    idNumber: "",
    dateOfBirth: "",
    gender: "",
    mobileNumber: "",
    occupation: "",
    industry: "",
    salaryBracket: "",
    addressLine1: "",
    addressLine2: "",
    suburb: "",
    postalCode: "",
    hasCreditCard: false,
    selectedPackage: null,
    accountHolderName: "",
    bankName: "",
    branchCode: "",
    accountNumber: "",
    accountType: "",
    acceptMandate: false,
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

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName ||
      !formData.idNumber || !formData.dateOfBirth || !formData.gender ||
      !formData.mobileNumber || !formData.selectedPackage || !formData.accountHolderName ||
      !formData.bankName || !formData.branchCode || !formData.accountNumber || !formData.accountType || !formData.acceptMandate ||
      !formData.occupation || !formData.industry || !formData.salaryBracket ||
      !formData.addressLine1 || !formData.suburb || !formData.postalCode
    ) {
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

  const today = new Date().toISOString().split('T')[0];
  MandateText += `${today} ("the Agreement").
I/We hereby authorise you to issue and deliver payment instructions of R550 per month for the program fee to your Banker for collection against my/our abovementioned account at my/our above-mentioned Bank (or any other bank or branch to which I/we may transfer my/our account) on condition that the sum of such payment instructions will never exceed my/our obligations as agreed to in the Agreement and commencing on 1rst of each month and continuing until this Authority and Mandate is terminated by me/us by giving you notice in writing of not less than 20 ordinary working days, and sent by prepaid registered post or delivered to your address as indicated above.

The individual payment instructions so authorised to be issued must be issued and delivered as follows: R550 monthly.

Personal Details:
- Full Name: ${formData.firstName} ${formData.lastName}
- ID Number: ${formData.idNumber}
- Mobile: ${formData.mobileNumber}

Employment Details:
- Occupation: ${formData.occupation}
- Industry: ${formData.industry}
- Salary Bracket: ${formData.salaryBracket}

Residential Address:
${formData.addressLine1}
${formData.addressLine2}
${formData.suburb}
${formData.postalCode}

Banking Details:
- Account Holder: ${formData.accountHolderName}
- Bank: ${formData.bankName}
- Branch Code: ${formData.branchCode}
- Account Number: ${formData.accountNumber}
- Account Type: ${formData.accountType}

In the event that the payment day falls on a Sunday, or recognised South African public holiday, the payment day will automatically be the preceding ordinary business day.

I/We understand that the withdrawals hereby authorized will be processed through a computerized system provided by the South African Banks and I also understand that details of each withdrawal will be printed on my bank statement. Each transaction will contain a number, which must be included in the said payment instruction and if provided to you should enable you to identify the Agreement.

Mandate
I/We acknowledge that all payment instructions issued by you shall be treated by my/our above-mentioned Bank as if the instructions have been issued by me/us personally.

Cancellation
I/We agree that although this Authority and Mandate may be cancelled by me/us, such cancellation will not cancel the Agreement. I/We shall not be entitled to any refund of amounts which you have withdrawn while this Authority was in force, if such amounts were legally owing to you.

Assignment
I/We acknowledge that this Authority may be ceded or assigned to a third party if the Agreement is also ceded or assigned to that third party, but in the absence of such assignment of the Agreement, this Authority and Mandate cannot be assigned to any third party.`;

  return (
    <div className="min-h-screen w-full bg-background">
      <div className="container mx-auto px-4 py-6 md:px-6">
        <div className="flex flex-col items-center space-y-4 mb-8">
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
          <h2 className="text-2xl font-semibold text-center">Create Your Account</h2>
          {referralCode && (
            <p className="text-sm text-muted-foreground text-center">
              You've been referred by a friend!
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 max-w-[1400px] mx-auto">
          <Card className="lg:col-span-8">
            <CardContent className="p-6">
              <form onSubmit={handleRegister} className="space-y-8">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Personal Information</h3>
                  <div className="grid gap-4">
                    <div className="grid sm:grid-cols-2 gap-4">
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
                    </div>
                    <Input
                      name="email"
                      type="email"
                      placeholder="Email address"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                    <Input
                      name="mobileNumber"
                      placeholder="Mobile Number"
                      value={formData.mobileNumber}
                      onChange={handleInputChange}
                    />
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input
                        name="idNumber"
                        placeholder="ID Number/Passport"
                        value={formData.idNumber}
                        onChange={handleInputChange}
                      />
                      <div className="flex items-center h-10 px-3 border rounded-md">
                        <Checkbox
                          id="isSouthAfrican"
                          name="isSouthAfrican"
                          checked={formData.isSouthAfrican}
                          onCheckedChange={(checked) =>
                            setFormData(prev => ({ ...prev, isSouthAfrican: checked as boolean }))
                          }
                        />
                        <label htmlFor="isSouthAfrican" className="ml-2 text-sm">
                          South African citizen
                        </label>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input
                        name="dateOfBirth"
                        type="date"
                        placeholder="Date of Birth"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                      />
                      <Select name="gender" onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="male">Male</SelectItem>
                          <SelectItem value="female">Female</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Password Security</h3>
                  <div className="grid gap-4">
                    <Input
                      name="password"
                      type="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleInputChange}
                    />
                    <Input
                      name="confirmPassword"
                      type="password"
                      placeholder="Confirm Password"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                    />
                  </div>
                </div>


                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Employment Information</h3>
                  <div className="grid gap-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input
                        name="occupation"
                        placeholder="Occupation"
                        value={formData.occupation}
                        onChange={handleInputChange}
                      />
                      <Select onValueChange={handleInputChange}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Industry" />
                        </SelectTrigger>
                        <SelectContent>
                          {industries.map(industry => (
                            <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Select name="industry" onValueChange={handleInputChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Salary Bracket" />
                      </SelectTrigger>
                      <SelectContent>
                        {salaryBrackets.map(bracket => (
                          <SelectItem key={bracket} value={bracket}>{bracket}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Address Information</h3>
                  <div className="grid gap-4">
                    <Input
                      name="addressLine1"
                      placeholder="Address Line 1"
                      value={formData.addressLine1}
                      onChange={handleInputChange}
                    />
                    <Input
                      name="addressLine2"
                      placeholder="Address Line 2"
                      value={formData.addressLine2}
                      onChange={handleInputChange}
                    />
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input
                        name="suburb"
                        placeholder="Suburb"
                        value={formData.suburb}
                        onChange={handleInputChange}
                      />
                      <Input
                        name="postalCode"
                        placeholder="Postal Code"
                        value={formData.postalCode}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Financial Information</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="hasCreditCard"
                      name="hasCreditCard"
                      checked={formData.hasCreditCard}
                      onCheckedChange={handleInputChange}
                    />
                    <label htmlFor="hasCreditCard" className="text-sm">
                      Do you own a credit card?
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Select Your Package</h3>
                  <div className="relative">
                    <Carousel className="w-full">
                      <CarouselContent>
                        {packages.map((pkg) => (
                          <CarouselItem key={pkg.id} className="basis-full sm:basis-1/2 md:basis-1/2">
                            <Card
                              className={`mx-2 cursor-pointer transition-all hover:border-primary ${
                                formData.selectedPackage === pkg.id ? 'border-primary ring-2 ring-primary' : ''
                              }`}
                              onClick={() => setFormData(prev => ({ ...prev, selectedPackage: pkg.id }))}
                            >
                              <CardHeader className="p-4 sm:p-6">
                                <CardTitle className="flex justify-between items-center text-lg">
                                  {pkg.name}
                                  {formData.selectedPackage === pkg.id && (
                                    <Check className="h-5 w-5 text-primary" />
                                  )}
                                </CardTitle>
                                <CardDescription className="text-base">R{pkg.price}/month</CardDescription>
                              </CardHeader>
                              <CardContent className="p-4 sm:p-6">
                                <ul className="space-y-2">
                                  {pkg.perks.map((perk, index) => (
                                    <li key={index} className="flex items-center text-sm">
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
                      <CarouselPrevious className="absolute -left-4 -translate-y-1/2" />
                      <CarouselNext className="absolute -right-4 -translate-y-1/2" />
                    </Carousel>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Banking Details</h3>
                  <div className="grid gap-4">
                    <div className="grid sm:grid-cols-2 gap-4">
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
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
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
                    </div>
                    <Select name="accountType" onValueChange={handleInputChange}>
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

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Mandate Agreement</h3>
                  <Card className="bg-muted/50">
                    <CardContent className="p-4">
                      <ScrollArea className="h-[200px] w-full rounded-md">
                        <div className="p-4 text-sm whitespace-pre-wrap">
                          {MandateText}
                        </div>
                      </ScrollArea>
                    </CardContent>
                  </Card>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="acceptMandate"
                      name="acceptMandate"
                      checked={formData.acceptMandate}
                      onCheckedChange={handleInputChange}
                    />
                    <label htmlFor="acceptMandate" className="text-sm">
                      I accept the terms of the mandate
                    </label>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Digital Signature</h3>
                  <div className="border rounded-lg p-4 bg-white">
                    <SignatureCanvas
                      ref={(ref) => setSignature(ref)}
                      canvasProps={{
                        className: "signature-canvas w-full h-32 border rounded",
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

                <div className="space-y-4">
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

          <aside className="hidden lg:block lg:col-span-4">
            <div className="space-y-6 sticky top-8">
              <Card>
                <CardHeader>
                  <CardTitle>About Opian Rewards</CardTitle>
                  <CardDescription>
                    Join South Africa's premier rewards program
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-primary">Why Choose Opian?</h4>
                    <ul className="space-y-3 text-sm text-muted-foreground">
                      <li className="flex items-start">
                        <Badge variant="outline" className="mr-2 mt-1">✓</Badge>
                        Industry-leading rewards rates with up to 25% cashback on purchases
                      </li>
                      <li className="flex items-start">
                        <Badge variant="outline" className="mr-2 mt-1">✓</Badge>
                        Exclusive access to premium financial products and services
                      </li>
                      <li className="flex items-start">
                        <Badge variant="outline" className="mr-2 mt-1">✓</Badge>
                        Comprehensive insurance coverage options
                      </li>
                      <li className="flex items-start">
                        <Badge variant="outline" className="mr-2 mt-1">✓</Badge>
                        VIP events and experiences for premium members
                      </li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-primary">Our Commitment</h4>
                    <p className="text-sm text-muted-foreground">
                      At Opian Rewards, we're committed to providing exceptional value to our members.
                      Our program is designed to reward your loyalty with real, tangible benefits that
                      make a difference in your financial journey.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Need Help?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    Our support team is here to help you with any questions about our
                    packages or the registration process.
                  </p>
                  <div className="space-y-2">
                    <p className="text-sm font-semibold">Contact us:</p>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>Email: support@opianrewards.com</li>
                      <li>Phone: 0800 123 456</li>
                      <li>Hours: Mon-Fri 8am-5pm</li>
                    </ul>
                  </div>
                </CardContent>
              </Card>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}