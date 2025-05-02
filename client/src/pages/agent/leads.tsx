import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { formatDistanceToNow } from 'date-fns';
import {
  ChevronLeft,
  ChevronRight,
  Search,
  X,
  UserCheck,
  Download,
  Mail,
  Phone,
  MessageSquare
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
} from '@/components/ui/pagination';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2 } from 'lucide-react';

// Status options for leads
const STATUS_OPTIONS = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
  { value: 'contacted', label: 'Contacted', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'converted', label: 'Converted', color: 'bg-green-100 text-green-800' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-red-100 text-red-800' },
];

// Package options for filtering
const PACKAGE_OPTIONS = [
  { value: 'ALL', label: 'All Packages' },
  { value: 'OPPORTUNITY', label: 'Opportunity' },
  { value: 'MOMENTUM', label: 'Momentum' },
  { value: 'PROSPER', label: 'Prosper' },
  { value: 'PRESTIGE', label: 'Prestige' },
  { value: 'PINNACLE', label: 'Pinnacle' },
];

// Define lead interface
interface Lead {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  mobileNumber: string;
  selectedPackage: string | null;
  referralCode: string | null;
  notes: string | null;
  status: "new" | "contacted" | "converted" | "not_interested";
  assignedAgentId: number | null;
  createdAt: string;
  updatedAt: string;
}

interface PaginationData {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

interface LeadsResponse {
  items: Lead[];
  pagination: PaginationData;
}

export default function AgentLeads() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // Fetch leads assigned to the current agent
  const { data, isLoading, error, refetch } = useQuery<LeadsResponse>({
    queryKey: ['/api/leads', currentPage, searchTerm, selectedPackage],
    queryFn: async () => {
      const queryParams = new URLSearchParams();
      queryParams.append('page', currentPage.toString());
      queryParams.append('limit', '10');
      
      if (searchTerm) {
        queryParams.append('search', searchTerm);
      }
      
      if (selectedPackage !== 'ALL') {
        queryParams.append('package', selectedPackage);
      }
      
      const response = await fetch(`/api/leads?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }
      return response.json();
    },
  });

  // Update lead mutation
  const updateLeadMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<Lead> }) => {
      const response = await fetch(`/api/leads/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update lead');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      toast({
        title: 'Lead Updated',
        description: 'Lead information has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Update Failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Handle lead update
  const handleLeadUpdate = (id: number, data: Partial<Lead>) => {
    updateLeadMutation.mutate({ id, data });
  };

  // Get status badge color
  const getStatusBadgeClass = (status: string) => {
    const statusOption = STATUS_OPTIONS.find(option => option.value === status);
    return statusOption?.color || "bg-gray-100 text-gray-800";
  };

  // Format relative time
  const getRelativeTime = (dateString: string) => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return "Unknown date";
    }
  };

  // If loading, show loader
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If error, show error message
  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error Loading Leads</CardTitle>
          <CardDescription>
            There was a problem loading the leads data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-red-500">
            {error instanceof Error ? error.message : "An unknown error occurred"}
          </p>
          <Button 
            variant="outline" 
            className="mt-4" 
            onClick={() => refetch()}
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold">My Assigned Leads</h1>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email or phone"
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setCurrentPage(1);
                    refetch();
                  }
                }}
              />
            </div>
            <Select
              value={selectedPackage}
              onValueChange={(value) => {
                setSelectedPackage(value);
                setCurrentPage(1);
                setTimeout(() => refetch(), 0);
              }}
            >
              <SelectTrigger className="w-full sm:w-[200px]">
                <SelectValue placeholder="All Packages" />
              </SelectTrigger>
              <SelectContent>
                {PACKAGE_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button 
              variant="secondary"
              onClick={() => {
                setSearchTerm('');
                setSelectedPackage('ALL');
                setCurrentPage(1);
                setTimeout(() => refetch(), 0);
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>
            Leads
            {data?.pagination && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({data.pagination.totalCount} {data.pagination.totalCount === 1 ? 'lead' : 'leads'})
              </span>
            )}
          </CardTitle>
          <CardDescription>
            Manage your assigned leads submitted through the contact form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.items?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              No leads found. Try adjusting your filters or waiting for an admin to assign leads to you.
            </div>
          ) : (
            <>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Contact Info</TableHead>
                      <TableHead>Package</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((lead) => (
                      <TableRow key={lead.id}>
                        <TableCell className="font-medium">
                          {lead.firstName} {lead.lastName}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{lead.email}</span>
                            <span className="text-sm text-muted-foreground">{lead.mobileNumber}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {lead.selectedPackage ? (
                            <Badge variant="outline" className="bg-primary/10">
                              {lead.selectedPackage}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Not specified</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeClass(lead.status)}>
                            {lead.status.charAt(0).toUpperCase() + lead.status.slice(1)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span title={new Date(lead.createdAt).toLocaleString()}>
                            {getRelativeTime(lead.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedLead(lead);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            View Details
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {data.pagination && data.pagination.totalPages > 1 && (
                <div className="mt-4 flex justify-center">
                  <Pagination>
                    <PaginationContent>
                      <PaginationItem>
                        <Button
                          variant="outline"
                          size="icon"
                          className="hidden h-9 w-9 sm:flex"
                          onClick={() => {
                            if (currentPage > 1) {
                              setCurrentPage(currentPage - 1);
                              refetch();
                            }
                          }}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                          <span className="sr-only">Previous page</span>
                        </Button>
                      </PaginationItem>
                      
                      {[...Array(data.pagination.totalPages)].map((_, i) => {
                        const pageNumber = i + 1;
                        // Show only immediate pages around current page and extremes
                        if (
                          pageNumber === 1 ||
                          pageNumber === data.pagination.totalPages ||
                          (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                        ) {
                          return (
                            <PaginationItem key={pageNumber}>
                              <PaginationLink
                                isActive={pageNumber === currentPage}
                                onClick={() => {
                                  setCurrentPage(pageNumber);
                                  refetch();
                                }}
                              >
                                {pageNumber}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        } else if (
                          pageNumber === currentPage - 2 ||
                          pageNumber === currentPage + 2
                        ) {
                          return (
                            <PaginationItem key={pageNumber}>
                              <PaginationEllipsis />
                            </PaginationItem>
                          );
                        }
                        return null;
                      })}
                      
                      <PaginationItem>
                        <Button
                          variant="outline"
                          size="icon"
                          className="hidden h-9 w-9 sm:flex"
                          onClick={() => {
                            if (currentPage < data.pagination.totalPages) {
                              setCurrentPage(currentPage + 1);
                              refetch();
                            }
                          }}
                          disabled={currentPage === data.pagination.totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                          <span className="sr-only">Next page</span>
                        </Button>
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Lead Details/Edit Dialog */}
      {selectedLead && (
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Lead Details</DialogTitle>
              <DialogDescription>
                View and update the lead's information and status.
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Personal Information</h3>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-xs text-muted-foreground">First Name</label>
                      <div className="font-medium">{selectedLead.firstName}</div>
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground">Last Name</label>
                      <div className="font-medium">{selectedLead.lastName}</div>
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground">Email</label>
                  <div className="font-medium flex items-center gap-2">
                    {selectedLead.email}
                    <a href={`mailto:${selectedLead.email}`} target="_blank" rel="noopener noreferrer">
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Mail className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground">Mobile Number</label>
                  <div className="font-medium flex items-center gap-2">
                    {selectedLead.mobileNumber}
                    <a href={`tel:${selectedLead.mobileNumber}`}>
                      <Button variant="ghost" size="icon" className="h-6 w-6">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </a>
                  </div>
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground">Interested Package</label>
                  <div className="font-medium">
                    {selectedLead.selectedPackage || "Not specified"}
                  </div>
                </div>
                
                {selectedLead.referralCode && (
                  <div>
                    <label className="text-xs text-muted-foreground">Referral Code</label>
                    <div className="font-medium">{selectedLead.referralCode}</div>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Lead Status</h3>
                  <Select
                    defaultValue={selectedLead.status}
                    onValueChange={(value) => {
                      handleLeadUpdate(selectedLead.id, { 
                        status: value as "new" | "contacted" | "converted" | "not_interested" 
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-1 block">Notes</label>
                  <Textarea
                    defaultValue={selectedLead.notes || ""}
                    placeholder="Add notes about this lead..."
                    className="min-h-[100px]"
                    onBlur={(e) => {
                      const newNotes = e.target.value;
                      if (newNotes !== selectedLead.notes) {
                        handleLeadUpdate(selectedLead.id, { notes: newNotes });
                      }
                    }}
                  />
                </div>
                
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-1">Timeline</h3>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Created:</span>
                      <span>{new Date(selectedLead.createdAt).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Last Updated:</span>
                      <span>{new Date(selectedLead.updatedAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <DialogFooter className="sm:justify-between">
              <Button
                variant="outline"
                onClick={() => {
                  handleLeadUpdate(selectedLead.id, { status: "converted" });
                  setIsEditDialogOpen(false);
                }}
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Mark as Converted
              </Button>
              <DialogClose asChild>
                <Button type="button">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}