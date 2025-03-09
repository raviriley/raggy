"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ComboBoxResponsive, Token } from "./responsive-combobox";
import { useState } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { approveToken, swapTokens } from "@/lib/sparkdex";
import { Loader2 } from "lucide-react";

export type SwapFormData = {
  from: string;
  to: string;
  amount: number;
};

export function SwapCard({
  className,
  onSubmit,
}: React.ComponentProps<"form"> & {
  onSubmit?: (data: SwapFormData) => void;
}) {
  const { address, isConnected } = useAccount();
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [amount, setAmount] = useState<string>("100");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isApproving, setIsApproving] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isConnected) {
      toast.error("Please connect your wallet first");
      return;
    }

    if (!fromToken || !toToken) {
      toast.error("Please select tokens for the swap");
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    // Create the form data
    const formData: SwapFormData = {
      from: fromToken.value,
      to: toToken.value,
      amount: parseFloat(amount),
    };

    // If onSubmit is provided, call it with the form data
    if (onSubmit) {
      onSubmit(formData);
      return;
    }

    // Otherwise, perform the swap directly
    try {
      setIsLoading(true);

      // Check if approval is needed for non-native tokens
      if (fromToken.address !== "0x0000000000000000000000000000000000000000") {
        setIsApproving(true);
        // Approve token spending
        const approvalHash = await approveToken(
          fromToken.address!,
          amount,
          fromToken.decimals || 18
        );

        toast.success(`Token approval submitted: ${approvalHash}`);
        setIsApproving(false);
      }

      // Perform the swap
      const swapHash = await swapTokens(
        fromToken.address!,
        toToken.address!,
        amount,
        fromToken.decimals || 18,
        toToken.decimals || 18
      );

      toast.success(`Swap transaction submitted: ${swapHash}`);
    } catch (error: any) {
      toast.error(`Error: ${error.message || "Failed to swap tokens"}`);
    } finally {
      setIsLoading(false);
      setIsApproving(false);
    }
  };

  return (
    <form
      className={cn("grid items-start gap-4", className)}
      onSubmit={handleSubmit}
    >
      <div className="grid gap-2">
        <Label htmlFor="from">From</Label>
        <ComboBoxResponsive
          selectedToken={fromToken}
          onTokenSelect={setFromToken}
          label="Select token"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="to">To</Label>
        <ComboBoxResponsive
          selectedToken={toToken}
          onTokenSelect={setToToken}
          label="Select token"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="amount">Amount</Label>
        <Input
          type="number"
          id="amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          min="0"
          step="0.000001"
        />
      </div>
      <Button
        type="submit"
        disabled={isLoading || !isConnected || !fromToken || !toToken}
      >
        {isLoading ? (
          <>
            {isApproving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Approving...
              </>
            ) : (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Swapping...
              </>
            )}
          </>
        ) : !isConnected ? (
          "Connect Wallet to Swap"
        ) : (
          "Submit Swap"
        )}
      </Button>
    </form>
  );
}
