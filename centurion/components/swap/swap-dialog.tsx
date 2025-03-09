"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SwapCard, type SwapFormData } from "./swap-card";

interface SwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit?: (data: SwapFormData) => void;
}

export function SwapDialog({ open, onOpenChange, onSubmit }: SwapDialogProps) {
  // Create a handler that will be called when the swap is submitted
  const handleSwapSubmit = (
    dataOrEvent: SwapFormData | React.FormEvent<HTMLFormElement>
  ) => {
    // Only call the parent's onSubmit if we received SwapFormData
    if (
      onSubmit &&
      "from" in dataOrEvent &&
      "to" in dataOrEvent &&
      "amount" in dataOrEvent
    ) {
      onSubmit(dataOrEvent);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Swap Tokens</DialogTitle>
          <DialogDescription>Swap tokens on SparkDex</DialogDescription>
        </DialogHeader>
        <SwapCard onSubmit={handleSwapSubmit} />
      </DialogContent>
    </Dialog>
  );
}
