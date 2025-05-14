import React, { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export function TestCustomerGenerator() {
  const [isLoading, setIsLoading] = useState(false);
  const [count, setCount] = useState(10);
  const [packageType, setPackageType] = useState<string>("random");
  const { toast } = useToast();

  const handleCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setCount(isNaN(value) ? 10 : value);
  };

  const handleGenerate = async () => {
    if (count <= 0 || count > 100) {
      toast({
        title: 'Invalid count',
        description: 'Please enter a number between 1 and 100',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/generate-test-customers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ count, packageType: packageType || undefined })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate test customers');
      }

      const data = await response.json();
      toast({
        title: 'Success!',
        description: `Generated ${data.count} test customer(s)`,
      });
    } catch (error) {
      console.error('Error generating test customers:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'An error occurred generating test customers',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generate Test Customers</CardTitle>
        <CardDescription>
          Create multiple test accounts with random data for demonstration purposes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="count">Number of Customers</Label>
          <Input
            id="count"
            type="number"
            min="1"
            max="100"
            value={count}
            onChange={handleCountChange}
            disabled={isLoading}
          />
          <p className="text-sm text-muted-foreground">
            Maximum 100 customers can be generated at once
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="package-select">Package Filter (Optional)</Label>
          <Select value={packageType || "random"} onValueChange={setPackageType}>
            <SelectTrigger>
              <SelectValue placeholder="All packages (random)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="random">All packages (random)</SelectItem>
              <SelectItem value="OPPORTUNITY">OPPORTUNITY</SelectItem>
              <SelectItem value="MOMENTUM">MOMENTUM</SelectItem>
              <SelectItem value="PROSPER">PROSPER</SelectItem>
              <SelectItem value="PRESTIGE">PRESTIGE</SelectItem>
              <SelectItem value="PINNACLE">PINNACLE</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            Optionally filter to a specific package for all generated customers
          </p>
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            'Generate Test Customers'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}