import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { UserPlus, Search } from "lucide-react";
import { useState } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import SignatureCanvas from 'react-signature-canvas';

const userSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phoneNumber: z.string().min(1, "Phone number is required"),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  idNumber: z.string().optional(),
  occupation: z.string().optional(),
  industry: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
  selectedPackage: z.string().optional(),
  bankName: z.string().optional(),
  accountType: z.string().optional(),
  accountNumber: z.string().optional(),
  accountHolderName: z.string().optional(),
  branchCode: z.string().optional(),
  signature: z.string().optional(),
  acceptMandate: z.boolean().optional(),
});

type UserFormData = z.infer<typeof userSchema>;

const packages = [
  { id: 'BEGINNER', name: 'Beginner', price: 550 },
  { id: 'NOVICE', name: 'Novice', price: 750 },
  { id: 'ACTIVE', name: 'Active', price: 950 },
  { id: 'PROFESSIONAL', name: 'Professional', price: 1150 },
  { id: 'EXPERT', name: 'Expert', price: 1350 },
];

export default function AgentCustomers() {
  const { data: customers, refetch } = useQuery({
    queryKey: ["/api/agent/customers"],
    staleTime: 0,
  });

  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    phoneNumber: '',
    dateOfBirth: '',
    gender: '',
    idNumber: '',
    occupation: '',
    industry: '',
    address: '',
    city: '',
    postalCode: '',
    selectedPackage: '',
    bankName: '',
    accountType: '',
    accountNumber: '',
    accountHolderName: '',
    branchCode: '',
    signature: '',
    acceptMandate: false,
  });

  const [filters, setFilters] = useState({
    search: '',
  });

  const { toast } = useToast();
  let signaturePad: any = null;

  const createCustomerMutation = useMutation({
    mutationFn: async (data: UserFormData) => {
      const res = await fetch("/api/agent/customers/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent/customers"] });
      refetch();
      toast({ title: "Success", description: "Customer created successfully" });
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        phoneNumber: '',
        dateOfBirth: '',
        gender: '',
        idNumber: '',
        occupation: '',
        industry: '',
        address: '',
        city: '',
        postalCode: '',
        selectedPackage: '',
        bankName: '',
        accountType: '',
        accountNumber: '',
        accountHolderName: '',
        branchCode: '',
        signature: '',
        acceptMandate: false,
      });
      if (signaturePad) {
        signaturePad.clear();
      }
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const handleSubmit = () => {
    if (!formData.acceptMandate) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please accept the mandate before proceeding",
      });
      return;
    }

    if (!formData.signature) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please provide a signature",
      });
      return;
    }

    createCustomerMutation.mutate(formData as UserFormData);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
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
I /We agree that although this Authority and Mandate may be cancelled by me/us, such cancellation will not cancel the Agreement. I/We shall not be entitled to any refund of amounts which you have withdrawn while this authority was in force, if such amounts were legally owing to you.

Assignment
I/We acknowledge that this Authority and Mandate has been ceded to Netcash (Pty) Ltd as per your agreement with Netcash (Pty) Ltd, but in the absence of such assignment of the Agreement, this Authority and Mandate will be null and void.`;

  const filteredCustomers = customers?.filter((customer: any) => {
    const searchTerms = filters.search.toLowerCase();
    return (
      customer.firstName?.toLowerCase().includes(searchTerms) ||
      customer.lastName?.toLowerCase().includes(searchTerms) ||
      customer.email?.toLowerCase().includes(searchTerms) ||
      customer.phoneNumber?.includes(searchTerms)
    );
  });

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">My Customers</h1>
        <Dialog>
          <DialogTrigger asChild>
            <Button className="w-full md:w-auto">
              <UserPlus className="h-4 w-4 mr-2" />
              Register New Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle>Register New Customer</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[80vh]">
              <div className="space-y-6 p-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>First Name</Label>
                      <Input
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Last Name</Label>
                      <Input
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone Number</Label>
                      <Input
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Date of Birth</Label>
                      <Input
                        type="date"
                        name="dateOfBirth"
                        value={formData.dateOfBirth}
                        onChange={handleInputChange}
                        className="w-full"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Gender</Label>
                      <Select
                        value={formData.gender}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                      >
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

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>ID Number</Label>
                      <Input
                        name="idNumber"
                        value={formData.idNumber}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Occupation</Label>
                        <Input
                          name="occupation"
                          value={formData.occupation}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Industry</Label>
                        <Input
                          name="industry"
                          value={formData.industry}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Address</Label>
                      <Input
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>City</Label>
                        <Input
                          name="city"
                          value={formData.city}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Postal Code</Label>
                        <Input
                          name="postalCode"
                          value={formData.postalCode}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Select Package</Label>
                    <RadioGroup
                      value={formData.selectedPackage}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, selectedPackage: value }))}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {packages.map((pkg) => (
                          <div key={pkg.id} className="flex items-center space-x-2">
                            <RadioGroupItem value={pkg.id} id={pkg.id} />
                            <Label htmlFor={pkg.id}>{pkg.name} - R{pkg.price}/month</Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  </div>

                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Bank Name</Label>
                        <Input
                          name="bankName"
                          value={formData.bankName}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Type</Label>
                        <Select
                          value={formData.accountType}
                          onValueChange={(value) => setFormData(prev => ({ ...prev, accountType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select account type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SAVINGS">Savings</SelectItem>
                            <SelectItem value="CHEQUE">Cheque</SelectItem>
                            <SelectItem value="CURRENT">Current</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Account Number</Label>
                        <Input
                          name="accountNumber"
                          value={formData.accountNumber}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Account Holder Name</Label>
                        <Input
                          name="accountHolderName"
                          value={formData.accountHolderName}
                          onChange={handleInputChange}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Branch Code</Label>
                        <Input
                          name="branchCode"
                          value={formData.branchCode}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <Label>Mandate Agreement</Label>
                    <ScrollArea className="h-[200px] w-full rounded-md border p-4">
                      <div className="whitespace-pre-wrap">
                        {MandateText}
                      </div>
                    </ScrollArea>
                    <div className="flex items-center space-x-2 mt-8 pt-4 border-t">
                      <input
                        type="checkbox"
                        id="acceptMandate"
                        checked={formData.acceptMandate}
                        onChange={(e) => setFormData(prev => ({ ...prev, acceptMandate: e.target.checked }))}
                      />
                      <Label htmlFor="acceptMandate">
                        I accept the terms of the mandate
                      </Label>
                    </div>

                    <div className="space-y-4">
                      <Label>Digital Signature</Label>
                      <Card className="p-4">
                        <div style={{ width: '100%', height: '200px' }}>
                          <SignatureCanvas
                            ref={(ref) => { signaturePad = ref }}
                            canvasProps={{
                              className: 'w-full h-full border rounded',
                              style: {
                                width: '100%',
                                height: '100%',
                                border: '1px solid var(--border)'
                              }
                            }}
                            penColor='white'
                            onEnd={() => {
                              if (signaturePad) {
                                setFormData(prev => ({
                                  ...prev,
                                  signature: signaturePad.toDataURL()
                                }));
                              }
                            }}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          className="mt-2"
                          onClick={() => {
                            if (signaturePad) {
                              signaturePad.clear();
                              setFormData(prev => ({ ...prev, signature: '' }));
                            }
                          }}
                        >
                          Clear Signature
                        </Button>
                      </Card>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={createCustomerMutation.isPending}
                >
                  {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
                </Button>
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Customers</CardTitle>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by name, email, or phone..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-9"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead className="hidden md:table-cell">Email</TableHead>
                  <TableHead className="hidden md:table-cell">Phone</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Created At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers?.map((customer: any) => (
                  <TableRow key={customer.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <div>{customer.firstName} {customer.lastName}</div>
                        <div className="md:hidden text-sm text-muted-foreground">
                          {customer.email}
                        </div>
                        <div className="md:hidden text-sm text-muted-foreground">
                          {customer.phoneNumber}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{customer.email}</TableCell>
                    <TableCell className="hidden md:table-cell">{customer.phoneNumber}</TableCell>
                    <TableCell>{customer.selectedPackage || 'None'}</TableCell>
                    <TableCell>{new Date(customer.createdAt).toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}