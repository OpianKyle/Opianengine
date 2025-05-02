import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Download, Search, UserCheck, X, ChevronLeft, ChevronRight } from "lucide-react";

// Lead type definition
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

// Pagination type definition
interface PaginationData {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
}

// API response type definition
interface LeadsResponse {
  items: Lead[];
  pagination: PaginationData;
}

const PACKAGE_OPTIONS = [
  { value: "ALL", label: "All Packages" },
  { value: "OPPORTUNITY", label: "Opportunity - R350" },
  { value: "MOMENTUM", label: "Momentum - R450" },
  { value: "PROSPER", label: "Prosper - R550" },
  { value: "PRESTIGE", label: "Prestige - R695" },
  { value: "PINNACLE", label: "Pinnacle - R825" },
];

const STATUS_OPTIONS = [
  { value: "new", label: "New", color: "bg-blue-100 text-blue-800" },
  { value: "contacted", label: "Contacted", color: "bg-yellow-100 text-yellow-800" },
  { value: "converted", label: "Converted", color: "bg-green-100 text-green-800" },
  { value: "not_interested", label: "Not Interested", color: "bg-gray-100 text-gray-800" },
];

export default function AdminLeads() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPackage, setSelectedPackage] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const pageSize = 10;

  // Fetch leads data with filtering and pagination
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<LeadsResponse>({
    queryKey: ['/api/leads', searchTerm, selectedPackage, currentPage, pageSize],
    queryFn: async () => {
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (searchTerm) queryParams.set('search', searchTerm);
      // Only add package filter if it's not the "ALL" value
      if (selectedPackage && selectedPackage !== "ALL") {
        queryParams.set('package', selectedPackage);
      }
      queryParams.set('page', currentPage.toString());
      queryParams.set('limit', pageSize.toString());

      // Fetch data from API
      const response = await fetch(`/api/leads?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch leads');
      }

      return response.json();
    },
    enabled: !!token,
  });

  // Function to handle lead edit form submission
  const handleLeadUpdate = async (leadId: number, updatedData: Partial<Lead>) => {
    try {
      const response = await fetch(`/api/leads/${leadId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update lead');
      }

      // Show success message
      toast({
        title: "Lead Updated",
        description: "The lead information has been successfully updated.",
      });

      // Close dialog and refresh data
      setIsEditDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error updating lead:', error);
      toast({
        title: "Update Failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      });
    }
  };

  // Function to export leads as CSV
  const exportLeadsToCSV = () => {
    if (!data?.items?.length) return;

    // Create CSV content
    const headers = ["ID", "First Name", "Last Name", "Email", "Mobile Number", 
                     "Package", "Referral Code", "Status", "Created At", "Notes"];
    
    const csvRows = [
      headers.join(','),
      ...data.items.map(lead => [
        lead.id,
        `"${lead.firstName}"`,
        `"${lead.lastName}"`,
        `"${lead.email}"`,
        `"${lead.mobileNumber}"`,
        `"${lead.selectedPackage || ''}"`,
        `"${lead.referralCode || ''}"`,
        `"${lead.status}"`,
        `"${new Date(lead.createdAt).toLocaleString()}"`,
        `"${lead.notes?.replace(/"/g, '""') || ''}"`
      ].join(','))
    ];
    
    const csvContent = csvRows.join('\n');
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        <h1 className="text-3xl font-bold">Lead Management</h1>
        
        <Button 
          variant="outline" 
          className="ml-auto" 
          onClick={exportLeadsToCSV}
          disabled={!data?.items?.length}
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
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
            Manage contact leads submitted through the contact form.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data?.items?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              No leads found. Try adjusting your filters.
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
                  <div className="font-medium">{selectedLead.email}</div>
                </div>
                
                <div>
                  <label className="text-xs text-muted-foreground">Mobile Number</label>
                  <div className="font-medium">{selectedLead.mobileNumber}</div>
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