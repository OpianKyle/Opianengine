import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
  DialogFooter
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2, ClipboardCopy, UserPlus, Phone, Mail, Edit, CheckCircle } from 'lucide-react';

// Lead type definition
interface Lead {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  notes: string;
  status: 'NEW' | 'CONTACTED' | 'SIGNED_UP' | 'NOT_INTERESTED';
  createdAt: string;
  updatedAt: string;
  referralCode: string;
  agentId: number | null;
  referredBy: number | null;
}

// Status text mapping
const statusText = {
  NEW: 'New Lead',
  CONTACTED: 'Contacted',
  SIGNED_UP: 'Signed Up',
  NOT_INTERESTED: 'Not Interested'
};

// Status color mapping to match the status values
const statusColors = {
  NEW: 'bg-blue-100 text-blue-800',
  CONTACTED: 'bg-amber-100 text-amber-800',
  SIGNED_UP: 'bg-green-100 text-green-800',
  NOT_INTERESTED: 'bg-slate-100 text-slate-800'
};

export default function AgentLeadsPage() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isRegisterDialogOpen, setIsRegisterDialogOpen] = useState(false);
  const [registerData, setRegisterData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    isSouthAfrican: false,
    idNumber: '',
    dateOfBirth: '',
    gender: 'male',
    mobileNumber: '',
    occupation: '',
    industry: '',
    addressLine1: '',
    suburb: '',
    postalCode: '',
    hasCreditCard: false,
    selectedPackage: 'OPPORTUNITY',
    accountHolderName: '',
    bankName: '',
    branchCode: '',
    accountNumber: '',
    accountType: 'SAVINGS',
    mandateAgreement: false,
    // We'll still need these for customer registration via the API
    password: '',
    confirmPassword: '',
    phoneNumber: '',
  });

  // Query to fetch the referral leads with optimizations
  const { data: leadsData, isLoading: isLeadsLoading, error: leadsError } = useQuery({
    queryKey: ['/api/referral/agent/leads', token],
    queryFn: async () => {
      // Create headers with authorization token
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };
      
      // Add token to headers if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch('/api/referral/agent/leads', {
        headers,
        credentials: 'include'
      });
      
      if (!response.ok) {
        // Handle potential auth errors specifically
        if (response.status === 401) {
          throw new Error('Authentication required - please log in again');
        }
        
        if (response.status === 403) {
          throw new Error('You do not have permission to access these leads');
        }
        
        throw new Error('Failed to fetch leads');
      }
      
      return response.json();
    },
    staleTime: 2 * 60 * 1000, // 2 minutes before refetching (server cache is 2 minutes)
    gcTime: 5 * 60 * 1000, // 5 minutes before removing from cache (cacheTime is renamed to gcTime in React Query v5)
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
    enabled: !!token, // Only run the query if token exists
  });

  // Mutation to update lead status
  const updateLeadMutation = useMutation({
    mutationFn: async ({ leadId, status }: { leadId: number; status: string }) => {
      // Create headers with authorization token
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };
      
      // Add token to headers if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const response = await fetch(`/api/referral/agent/leads/${leadId}`, {
        method: 'PUT',
        headers,
        credentials: 'include',
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
      // Create headers with authorization token
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };
      
      // Add token to headers if available
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Generate a signature from the form data
      // This is required for the server-side API but we're just passing the
      // mandateAgreement value as the signature since we've removed the signature field
      const payload = {
        ...data,
        leadId: selectedLead?.id,
        // Remove password fields as they're not needed in this flow
        password: undefined,
        confirmPassword: undefined,
        // Add mandateAccepted field which the server expects
        mandateAccepted: data.mandateAgreement,
        // Add a simple signature placeholder since we removed the UI element
        signature: data.mandateAgreement ? 'User agreed via checkbox' : '',
      };
      
      const response = await fetch('/api/referral/agent/register-customer', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(payload),
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
      
      // Reset to default values that match all the fields in the form
      setRegisterData({
        email: '',
        firstName: '',
        lastName: '',
        isSouthAfrican: false,
        idNumber: '',
        dateOfBirth: '',
        gender: 'male',
        mobileNumber: '',
        occupation: '',
        industry: '',
        addressLine1: '',
        suburb: '',
        postalCode: '',
        hasCreditCard: false,
        selectedPackage: 'OPPORTUNITY',
        accountHolderName: '',
        bankName: '',
        branchCode: '',
        accountNumber: '',
        accountType: 'SAVINGS',
        mandateAgreement: false,
        password: '',
        confirmPassword: '',
        phoneNumber: '',
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
      ...registerData, // Keep default values for other fields
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phoneNumber: lead.phoneNumber,
      mobileNumber: lead.phoneNumber, // Copy to mobileNumber too as some forms use that
      password: '',
      confirmPassword: '',
      selectedPackage: 'OPPORTUNITY', // Set default package
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
    
    // Required fields validation
    const requiredFields = [
      { name: 'firstName', label: 'First Name' },
      { name: 'lastName', label: 'Last Name' },
      { name: 'email', label: 'Email' },
      { name: 'phoneNumber', label: 'Phone Number' },
      { name: 'idNumber', label: 'ID Number' },
      { name: 'dateOfBirth', label: 'Date of Birth' },
      { name: 'occupation', label: 'Occupation' },
      { name: 'industry', label: 'Industry' },
      { name: 'addressLine1', label: 'Address' },
      { name: 'suburb', label: 'Suburb' },
      { name: 'postalCode', label: 'Postal Code' },
      { name: 'accountHolderName', label: 'Account Holder Name' },
      { name: 'bankName', label: 'Bank Name' },
      { name: 'branchCode', label: 'Branch Code' },
      { name: 'accountNumber', label: 'Account Number' },
    ];
    
    const missingFields = requiredFields.filter(field => 
      !registerData[field.name as keyof typeof registerData]
    );
    
    if (missingFields.length > 0) {
      toast({
        variant: 'destructive',
        title: 'Missing Information',
        description: `Please fill in the following required fields: ${missingFields.map(f => f.label).join(', ')}`,
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
    
    if (!registerData.mandateAgreement) {
      toast({
        variant: 'destructive',
        title: 'Mandate Agreement Required',
        description: 'Customer must agree to the mandate agreement to proceed.',
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

  const renderSkeletonLeads = () => {
    return Array(3).fill(0).map((_, index) => (
      <Card key={`skeleton-${index}`} className="border-l-4 border-l-primary">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="space-y-2 w-full">
              <div className="flex items-center">
                <div className="h-6 w-40 bg-muted rounded animate-pulse"></div>
                <div className="ml-2 h-5 w-24 bg-blue-100 rounded animate-pulse"></div>
              </div>
              <div className="text-sm text-muted-foreground space-y-1">
                <div className="flex items-center">
                  <Mail className="h-4 w-4 mr-2 text-muted" />
                  <div className="h-4 w-48 bg-muted rounded animate-pulse"></div>
                </div>
                <div className="flex items-center">
                  <Phone className="h-4 w-4 mr-2 text-muted" />
                  <div className="h-4 w-32 bg-muted rounded animate-pulse"></div>
                </div>
                <div className="text-xs text-muted-foreground mt-2">
                  <div className="h-3 w-36 bg-muted rounded animate-pulse"></div>
                </div>
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-2 mt-2 md:mt-0 justify-end md:items-end">
              <div className="h-9 w-24 bg-muted rounded animate-pulse"></div>
              <div className="h-9 w-24 bg-muted rounded animate-pulse"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    ));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Referral Leads</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Referral Leads</CardTitle>
          <CardDescription>
            Manage leads who have signed up through your referral link.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLeadsLoading ? (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {renderSkeletonLeads()}
              </div>
            </ScrollArea>
          ) : !leadsData?.success || !leadsData?.leads || !Array.isArray(leadsData.leads) || leadsData.leads.length === 0 ? (
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
                {leadsData.leads.map((lead: Lead) => (
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
                          
                          {lead.status !== 'SIGNED_UP' && (
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
                          
                          {lead.status === 'SIGNED_UP' && (
                            <Badge className="bg-green-100 text-green-800 flex items-center">
                              <CheckCircle className="mr-1 h-3 w-3" />
                              Signed Up
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

      {/* Update Status Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent className="sm:max-w-md bg-background border-border [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-[#43EB3E]">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-foreground font-semibold text-xl">Update Lead Status</DialogTitle>
            <DialogDescription className="text-muted-foreground mt-1">
              Update the status of {selectedLead?.firstName} {selectedLead?.lastName}'s lead.
            </DialogDescription>
          </DialogHeader>
          <div className="py-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status" className="text-foreground font-medium">Current Status</Label>
              <Select
                defaultValue={selectedLead?.status}
                onValueChange={(value) => handleSubmitStatus(value)}
              >
                <SelectTrigger className="w-full border-input bg-background">
                  <SelectValue placeholder="Select a status" />
                </SelectTrigger>
                <SelectContent className="bg-background border-border">
                  <SelectItem className="hover:bg-muted" value="NEW">New Lead</SelectItem>
                  <SelectItem className="hover:bg-muted" value="CONTACTED">Contacted</SelectItem>
                  <SelectItem className="hover:bg-muted" value="SIGNED_UP">Signed Up</SelectItem>
                  <SelectItem className="hover:bg-muted" value="NOT_INTERESTED">Not Interested</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="border-t pt-4 gap-2">
            <Button 
              variant="outline" 
              onClick={() => setIsUpdateDialogOpen(false)}
              className="border-border text-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-[#43EB3E] text-background hover:bg-[#38c634]"
              disabled={updateLeadMutation.isPending}
              onClick={() => setIsUpdateDialogOpen(false)}
            >
              {updateLeadMutation.isPending ? 'Updating...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Register Customer Dialog */}
      <Dialog open={isRegisterDialogOpen} onOpenChange={setIsRegisterDialogOpen}>
        <DialogContent className="sm:max-w-[1200px] max-h-[90vh] overflow-y-auto bg-background border-border [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-[#43EB3E]">
          <DialogHeader className="border-b pb-4">
            <DialogTitle className="text-foreground">Register as Customer</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Complete the registration process for {selectedLead?.firstName} {selectedLead?.lastName}. All fields with * are required.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmitRegistration}>
            <div className="space-y-6 py-4">
              {/* Personal Information */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold border-b pb-2 text-foreground">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      name="firstName"
                      value={registerData.firstName}
                      onChange={handleRegisterDataChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      name="lastName"
                      value={registerData.lastName}
                      onChange={handleRegisterDataChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={registerData.email}
                      onChange={handleRegisterDataChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phoneNumber">Phone Number *</Label>
                    <Input
                      id="phoneNumber"
                      name="phoneNumber"
                      value={registerData.phoneNumber}
                      onChange={handleRegisterDataChange}
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="isSouthAfrican">Citizenship</Label>
                    <div className="flex items-center space-x-2 pt-2">
                      <input
                        type="checkbox"
                        id="isSouthAfrican"
                        name="isSouthAfrican"
                        checked={registerData.isSouthAfrican}
                        onChange={(e) => setRegisterData({...registerData, isSouthAfrican: e.target.checked})}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="isSouthAfrican" className="font-normal">South African Citizen</Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="idNumber">ID Number *</Label>
                    <Input
                      id="idNumber"
                      name="idNumber"
                      value={registerData.idNumber}
                      onChange={handleRegisterDataChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date of Birth *</Label>
                    <Input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={registerData.dateOfBirth}
                      onChange={handleRegisterDataChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gender">Gender *</Label>
                    <Select
                      value={registerData.gender}
                      onValueChange={(value) => handleSelectChange('gender', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="male">Male</SelectItem>
                        <SelectItem value="female">Female</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="occupation">Occupation *</Label>
                    <Input
                      id="occupation"
                      name="occupation"
                      value={registerData.occupation}
                      onChange={handleRegisterDataChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry *</Label>
                    <Select
                      value={registerData.industry}
                      onValueChange={(value) => handleSelectChange('industry', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select industry" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Agriculture">Agriculture</SelectItem>
                        <SelectItem value="Construction">Construction</SelectItem>
                        <SelectItem value="Education">Education</SelectItem>
                        <SelectItem value="Finance">Finance</SelectItem>
                        <SelectItem value="Healthcare">Healthcare</SelectItem>
                        <SelectItem value="Information Technology">Information Technology</SelectItem>
                        <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="Mining">Mining</SelectItem>
                        <SelectItem value="Retail">Retail</SelectItem>
                        <SelectItem value="Services">Services</SelectItem>
                        <SelectItem value="Transport">Transport</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="hasCreditCard">Credit Card</Label>
                    <div className="flex items-center space-x-2 pt-2">
                      <input
                        type="checkbox"
                        id="hasCreditCard"
                        name="hasCreditCard"
                        checked={registerData.hasCreditCard}
                        onChange={(e) => setRegisterData({...registerData, hasCreditCard: e.target.checked})}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="hasCreditCard" className="font-normal">Has Credit Card</Label>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Address */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold border-b pb-2 text-foreground">Address Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="addressLine1">Address *</Label>
                    <Input
                      id="addressLine1"
                      name="addressLine1"
                      value={registerData.addressLine1}
                      onChange={handleRegisterDataChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="suburb">Suburb *</Label>
                    <Input
                      id="suburb"
                      name="suburb"
                      value={registerData.suburb}
                      onChange={handleRegisterDataChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="postalCode">Postal Code *</Label>
                    <Input
                      id="postalCode"
                      name="postalCode"
                      value={registerData.postalCode}
                      onChange={handleRegisterDataChange}
                    />
                  </div>
                </div>
              </div>
              
              {/* Banking */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold border-b pb-2 text-foreground">Banking Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="accountHolderName">Account Holder Name *</Label>
                    <Input
                      id="accountHolderName"
                      name="accountHolderName"
                      value={registerData.accountHolderName}
                      onChange={handleRegisterDataChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="bankName">Bank Name *</Label>
                    <Input
                      id="bankName"
                      name="bankName"
                      value={registerData.bankName}
                      onChange={handleRegisterDataChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="branchCode">Branch Code *</Label>
                    <Input
                      id="branchCode"
                      name="branchCode"
                      value={registerData.branchCode}
                      onChange={handleRegisterDataChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="accountNumber">Account Number *</Label>
                    <Input
                      id="accountNumber"
                      name="accountNumber"
                      value={registerData.accountNumber}
                      onChange={handleRegisterDataChange}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="accountType">Account Type *</Label>
                    <Select
                      value={registerData.accountType}
                      onValueChange={(value) => handleSelectChange('accountType', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select account type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="SAVINGS">Savings</SelectItem>
                        <SelectItem value="CURRENT">Current</SelectItem>
                        <SelectItem value="CHEQUE">Cheque</SelectItem>
                        <SelectItem value="CREDIT">Credit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {/* Package */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold border-b pb-2 text-foreground">Package Selection</h3>
                <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="selectedPackage">Select Package *</Label>
                    <Select
                      value={registerData.selectedPackage}
                      onValueChange={(value) => handleSelectChange('selectedPackage', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a package" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="OPPORTUNITY">Opportunity (R350)</SelectItem>
                        <SelectItem value="MOMENTUM">Momentum (R450)</SelectItem>
                        <SelectItem value="PROSPER">Prosper (R550)</SelectItem>
                        <SelectItem value="PRESTIGE">Prestige (R695)</SelectItem>
                        <SelectItem value="PINNACLE">Pinnacle (R825)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              
              {/* Mandate Agreement */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold border-b pb-2 text-foreground">Mandate Agreement</h3>
                <div className="border rounded-lg p-4 bg-muted space-y-3">
                  <ScrollArea className="h-[200px] w-full rounded-md border p-6 bg-background [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-muted [&::-webkit-scrollbar-thumb]:bg-[#43EB3E]">
                    <div className="whitespace-pre-wrap text-foreground text-base leading-relaxed">
                      {`This signed Authority and Mandate refers to our contract dated ${new Date().toISOString().split('T')[0]} ("the Agreement").

I / We hereby authorise you to issue and deliver payment instructions of R${registerData.selectedPackage === 'OPPORTUNITY' ? '350' 
                          : registerData.selectedPackage === 'MOMENTUM' ? '450'
                          : registerData.selectedPackage === 'PROSPER' ? '550'
                          : registerData.selectedPackage === 'PRESTIGE' ? '695'
                          : registerData.selectedPackage === 'PINNACLE' ? '825' : '0'} per month for the subscription fee to your Banker for collection against my / our abovementioned account at my / our above-mentioned Bank (or any other bank or branch to which I / we may transfer my / our account) on condition that the sum of such payment instructions will never exceed my / our obligations as as agreed to in the Agreement and commencing on 1st of each month and continuing until this Authority and Mandate is terminated by me / us by giving you notice in writing of not less than 60 ordinary working days, and sent by prepaid registered post or delivered to your address as indicated above.

The individual payment instructions so authorised to be issued must be issued and delivered as follows: R${registerData.selectedPackage === 'OPPORTUNITY' ? '350' 
                          : registerData.selectedPackage === 'MOMENTUM' ? '450'
                          : registerData.selectedPackage === 'PROSPER' ? '550'
                          : registerData.selectedPackage === 'PRESTIGE' ? '695'
                          : registerData.selectedPackage === 'PINNACLE' ? '825' : '0'} monthly for 12 months. This is an annual agreement which is automatically renewable unless canceled in writing.

In the event that the payment day falls on a Sunday, or recognised South African public holiday, the payment day will automatically be the preceding ordinary business day.

Payment Instructions due in December may be debited against my account on a earlier date.

I / We understand that the withdrawals hereby authorized will be processed through a computerized system provided by the South African Banks and I also understand that details of each withdrawal will be printed on my bank statement. Each transaction will contain a number, which must be included in the said payment instruction and if provided to you should enable you to identify the Agreement. A payment reference is added to this form before the issuing of any payment instruction.

Mandate
I /We acknowledge that all payment instructions issued by you shall be treated by my / our above-mentioned Bank as if the instructions have been issued by me/us personally.

Cancellation
I /We agree that although this Authority and Mandate may be cancelled by me/us, such cancellation will not cancel the Agreement. I/We shall not be entitled to any refund of amounts which you have withdrawn while this authority was in force, if such amounts were legally owing to you.

Assignment
I/We acknowledge that this Authority and Mandate has been ceded to Netcash (Pty) Ltd as per your agreement with Netcash (Pty) Ltd, but in the absence of such assignment of the Agreement, this Authority and Mandate will be null and void.`}
                    </div>
                  </ScrollArea>
                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="checkbox"
                      id="mandateAgreement"
                      name="mandateAgreement"
                      checked={registerData.mandateAgreement}
                      onChange={(e) => setRegisterData({...registerData, mandateAgreement: e.target.checked})}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="mandateAgreement" className="font-normal">
                      * I confirm that the customer has agreed to the above mandate
                    </Label>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="border-t pt-4">
              <Button variant="outline" onClick={() => setIsRegisterDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={registerCustomerMutation.isPending}
              >
                {registerCustomerMutation.isPending ? 'Registering...' : 'Register Customer'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}