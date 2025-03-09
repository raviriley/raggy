"use client";

import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { TokenPicker, Token } from "./responsive-token-picker";
import { useState } from "react";
import { toast } from "sonner";
import { useAccount } from "wagmi";
import { useDirectSwap } from "@/lib/sparkdex";
import { Loader2 } from "lucide-react";

export type SwapFormData = {
  from: string;
  to: string;
  amount: number;
};

// Define a custom type for the onSubmit prop that can handle both form events and SwapFormData
type SwapFormSubmitHandler = {
  (data: SwapFormData): void;
  (event: React.FormEvent<HTMLFormElement>): void;
};

export function SwapCard({
  initialFromToken,
  initialToToken,
  initialAmount,
  className,
  ...props
}: Omit<React.ComponentProps<"form">, "onSubmit"> & {
  initialFromToken?: Token;
  initialToToken?: Token;
  initialAmount?: string;
  onSubmit?: SwapFormSubmitHandler;
}) {
  const { address, isConnected } = useAccount();
  const { executeSwap } = useDirectSwap();
  const [fromToken, setFromToken] = useState<Token | null>(
    initialFromToken || null
  );
  const [toToken, setToToken] = useState<Token | null>(initialToToken || null);
  const [amount, setAmount] = useState<string>(initialAmount || "100");
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

    // Perform the swap directly
    try {
      setIsLoading(true);

      toast.info(
        `Preparing to swap ${amount} ${fromToken.label} to ${toToken.label}...`
      );

      // Execute the swap directly using wagmi
      const txHash = await executeSwap(
        fromToken.address!,
        toToken.address!,
        amount,
        fromToken.decimals || 18
      );

      toast.success(
        <div className="flex flex-col gap-1">
          <div>Swap transaction submitted!</div>
          <a
            href={`https://flarescan.com/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs underline"
          >
            View on FlareScan
          </a>
        </div>
      );

      // If onSubmit is provided, call it with the form data
      if (props.onSubmit) {
        props.onSubmit(formData);
      }
    } catch (error: any) {
      console.error("Swap error:", error);

      // Provide more user-friendly error messages
      if (error.message?.includes("user rejected")) {
        toast.error("Transaction was rejected by the user");
      } else if (error.message?.includes("insufficient funds")) {
        toast.error("Insufficient funds for this transaction");
      } else {
        toast.error(`Swap failed: ${error.message || "Unknown error"}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form
      className={cn("grid items-start gap-4", className)}
      onSubmit={handleSubmit}
      {...props}
    >
      <div className="grid gap-2">
        <Label htmlFor="from">From</Label>
        <TokenPicker
          onTokenSelect={setFromToken}
          selectedToken={fromToken}
          label="Select token"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="to">To</Label>
        <TokenPicker
          onTokenSelect={setToToken}
          selectedToken={toToken}
          label="Select token"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="amount">Amount</Label>
        <Input
          type="number"
          id="amount"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>
      <Button
        type="submit"
        disabled={isLoading || isApproving || !isConnected}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Swapping...
          </>
        ) : isApproving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Approving...
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
