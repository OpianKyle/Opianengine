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

type CardStatus = "NOT_DELIVERED" | "OUT_FOR_DELIVERY" | "DELIVERED";

interface BulkCardStatusUpdateProps {
  selectedIds: number[];
  onUpdateComplete?: () => void;
  disabled?: boolean;
}

export function BulkCardStatusUpdate({
  selectedIds,
  onUpdateComplete,
  disabled = false,
}: BulkCardStatusUpdateProps) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<CardStatus>("NOT_DELIVERED");
  const { mutate: updateCardStatus, isPending } = useCardStatusMutation();

  const handleUpdateStatus = () => {
    updateCardStatus(
      { userIds: selectedIds, cardStatus: status },
      {
        onSuccess: () => {
          setOpen(false);
          if (onUpdateComplete) {
            onUpdateComplete();
          }
        },
      }
    );
  };

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
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Card Status</h4>
            <CardStatusDropdown value={status} onChange={setStatus} />
          </div>
        </div>
        <DialogFooter>
          <Button
            type="submit"
            onClick={handleUpdateStatus}
            disabled={isPending}
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
      </DialogContent>
    </Dialog>
  );
}