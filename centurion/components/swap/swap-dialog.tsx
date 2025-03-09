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
  // We need to create a custom component that wraps SwapCard to handle the type mismatch
  const CustomSwapCard = () => {
    const handleSwapSubmit = (data: SwapFormData) => {
      if (onSubmit) {
        onSubmit(data);
      }
    };

    return <SwapCard onSubmit={handleSwapSubmit} />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Swap Tokens</DialogTitle>
          <DialogDescription>Swap tokens on SparkDex</DialogDescription>
        </DialogHeader>
        <CustomSwapCard />
      </DialogContent>
    </Dialog>
  );
}
