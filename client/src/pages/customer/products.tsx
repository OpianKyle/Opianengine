import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare } from "lucide-react";

export default function CustomerProducts() {
  const { data: products } = useQuery({
    queryKey: ["/api/products"],
    queryFn: async () => {
      const response = await fetch("/api/products");
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  const { toast } = useToast();

  const handleQuoteRequest = async (productId: number) => {
    try {
      const response = await fetch("/api/quote-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId }),
      });

      if (!response.ok) throw new Error("Failed to submit quote request");

      toast({
        title: "Success",
        description: "Your quote request has been submitted successfully.",
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit quote request",
      });
    }
  };

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
                onClick={() => handleQuoteRequest(product.id)}
              >
                <MessageSquare className="w-4 h-4 mr-2" />
                Request Quote
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
