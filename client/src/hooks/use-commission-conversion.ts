import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';

interface ConversionResults {
  success: boolean;
  recordsFound: number;
  recordsConverted: number;
  errors: any[];
}

export function useCommissionConversion() {
  const [results, setResults] = useState<ConversionResults | null>(null);
  const [allResults, setAllResults] = useState<ConversionResults | null>(null);

  // Regular monthly conversion (previous month only)
  const convertSignupsToRenewals = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/tools/convert-signups-to-renewals', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error || 
          `Failed to convert commissions: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      setResults(data);
      return data;
    },
    onSuccess: () => {
      // Invalidate any relevant queries that might display commission data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/agents/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard/stats'] });
    }
  });

  // One-time conversion of ALL signup commissions
  const convertAllSignupsToRenewals = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/admin/tools/convert-all-signups-to-renewals', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error || 
          `Failed to convert all commissions: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();
      setAllResults(data);
      return data;
    },
    onSuccess: () => {
      // Invalidate any relevant queries that might display commission data
      queryClient.invalidateQueries({ queryKey: ['/api/admin/agents/stats'] });
      queryClient.invalidateQueries({ queryKey: ['/api/agent/dashboard/stats'] });
    }
  });

  return {
    // Regular monthly conversion
    convertSignupsToRenewals,
    results,
    isLoading: convertSignupsToRenewals.isPending,
    isError: convertSignupsToRenewals.isError,
    isSuccess: convertSignupsToRenewals.isSuccess,
    error: convertSignupsToRenewals.error,
    
    // One-time conversion of all records
    convertAllSignupsToRenewals,
    allResults,
    isAllLoading: convertAllSignupsToRenewals.isPending,
    isAllError: convertAllSignupsToRenewals.isError,
    isAllSuccess: convertAllSignupsToRenewals.isSuccess,
    allError: convertAllSignupsToRenewals.error
  };
}