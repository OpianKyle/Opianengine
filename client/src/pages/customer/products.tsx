import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, Clock } from "lucide-react";
import { useState } from "react";

export default function CustomerProducts() {
  const queryClient = useQueryClient();
  const [pendingRequests, setPendingRequests] = useState<number[]>([]);

  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products", {
        credentials: 'include',
        headers: {
          'Accept': 'application/json'
        }
      });
      if (!response.ok) {
        if (response.headers.get('content-type')?.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.message || "Failed to fetch products");
        }
        throw new Error("Failed to fetch products");
      }
      return response.json();
    },
  });

  const { toast } = useToast();

  const quoteRequestMutation = useMutation({
    mutationFn: async (productId: number) => {
      const response = await fetch("/api/quote-requests", {
        method: "POST",
        credentials: 'include',
        headers: {
          "Content-Type": "application/json",
          'Accept': 'application/json'
        },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) {
        if (response.headers.get('content-type')?.includes('application/json')) {
          const error = await response.json();
          throw new Error(error.message || "Failed to submit quote request");
        }
        throw new Error("Failed to submit quote request");
      }
      return response.json();
    },
    onSuccess: (_, productId) => {
      setPendingRequests(prev => [...prev, productId]);
      toast({
        title: "Success",
        description: "Your quote request has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quote-requests"] });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Available Products</h1>
        <p className="text-muted-foreground">
          Browse our products and request comparative quotes
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products?.map((product: any) => (
          <Card key={product.id} className="flex flex-col">
            <CardHeader>
              <CardTitle>{product.name}</CardTitle>
              <CardDescription>{product.description}</CardDescription>
            </CardHeader>
            <CardContent className="flex-grow">
              <Button 
                className="w-full"
                onClick={() => quoteRequestMutation.mutate(product.id)}
                disabled={pendingRequests.includes(product.id)}
                variant={pendingRequests.includes(product.id) ? "secondary" : "default"}
              >
                {pendingRequests.includes(product.id) ? (
                  <>
                    <Clock className="w-4 h-4 mr-2" />
                    Request Pending
                  </>
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4 mr-2" />
                    Request Quote
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
        {(!products || products.length === 0) && (
          <div className="col-span-full text-center py-8 text-muted-foreground">
            No products available at the moment
          </div>
        )}
      </div>
    </div>
  );
}