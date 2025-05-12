import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { CardStatusDropdown } from "./card-status-dropdown";
import { useCardStatusMutation } from "@/hooks/use-card-status";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";

type CardStatus = "NOT_DELIVERED" | "OUT_FOR_DELIVERY" | "DELIVERED";

interface BulkCardStatusUpdateProps {
  selectedIds: number[];
  onUpdateComplete?: () => void;
  disabled?: boolean;
  // If true, the component will render only its contents without a dialog wrapper
  contentOnly?: boolean;
}

export function BulkCardStatusUpdate({
  selectedIds,
  onUpdateComplete,
  disabled = false,
  contentOnly = false,
}: BulkCardStatusUpdateProps) {
  // When contentOnly is true, we don't need to manage our own dialog state
  // as the parent component will handle that
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<CardStatus>("NOT_DELIVERED");
  const { mutate: updateCardStatus, isPending } = useCardStatusMutation();
  const queryClient = useQueryClient();
  
  // This function will manually refetch the customers data
  const forceRefreshCustomersData = () => {
    console.log('Manually refreshing customers data');
    
    // First remove all customers queries from the cache
    queryClient.removeQueries({ queryKey: ['/api/admin/customers'] });
    
    // Then force an immediate refetch with refetchType: 'all'
    queryClient.invalidateQueries({ 
      queryKey: ['/api/admin/customers'],
      refetchType: 'all'
    });
    
    // Add some delayed refetches to handle any race conditions
    setTimeout(() => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/admin/customers'],
        refetchType: 'all'
      });
    }, 500);
    
    setTimeout(() => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/admin/customers'],
        refetchType: 'all'
      });
    }, 1500);
  };

  const handleUpdateStatus = () => {
    updateCardStatus(
      { userIds: selectedIds, cardStatus: status },
      {
        onSuccess: () => {
          // Force a manual refresh of the customers data
          forceRefreshCustomersData();
          
          // Only manage our own dialog state if we're not in contentOnly mode
          if (!contentOnly) {
            setOpen(false);
          }
          
          if (onUpdateComplete) {
            onUpdateComplete();
          }
        },
      }
    );
  };

  // The content to be rendered either standalone or within a dialog
  const content = (
    <>
      <div className="grid gap-4 py-4">
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Card Status</h4>
          <CardStatusDropdown value={status} onChange={setStatus} />
        </div>
      </div>
      <DialogFooter className={contentOnly ? "px-0" : ""}>
        <Button
          type="submit"
          onClick={handleUpdateStatus}
          disabled={isPending}
          className={contentOnly ? "w-full md:w-auto" : ""}
        >
          {isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update Status"
          )}
        </Button>
      </DialogFooter>
    </>
  );
  
  // If contentOnly is true, just return the content without a dialog wrapper
  if (contentOnly) {
    return <div className="w-full">{content}</div>;
  }
  
  // Otherwise, render with its own dialog wrapper
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          disabled={disabled || selectedIds.length === 0}
          className="flex items-center gap-2"
        >
          Update Card Status
          {selectedIds.length > 0 && (
            <span className="rounded-full bg-primary w-6 h-6 flex items-center justify-center text-white text-xs">
              {selectedIds.length}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Update Card Status</DialogTitle>
          <DialogDescription>
            Update the card status for {selectedIds.length} selected customer{selectedIds.length !== 1 ? "s" : ""}.
          </DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}