import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select, 
  SelectTrigger, 
  SelectContent, 
  SelectItem, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Loader2, ClipboardCopy, UserPlus, Phone, Mail, Edit, CheckCircle } from 'lucide-react';

// Lead type definition
interface Lead {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  notes: string;
  status: 'NEW' | 'CONTACTED' | 'INTERESTED' | 'NOT_INTERESTED' | 'CONVERTED';
  createdAt: string;
  updatedAt: string;
  referralCode: string;
}

// Commission record type
interface Commission {
  id: number;
  customerId: number;
  agentId: number;
  customerName: string;
  packageName: string;
  isRenewal: boolean;
  commissionAmount: number;
  commissionDate: string;
  paidOut: boolean;
}

const statusColors = {
  NEW: 'bg-blue-100 text-blue-800',
  CONTACTED: 'bg-yellow-100 text-yellow-800',
  INTERESTED: 'bg-green-100 text-green-800',
  NOT_INTERESTED: 'bg-red-100 text-red-800',
  CONVERTED: 'bg-purple-100 text-purple-800'
};

const statusText = {
  NEW: 'New Lead',
  CONTACTED: 'Contacted',
  INTERESTED: 'Interested',
  NOT_INTERESTED: 'Not Interested',
  CONVERTED: 'Converted to Customer'
};

export default function AgentLeadsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('commissions');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [registerData, setRegisterData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: '',
    password: '',
    confirmPassword: '',
    selectedPackage: '',
  });

  // Query to fetch the referral leads
  const { data: leads = [], isLoading: isLeadsLoading } = useQuery({
    queryKey: ['/api/referral/agent/leads'],
    queryFn: async () => {
      const response = await fetch('/api/referral/agent/leads');
      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }
      return response.json();
    },
  });

  // Query to fetch the agent's commissions
  const { data: commissions = [], isLoading: isCommissionsLoading } = useQuery({
    queryKey: ['/api/referral/agent/commissions'],
    queryFn: async () => {
      const response = await fetch('/api/referral/agent/commissions');
      if (!response.ok) {
        throw new Error('Failed to fetch commissions');
      }
      return response.json();
    },
  });

  // Mutation to update lead status
  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: number; status: string }) => {
      const response = await fetch(`/api/referral/agent/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to update lead status');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/referral/agent/leads'] });
      setIsUpdateDialogOpen(false);
      toast({
        title: 'Status Updated',
        description: 'The lead status has been successfully updated.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'An error occurred while updating the lead.',
      });
    },
  });

  // Mutation to register a new customer from a lead
  const registerCustomerMutation = useMutation({
    mutationFn: async (data: typeof registerData) => {
      const response = await fetch('/api/referral/agent/register-customer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          leadId: selectedLead?.id,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to register customer');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/referral/agent/leads'] });
      queryClient.invalidateQueries({ queryKey: ['/api/referral/agent/commissions'] });
      setIsRegisterDialogOpen(false);
      setRegisterData({
        firstName: '',
        lastName: '',
        email: '',
        phoneNumber: '',
        password: '',
        confirmPassword: '',
        selectedPackage: '',
      });
      toast({
        title: 'Customer Registered',
        description: 'The new customer has been successfully registered.',
      });
    },
    onError: (error: Error) => {
      toast({
        variant: 'destructive',
        title: 'Registration Failed',
        description: error.message || 'An error occurred while registering the customer.',
      });
    },
  });

  const handleUpdateLead = (lead: Lead) => {
    setSelectedLead(lead);
    setIsUpdateDialogOpen(true);
  };

  const handleRegisterCustomer = (lead: Lead) => {
    setSelectedLead(lead);
    setRegisterData({
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phoneNumber: lead.phoneNumber,
      password: '',
      confirmPassword: '',
      selectedPackage: '',
    });
    setIsRegisterDialogOpen(true);
  };

  const handleSubmitStatus = (status: string) => {
    if (!selectedLead) return;
    updateLeadMutation.mutate({ leadId: selectedLead.id, status });
  };

  const handleRegisterDataChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setRegisterData(prev => ({ ...prev, [name]: value }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setRegisterData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!registerData.firstName || !registerData.lastName || !registerData.email || !registerData.phoneNumber) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: 'Please fill in all required fields.',
      });
      return;
    }

    if (!registerData.selectedPackage) {
      toast({
        variant: 'destructive',
        title: 'Select a Package',
        description: 'Please select a package for the customer.',
      });
      return;
    }

    if (registerData.password !== registerData.confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Password Mismatch',
        description: 'The passwords you entered do not match.',
      });
      return;
    }

    registerCustomerMutation.mutate(registerData);
  };

  const copyToClipboard = async (text: string, message: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: 'Copied',
        description: message,
      });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy to clipboard',
      });
    }
  };

  const calculateTotalCommission = (isRenewal: boolean = false) => {
    return commissions
      .filter(commission => commission.isRenewal === isRenewal)
      .reduce((sum, commission) => sum + commission.commissionAmount, 0);
  };

  if (isLeadsLoading && activeTab === 'leads') {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading leads...</span>
      </div>
    );
  }

  if (isCommissionsLoading && activeTab === 'commissions') {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Loading commission data...</span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Commissions Dashboard</h1>
      </div>

      <Tabs defaultValue="commissions" value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="leads">Referral Leads</TabsTrigger>
          <TabsTrigger value="commissions">Commissions</TabsTrigger>
        </TabsList>

        <TabsContent value="leads">
          <Card>
            <CardHeader>
              <CardTitle>Your Referral Leads</CardTitle>
              <CardDescription>
                Manage leads who have signed up through your referral link.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {leads.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-lg text-muted-foreground mb-4">
                    No referral leads yet
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Share your referral link to get more leads. When customers sign up using your link,
                    they'll appear here.
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-[600px]">
                  <div className="space-y-4">
                    {leads.map((lead: Lead) => (
                      <Card key={lead.id} className="border-l-4 border-l-primary">
                        <CardContent className="p-4">
                          <div className="flex flex-col md:flex-row justify-between gap-4">
                            <div className="space-y-2">
                              <div className="flex items-center">
                                <h3 className="text-lg font-semibold">
                                  {lead.firstName} {lead.lastName}
                                </h3>
                                <Badge 
                                  className={`ml-2 ${statusColors[lead.status]}`}
                                >
                                  {statusText[lead.status]}
                                </Badge>
                              </div>
                              <div className="text-sm text-muted-foreground space-y-1">
                                <div className="flex items-center">
                                  <Mail className="h-4 w-4 mr-2" />
                                  <span>{lead.email}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 ml-1"
                                    onClick={() => copyToClipboard(lead.email, 'Email copied to clipboard')}
                                  >
                                    <ClipboardCopy className="h-3 w-3" />
                                  </Button>
                                </div>
                                <div className="flex items-center">
                                  <Phone className="h-4 w-4 mr-2" />
                                  <span>{lead.phoneNumber}</span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 ml-1"
                                    onClick={() => copyToClipboard(lead.phoneNumber, 'Phone number copied to clipboard')}
                                  >
                                    <ClipboardCopy className="h-3 w-3" />
                                  </Button>
                                </div>
                                {lead.notes && (
                                  <div className="mt-2">
                                    <p className="font-medium">Notes:</p>
                                    <p className="mt-1 italic">{lead.notes}</p>
                                  </div>
                                )}
                                <div className="text-xs text-muted-foreground mt-2">
                                  Added on {new Date(lead.createdAt).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-col md:flex-row gap-2 md:items-center">
                              <Button
                                onClick={() => handleUpdateLead(lead)}
                                variant="outline"
                                size="sm"
                                className="flex items-center"
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Update Status
                              </Button>
                              
                              {lead.status !== 'CONVERTED' && (
                                <Button
                                  onClick={() => handleRegisterCustomer(lead)}
                                  variant="default"
                                  size="sm"
                                  className="flex items-center"
                                >
                                  <UserPlus className="mr-2 h-4 w-4" />
                                  Register as Customer
                                </Button>
                              )}
                              
                              {lead.status === 'CONVERTED' && (
                                <Badge className="bg-green-100 text-green-800 flex items-center">
                                  <CheckCircle className="mr-1 h-3 w-3" />
                                  Converted
                                </Badge>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="commissions">
          <Card>
            <CardHeader>
              <CardTitle>Commission Dashboard</CardTitle>
              <CardDescription>
                Track your commission earnings from referrals and renewals.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">First-time Signups (30%)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R{calculateTotalCommission(false).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      From {commissions.filter(c => !c.isRenewal).length} customer registrations
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Renewals (10%)</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R{calculateTotalCommission(true).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      From {commissions.filter(c => c.isRenewal).length} customer renewals
                    </p>
                  </CardContent>
                </Card>

                <Card className="bg-primary/5">
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Total Commission</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      R{(calculateTotalCommission(false) + calculateTotalCommission(true)).toFixed(2)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total earnings
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="py-3">
                    <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {leads.length 
                        ? Math.round((leads.filter(l => l.status === 'CONVERTED').length / leads.length) * 100) 
                        : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Lead to customer conversion
                    </p>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Commission History</h3>
                {commissions.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-lg text-muted-foreground mb-4">
                      No commission records yet
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Register customers from your leads to start earning commissions.
                    </p>
                  </div>
                ) : (
                  <ScrollArea className="h-[400px]">
                    <div className="space-y-4">
                      {commissions.map((commission: Commission) => (
                        <Card key={commission.id}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center">
                              <div>
                                <div className="font-medium">{commission.customerName}</div>
                                <div className="text-sm text-muted-foreground">
                                  Package: {commission.packageName}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Date: {new Date(commission.commissionDate).toLocaleDateString()}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-bold">R{commission.commissionAmount.toFixed(2)}</div>
                                <Badge 
                                  variant={commission.isRenewal ? "outline" : "secondary"}
                                  className="mt-1"
                                >
                                  {commission.isRenewal ? "Renewal (10%)" : "First Sign-up (30%)"}
                                </Badge>
                                <div className="text-xs text-muted-foreground mt-1">
                                  {commission.paidOut ? "Paid" : "Pending"}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog for updating lead status */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Lead Status</DialogTitle>
            <DialogDescription>
              Change the status of this lead to track your progress.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select onValueChange={(value) => handleSubmitStatus(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select new status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">New Lead</SelectItem>
                  <SelectItem value="CONTACTED">Contacted</SelectItem>
                  <SelectItem value="INTERESTED">Interested</SelectItem>
                  <SelectItem value="NOT_INTERESTED">Not Interested</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog for registering a new customer */}
      <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Register New Customer</DialogTitle>
            <DialogDescription>
              Create a new customer account for this lead.
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmitRegistration}>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={registerData.firstName}
                    onChange={handleRegisterDataChange}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={registerData.lastName}
                    onChange={handleRegisterDataChange}
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={registerData.email}
                  onChange={handleRegisterDataChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input
                  id="phoneNumber"
                  name="phoneNumber"
                  value={registerData.phoneNumber}
                  onChange={handleRegisterDataChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="selectedPackage">Package</Label>
                <Select
                  name="selectedPackage"
                  onValueChange={(value) => handleSelectChange('selectedPackage', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a package" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BEGINNER">Beginner - R350</SelectItem>
                    <SelectItem value="NOVICE">Novice - R450</SelectItem>
                    <SelectItem value="ACTIVE">Active - R550</SelectItem>
                    <SelectItem value="PROFESSIONAL">Professional - R695</SelectItem>
                    <SelectItem value="EXPERT">Expert - R825</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  value={registerData.password}
                  onChange={handleRegisterDataChange}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={registerData.confirmPassword}
                  onChange={handleRegisterDataChange}
                  required
                />
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" type="button" onClick={() => setIsRegisterDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={registerCustomerMutation.isPending}
              >
                {registerCustomerMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Registering...
                  </>
                ) : 'Register Customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}