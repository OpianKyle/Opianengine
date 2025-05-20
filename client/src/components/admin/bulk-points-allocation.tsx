import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

const bulkPointsSchema = z.object({
  points: z.coerce.number().int().min(1, { message: "Points must be a positive number" }),
  description: z.string().min(3, { message: "Description is required" }),
});

type BulkPointsFormData = z.infer<typeof bulkPointsSchema>;

interface BulkPointsAllocationProps {
  selectedIds: number[];
  onUpdateComplete: () => void;
}

export default function BulkPointsAllocation({ selectedIds, onUpdateComplete }: BulkPointsAllocationProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const form = useForm<BulkPointsFormData>({
    resolver: zodResolver(bulkPointsSchema),
    defaultValues: {
      points: 0,
      description: "",
    },
  });

  const bulkAllocatePointsMutation = useMutation({
    mutationFn: async (data: BulkPointsFormData) => {
      setLoading(true);
      
      const response = await fetch('/api/admin/points/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          userIds: selectedIds,
          points: data.points,
          description: data.description,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to allocate points');
      }
      
      return response.json();
    },
    onSuccess: () => {
      setLoading(false);
      // Invalidate customers query to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/customers'] });
      toast({
        title: 'Success',
        description: `Points allocated to ${selectedIds.length} customer(s)`,
      });
      form.reset();
      onUpdateComplete();
    },
    onError: (error: Error) => {
      setLoading(false);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message,
      });
    },
  });

  const onSubmit = (data: BulkPointsFormData) => {
    bulkAllocatePointsMutation.mutate(data);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Allocate Points</CardTitle>
        <CardDescription>
          Allocate the same number of points to {selectedIds.length} selected customer(s)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="points">Points to Allocate</Label>
            <Input
              id="points"
              type="number"
              {...form.register('points', { valueAsNumber: true })}
              min={1}
            />
            {form.formState.errors.points && (
              <p className="text-sm text-red-500">{form.formState.errors.points.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              {...form.register('description')}
              placeholder="Enter a description for this allocation"
              className="min-h-[80px]"
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-500">{form.formState.errors.description.message}</p>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onUpdateComplete}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !form.formState.isValid}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Allocating...
                </>
              ) : (
                'Allocate Points'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}