import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import { Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { useState } from "react";

type QuoteRequest = {
  id: number;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";
  notes?: string;
  createdAt: string;
  completedAt?: string;
  user: {
    firstName: string;
    lastName: string;
    email: string;
  };
  product: {
    name: string;
    description: string;
  };
  completedByUser?: {
    firstName: string;
    lastName: string;
  };
};

export default function AdminQuoteRequests() {
  const queryClient = useQueryClient();
  const [selectedRequest, setSelectedRequest] = useState<QuoteRequest | null>(null);
  const [notes, setNotes] = useState("");
  const { toast } = useToast();

  const { data: quoteRequests, isLoading } = useQuery<QuoteRequest[]>({
    queryKey: ["/api/quote-requests"],
    queryFn: async () => {
      const response = await fetch("/api/quote-requests", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to fetch quote requests");
      }
      return response.json();
    },
  });

  const updateQuoteRequestMutation = useMutation({
    mutationFn: async ({
      id,
      status,
      notes,
    }: {
      id: number;
      status: string;
      notes: string;
    }) => {
      const response = await fetch(`/api/quote-requests/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status, notes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update quote request");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
      toast({
        title: "Success",
        description: "Quote request updated successfully",
      });
      setSelectedRequest(null);
      setNotes("");
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case "REJECTED":
        return <XCircle className="w-4 h-4 text-red-500" />;
      case "IN_PROGRESS":
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      default:
        return <Clock className="w-4 h-4 text-blue-500" />;
    }
  };

  if (isLoading) {
    return <div>Loading quote requests...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Quote Requests</h1>
        <p className="text-muted-foreground">
          Manage and track customer quote requests
        </p>
      </div>

      <div className="grid gap-4">
        {quoteRequests?.map((request) => (
          <Card key={request.id}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">
                  {request.product.name}
                </CardTitle>
                <div className="flex items-center gap-2">
                  {getStatusIcon(request.status)}
                  <span
                    className={`text-sm font-medium ${
                      request.status === "COMPLETED"
                        ? "text-green-500"
                        : request.status === "REJECTED"
                        ? "text-red-500"
                        : request.status === "IN_PROGRESS"
                        ? "text-yellow-500"
                        : "text-blue-500"
                    }`}
                  >
                    {request.status}
                  </span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid gap-2">
                  <div>
                    <span className="font-medium">Customer: </span>
                    {request.user.firstName} {request.user.lastName}
                  </div>
                  <div>
                    <span className="font-medium">Email: </span>
                    {request.user.email}
                  </div>
                  <div>
                    <span className="font-medium">Requested on: </span>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </div>
                  {request.completedAt && (
                    <div>
                      <span className="font-medium">Completed on: </span>
                      {new Date(request.completedAt).toLocaleDateString()}
                      {request.completedByUser && (
                        <span>
                          {" "}
                          by {request.completedByUser.firstName}{" "}
                          {request.completedByUser.lastName}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {selectedRequest?.id === request.id ? (
                  <div className="space-y-4">
                    <Select
                      defaultValue={request.status}
                      onValueChange={(value) =>
                        updateQuoteRequestMutation.mutate({
                          id: request.id,
                          status: value,
                          notes,
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="COMPLETED">Completed</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                      </SelectContent>
                    </Select>

                    <Textarea
                      placeholder="Add notes about this quote request..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />

                    <div className="flex gap-2">
                      <Button
                        onClick={() => {
                          setSelectedRequest(null);
                          setNotes("");
                        }}
                        variant="outline"
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => {
                      setSelectedRequest(request);
                      setNotes(request.notes || "");
                    }}
                  >
                    Update Status
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}

        {(!quoteRequests || quoteRequests.length === 0) && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No quote requests found
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
