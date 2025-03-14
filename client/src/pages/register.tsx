import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckIcon } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { z } from "zod";

const packages = [
  {
    id: "OPPORTUNITY",
    display: "OPPORTUNITY",
    price: 350,
    activationPoints: 2500,
    perks: [
      "Activation Points: 2,500",
      "EMS Assist",
      "Legal Assist",
      "Repatriation Cover",
      "Celebrate Life",
      "24/7 Nurse On-Call"
    ]
  },
  {
    id: "MOMENTUM",
    display: "MOMENTUM",
    price: 450,
    activationPoints: 5000,
    perks: [
      "Activation Points: 5,000",
      "Funeral Cover: R5,000",
      "Funeral Assist",
      "EMS Assist",
      "Legal Assist",
      "Repatriation Cover",
      "Celebrate Life",
      "24/7 Nurse On-Call"
    ]
  },
  {
    id: "PROSPER",
    display: "PROSPER",
    price: 550,
    activationPoints: 7500,
    perks: [
      "Activation Points: 7,500",
      "Funeral Cover: R10,000",
      "Accidental Death Cover: R20,000",
      "Funeral Assist",
      "Family Income Benefit: R5,000 x6",
      "EMS Assist",
      "Legal Assist",
      "Repatriation Cover",
      "Celebrate Life",
      "24/7 Nurse On-Call",
      "Virtual GP Assistant",
      "Medical Second Opinion"
    ]
  },
  {
    id: "PRESTIGE",
    display: "PRESTIGE",
    price: 695,
    activationPoints: 10000,
    perks: [
      "Activation Points: 10,000",
      "Funeral Cover: R15,000",
      "Accidental Death Cover: R50,000",
      "Funeral Assist",
      "Family Income Benefit: R5,000 x6",
      "EMS Assist",
      "Legal Assist",
      "Repatriation Cover",
      "Celebrate Life",
      "24/7 Nurse On-Call",
      "Virtual GP Assistant",
      "Medical Second Opinion",
      "Crime Victim Assist",
      "Assault & Trauma Assist",
      "Emergency Medical Services"
    ]
  },
  {
    id: "PINNACLE",
    display: "PINNACLE",
    price: 825,
    activationPoints: 12500,
    perks: [
      "Activation Points: 12,500",
      "Funeral Cover: R20,000",
      "Accidental Death Cover: R100,000",
      "Funeral Assist",
      "Family Income Benefit: R5,000 x6",
      "EMS Assist",
      "Legal Assist",
      "Lawyer Assist",
      "Repatriation Cover",
      "Celebrate Life",
      "24/7 Nurse On-Call",
      "Virtual GP Assistant",
      "Medical Second Opinion",
      "Crime Victim Assist",
      "Assault & Trauma Assist",
      "Emergency Medical Services"
    ]
  }
];

const PackageCard = ({ pkg, isSelected, onSelect, anySelected }: {
  pkg: typeof packages[0],
  isSelected: boolean,
  onSelect: () => void,
  anySelected: boolean
}) => (
  <Card
    className={`w-full h-[700px] cursor-pointer transition-all relative overflow-visible
      ${isSelected
        ? 'border-[#43EB3E] ring-2 ring-[#43EB3E] shadow-[0_0_10px_rgba(67,235,62,0.3)]'
        : anySelected
          ? 'opacity-50 hover:opacity-75'
          : 'hover:border-primary'
      }`}
    onClick={onSelect}
  >
    <CardHeader className="p-4 sm:p-6">
      <CardTitle className="flex justify-between items-center text-lg">
        {pkg.display}
        {isSelected && (
          <CheckIcon className="h-5 w-5 text-[#43EB3E]" />
        )}
      </CardTitle>
      <CardDescription className="text-base">R{pkg.price}/month</CardDescription>
    </CardHeader>
    <CardContent className="p-4 sm:p-6">
      <div className="space-y-2">
        <ul className="space-y-2">
          {pkg.perks.map((perk, index) => (
            <li key={index} className="flex items-start text-sm">
              <Badge variant="outline" className="mr-2 shrink-0">✓</Badge>
              <span>{perk}</span>
            </li>
          ))}
        </ul>
      </div>
    </CardContent>
    <div className="absolute bottom-6 left-6 right-6">
      <Button
        className={`w-full ${isSelected ? 'bg-[#43EB3E] hover:bg-[#43EB3E]' : ''}`}
        variant={isSelected ? "default" : "outline"}
      >
        {isSelected ? "Selected" : "Select Package"}
      </Button>
    </div>
  </Card>
);

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
    gender: "" as "male" | "female" | "other" | "",
    mobileNumber: "",
    occupation: "",
    industry: "",
    addressLine1: "",
    suburb: "",
    postalCode: "",
    hasCreditCard: false,
    selectedPackage: "OPPORTUNITY" as string,
    accountHolderName: "",
    bankName: "",
    branchCode: "",
    accountNumber: "",
    accountType: "SAVINGS", // Set default value to SAVINGS
    acceptMandate: false,
    referralCode: ""
  });

  const [signature, setSignature] = useState<SignatureCanvas | null>(null);
  const [error, setError] = useState("");
  const { registerMutation, user, isLoading } = useUser();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  // Enhanced referral code handling
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setFormData(prev => ({
        ...prev,
        referralCode: ref
      }));
      console.log('Referral code set from URL:', ref);

      // Verify the referral code
      fetch(`/api/verify-referral/${ref}`)
        .then(res => res.json())
        .then(data => {
          if (!data.isValid) {
            toast({
              title: "Invalid Referral Code",
              description: "The referral code is not valid.",
              variant: "destructive",
            });
            // Clear invalid referral code
            setFormData(prev => ({ ...prev, referralCode: "" }));
          }
        })
        .catch(err => {
          console.error('Error verifying referral code:', err);
        });
    }
  }, [toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) {
    console.log('User data for redirection:', {
      id: user.id,
      email: user.email,
      is_admin: user.is_admin,
      is_super_admin: user.is_super_admin,
      admin_type: typeof user.is_admin,
      super_admin_type: typeof user.is_super_admin
    });

    // Simplified check for admin status using truthiness
    if (user.is_admin || user.is_super_admin) {
      console.log('Redirecting to admin dashboard - user has admin privileges');
      navigate('/admin/dashboard');
      return null;
    } else {
      console.log('Redirecting to customer dashboard - user lacks admin privileges');
      navigate('/dashboard');
      return null;
    }
  }


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | string, fieldName?: string) => {
    if (typeof e === 'string' && fieldName) {
      setFormData(prev => ({
        ...prev,
        [fieldName]: e
      }));
    } else if (typeof e !== 'string') {
      const { name, value, type } = e.target;
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
      }));
    }
  };

  const handleCheckboxChange = (name: string) => (checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      [name]: checked
    }));
  };

  const registerSchema = z.object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z.string().min(8, { message: "Password must be at least 8 characters" }),
    confirmPassword: z.string().min(8, { message: "Password must be at least 8 characters" }),
    firstName: z.string().min(1, { message: "First name is required" }),
    lastName: z.string().min(1, { message: "Last name is required" }),
    isSouthAfrican: z.boolean(),
    idNumber: z.string().min(1, { message: "ID Number/Passport is required" }),
    dateOfBirth: z.string().min(1, { message: "Date of birth is required" }),
    gender: z.enum(["male", "female", "other"], { required_error: "Please select your gender" }),
    mobileNumber: z.string().min(10, { message: "Mobile number must be at least 10 digits" }),
    occupation: z.string().min(1, { message: "Occupation is required" }),
    industry: z.string().min(1, { message: "Industry is required" }),
    addressLine1: z.string().min(1, { message: "Address is required" }),
    suburb: z.string().min(1, { message: "Suburb is required" }),
    postalCode: z.string().min(1, { message: "Postal code is required" }),
    hasCreditCard: z.boolean(),
    selectedPackage: z.enum(["OPPORTUNITY", "MOMENTUM", "PROSPER", "PRESTIGE", "PINNACLE"], {
      required_error: "Please select a package"
    }),
    accountHolderName: z.string().min(1, { message: "Account holder name is required" }),
    bankName: z.string().min(1, { message: "Bank name is required" }),
    branchCode: z.string().min(1, { message: "Branch code is required" }),
    accountNumber: z.string().min(1, { message: "Account number is required" }),
    accountType: z.enum(["SAVINGS", "CURRENT", "CHEQUE", "CREDIT"], { required_error: "Please select an account type" }),
    acceptMandate: z.boolean(),
    referralCode: z.string().optional()
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      const validation = registerSchema.safeParse(formData);
      if (!validation.success) {
        setError(validation.error.errors.map(err => err.message).join(', '));
        return;
      }
      
      if (formData.password !== formData.confirmPassword) {
        setError("Passwords do not match");
        return;
      }


      // Get activation points for selected package
      const selectedPackageData = packages.find(pkg => pkg.id === formData.selectedPackage);
      if (!selectedPackageData) {
        setError("Invalid package selected");
        return;
      }

      if (!formData.gender) {
        setError("Please select a gender");
        return;
      }

      if (!formData.acceptMandate) {
        setError("Please accept the mandate agreement");
        return;
      }

      if (!signature || signature.isEmpty()) {
        setError("Please provide your digital signature");
        return;
      }

      const signatureData = signature.toDataURL();

      const registrationData = {
        ...formData,
        phoneNumber: formData.mobileNumber,
        address: formData.addressLine1,
        city: formData.suburb,
        employerName: formData.industry,
        jobTitle: formData.occupation,
        signature: signatureData,
        selectedPackage: formData.selectedPackage,
        points: selectedPackageData.activationPoints,
        referralCode: formData.referralCode,
        gender: formData.gender,
        account_type: formData.accountType // Ensure account_type is explicitly set
      };

      console.log('Submitting registration data:', { ...registrationData, password: '[REDACTED]' });
      const user = await registerMutation.mutateAsync(registrationData);

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
  const MandateText = `This signed Authority and Mandate refers to our contract dated
${today}
("the Agreement").

I / We hereby authorise you to issue and deliver payment instructions of ${
    packages.find(pkg => pkg.id === formData.selectedPackage)?.price || 0
  } per month for the subscription fee to your Banker for collection against my / our abovementioned account at my / our above-mentioned Bank (or any other bank or branch to which I / we may transfer my / our account) on condition that the sum of such payment instructions will never exceed my / our obligations as as agreed to in the Agreement and commencing on 1st of each month and continuing until this Authority and Mandate is terminated by me / us by giving you notice in writing of not less than 60 ordinary working days, and sent by prepaid registered post or delivered to your address as indicated above.

The individual payment instructions so authorised to be issued must be issued and delivered as follows: ${
    packages.find(pkg => pkg.id === formData.selectedPackage)?.price || 0
  } monthly for 12 months. This is an annual agreement which is automatically renewable unless canceled in writing 

In the event that the payment day falls on a Sunday, or recognised South African public holiday, the payment day will automatically be the preceding ordinary business day.

Payment Instructions due in December may be debited against my account on a earlier date

I / We understand that the withdrawals hereby authorized will be processed through a computerized system provided by the South African Banks and I also understand that details of each withdrawal will be printed on my bank statement. Each transaction will contain a number, which must be included in the said payment instruction and if provided to you should enable you to identify the Agreement. A payment reference is added to this form before the issuing of any payment instruction.

Mandate
I /We acknowledge that all payment instructions issued by you shall be treated by my / our above-mentioned Bank as if the instructions have been issued by me/us personally.

Cancellation
I / We agree that although this Authority and Mandate may be cancelled by me / us, such cancellation will not cancel the Agreement I / We shall not be entitled to any refund of amounts which you have withdrawn while this Authority was in force, if such amounts were legally owing to you.

Assignment
I / We acknowledge that this Authority may be ceded or assigned to a third party if the Agreement is also ceded or assigned to that third party, but in the absence of such assignment of the Agreement, this Authority and Mandate cannot be assigned to any third party.`;

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
                          checked={formData.isSouthAfrican}
                          onCheckedChange={handleCheckboxChange('isSouthAfrican')}
                          className="border-[#43EB3E] data-[state=checked]:bg-[#43EB3E] data-[state=checked]:text-white"
                        />
                        <label htmlFor="isSouthAfrican" className="ml-2 text-sm">
                          South African citizen
                        </label>
                      </div>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date of Birth</Label>
                        <Input
                          id="dateOfBirth"
                          name="dateOfBirth"
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={handleInputChange}
                          className="w-full"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Gender</Label>
                        <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value as "male" | "female" | "other" }))}>
                          <SelectTrigger className="w-full">
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
                      <Select onValueChange={(value) => handleInputChange(value, 'industry')}>
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
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="text-lg font-semibold border-b pb-2">Address Information</h3>
                  <div className="grid gap-4">
                    <Input
                      name="addressLine1"
                      placeholder="Address"
                      value={formData.addressLine1}
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
                      checked={formData.hasCreditCard}
                      onCheckedChange={handleCheckboxChange('hasCreditCard')}
                      className="border-[#43EB3E] data-[state=checked]:bg-[#43EB3E] data-[state=checked]:text-white"
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
                            <PackageCard
                              pkg={pkg}
                              isSelected={formData.selectedPackage === pkg.id}
                              anySelected={!!formData.selectedPackage}
                              onSelect={() => setFormData(prev => ({ ...prev, selectedPackage: pkg.id }))}
                            />
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
                    <Select name="accountType" onValueChange={(value) => handleInputChange(value, 'accountType')}>
                      <SelectTrigger>
                        <SelectValue placeholder="Type of Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {accountTypes.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type.charAt(0) + type.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
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
                      <div className="flex items-center space-x-2 mt-8 pt-4 border-t">
                        <Checkbox
                          id="acceptMandate"
                          checked={formData.acceptMandate}
                          onCheckedChange={handleCheckboxChange('acceptMandate')}
                          className="border-[#43EB3E] data-[state=checked]:bg-[#43EB3E] data-[state=checked]:text-white"
                        />
                        <label htmlFor="acceptMandate" className="text-sm">
                          I accept the terms of the mandate
                        </label>
                      </div>
                      <div className="space-y-4">
                        <Label>Digital Signature</Label>
                        <Card className="p-4">
                          <div className="border rounded-md bg-background">
                            <SignatureCanvas
                              ref={(ref) => setSignature(ref)}
                              canvasProps={{
                                className: 'w-full h-[200px]',
                                style: {
                                  background: 'transparent',
                                  border: '1px solid var(--border)'
                                }
                              }}
                              penColor='white'
                            />
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={clearSignature}
                          >
                            Clear Signature
                          </Button>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
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

const accountTypes = ["SAVINGS", "CURRENT", "CHEQUE", "CREDIT"];

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