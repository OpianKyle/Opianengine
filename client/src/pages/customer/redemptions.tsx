import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Redemption {
  id: number;
  points: number;
  cashAmount: string;
  status: 'PENDING' | 'PROCESSED';
  createdAt: string;
  processedAt?: string;
  processor?: {
    firstName: string;
    lastName: string;
  };
}

export default function RedemptionsPage() {
  const { toast } = useToast();

  const { data: redemptions, isLoading, error } = useQuery<Redemption[]>({
    queryKey: ["/api/customer/redemptions"],
    queryFn: async () => {
      const response = await fetch("/api/customer/redemptions");
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to load redemption history");
      }
      return response.json();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to load redemption history",
        variant: "destructive",
      });
    },
  });

  function formatDate(dateString: string | undefined) {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "dd MMM yyyy, HH:mm");
    } catch (e) {
      return "Invalid date";
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6 text-primary">Redemption History</h1>
      
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Cash Redemptions</CardTitle>
          <CardDescription>
            View the status of your cash redemption requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="text-destructive py-4">
              An error occurred while loading your redemption history. Please try again later.
            </p>
          ) : redemptions && redemptions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date Requested</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Cash Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Processed Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {redemptions.map((redemption) => (
                  <TableRow key={redemption.id}>
                    <TableCell>{formatDate(redemption.createdAt)}</TableCell>
                    <TableCell>{redemption.points.toLocaleString()}</TableCell>
                    <TableCell>R {redemption.cashAmount}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={redemption.status === "PROCESSED" ? "default" : "outline"}
                      >
                        {redemption.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {redemption.processedAt ? formatDate(redemption.processedAt) : "Pending"}
                    </TableCell>

                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p>You have no redemption history yet.</p>
              <p className="mt-2">
                Redeem your points for cash from the rewards page.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}