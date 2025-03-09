"use client";

import { parseUnits, encodeAbiParameters, parseAbiParameters } from "viem";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";

import { SPARKDEX_CONTRACTS } from "./config";
import SparkRouterV2Abi from "../abis/SparkRouterV2Abi.json";

const ERC20_ABI = [
  {
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
];

// Custom hook for direct swap execution
export function useDirectSwap() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const executeSwap = async (
    fromToken: string,
    toToken: string,
    amount: string,
    fromDecimals: number,
    slippagePercentage: number = 5, // Increased default slippage to 5%
  ) => {
    if (!address || !walletClient || !publicClient) {
      throw new Error("Wallet not connected");
    }

    // Ensure addresses are properly formatted
    const formatAddress = (addr: string): `0x${string}` => {
      // If it's the zero address, return it as is
      if (addr === "0x0000000000000000000000000000000000000000") {
        return "0x0000000000000000000000000000000000000000";
      }

      // Otherwise, ensure it's a valid checksummed address
      // First, make sure it starts with 0x
      const normalizedAddr = addr.startsWith("0x") ? addr : `0x${addr}`;

      // Then ensure it's the correct length
      if (normalizedAddr.length !== 42) {
        throw new Error(`Invalid address length: ${normalizedAddr}`);
      }

      return normalizedAddr.toLowerCase() as `0x${string}`;
    };

    const fromTokenAddress = formatAddress(fromToken);
    const toTokenAddress = formatAddress(toToken);

    // Get WFLR address for path construction
    const WFLR_ADDRESS =
      "0x1d80c49bbbcd1c0911346656b529df9e5c2f783d" as `0x${string}`;

    // Parse amount with proper decimals
    const amountIn = parseUnits(amount, fromDecimals);

    // Calculate minimum amount out based on slippage
    // For a real implementation, you would get a quote from the router first
    const amountOutMin =
      (amountIn * BigInt(100 - slippagePercentage)) / BigInt(100);

    // Set deadline to 20 minutes from now
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);

    // If fromToken is native FLR (address is zero address)
    const isFromNative =
      fromTokenAddress === "0x0000000000000000000000000000000000000000";
    const isToNative =
      toTokenAddress === "0x0000000000000000000000000000000000000000";

    try {
      // If not swapping from native token, approve first
      if (!isFromNative) {
        console.log("Approving token spend...");

        // Check current allowance first
        const currentAllowance = (await publicClient.readContract({
          address: fromTokenAddress,
          abi: ERC20_ABI,
          functionName: "allowance",
          args: [address, SPARKDEX_CONTRACTS.router as `0x${string}`],
        })) as bigint;

        // Only approve if current allowance is less than amount
        if (currentAllowance < amountIn) {
          console.log("Current allowance insufficient, approving more...");

          // Use wallet client directly for approval
          const approveTxHash = await walletClient.writeContract({
            address: fromTokenAddress,
            abi: ERC20_ABI,
            functionName: "approve",
            args: [SPARKDEX_CONTRACTS.router as `0x${string}`, amountIn],
          });

          console.log("Approval transaction submitted:", approveTxHash);

          // Wait for approval transaction to be mined
          const approvalReceipt = await publicClient.waitForTransactionReceipt({
            hash: approveTxHash,
          });

          console.log("Approval confirmed:", approvalReceipt.transactionHash);
        } else {
          console.log("Sufficient allowance already exists");
        }
      }

      // For the SparkDEX router, use the correct command bytes
      // 0x00: V2 exact input swap
      // 0x01: V2 exact output swap
      // 0x08: Unwrap WETH
      // 0x09: Wrap ETH
      // 0x0b: V2 swap exact in
      // 0x0c: Recipient and deadline

      // Select appropriate commands based on swap type
      let commands;
      if (isFromNative) {
        commands = "0x090b0c"; // Wrap ETH, V2 swap exact in, Recipient and deadline
      } else if (isToNative) {
        commands = "0x0b0c08"; // V2 swap exact in, Recipient and deadline, Unwrap WETH
      } else {
        commands = "0x0b0c"; // V2 swap exact in, Recipient and deadline
      }

      let swapInputs: `0x${string}`[] = [];

      if (isFromNative) {
        // Native FLR to Token swap - use WFLR as intermediary
        const v2SwapParams = encodeAbiParameters(
          parseAbiParameters("uint256, uint256, address[]"),
          [
            amountIn, // Amount in
            amountOutMin, // Min amount out
            [WFLR_ADDRESS, toTokenAddress], // Path (WFLR to token)
          ],
        );

        // Include deadline in the recipient parameters
        const recipientAndDeadline = encodeAbiParameters(
          parseAbiParameters("address, uint256"),
          [
            address, // Recipient
            deadline, // Deadline
          ],
        );

        swapInputs = [v2SwapParams, recipientAndDeadline];
      } else if (isToNative) {
        // Token to Native FLR swap - use WFLR as intermediary
        const v2SwapParams = encodeAbiParameters(
          parseAbiParameters("uint256, uint256, address[]"),
          [
            amountIn, // Amount in
            amountOutMin, // Min amount out
            [fromTokenAddress, WFLR_ADDRESS], // Path (from token to WFLR)
          ],
        );

        const recipientAndDeadline = encodeAbiParameters(
          parseAbiParameters("address, uint256"),
          [
            address, // Recipient
            deadline, // Deadline
          ],
        );

        swapInputs = [v2SwapParams, recipientAndDeadline];
      } else {
        // Token to Token swap
        const v2SwapParams = encodeAbiParameters(
          parseAbiParameters("uint256, uint256, address[]"),
          [
            amountIn, // Amount in
            amountOutMin, // Min amount out
            [fromTokenAddress, toTokenAddress], // Path (from token to token)
          ],
        );

        const recipientAndDeadline = encodeAbiParameters(
          parseAbiParameters("address, uint256"),
          [
            address, // Recipient
            deadline, // Deadline
          ],
        );

        swapInputs = [v2SwapParams, recipientAndDeadline];
      }

      // Log the transaction details for debugging
      console.log("Swap transaction details:");
      console.log("From token:", fromTokenAddress);
      console.log("To token:", toTokenAddress);
      console.log("Amount:", amountIn.toString());
      console.log("Is from native:", isFromNative);
      console.log("Commands:", commands);
      console.log("Swap inputs:", swapInputs);

      // Estimate gas for the transaction
      let estimatedGas;
      try {
        estimatedGas = await publicClient.estimateContractGas({
          address: SPARKDEX_CONTRACTS.router as `0x${string}`,
          abi: SparkRouterV2Abi,
          functionName: "execute",
          args: [commands, swapInputs],
          value: isFromNative ? amountIn : BigInt(0),
          account: address,
        });

        // Add a 50% buffer to the estimated gas
        estimatedGas = (estimatedGas * BigInt(150)) / BigInt(100);
        console.log("Estimated gas with buffer:", estimatedGas.toString());
      } catch (error) {
        console.warn("Gas estimation failed, using fallback:", error);
        // Use a fallback gas limit if estimation fails
        estimatedGas = BigInt(3000000);
      }

      // Use wallet client directly for swap execution
      const swapTxHash = await walletClient.writeContract({
        address: SPARKDEX_CONTRACTS.router as `0x${string}`,
        abi: SparkRouterV2Abi,
        functionName: "execute",
        args: [commands, swapInputs],
        value: isFromNative ? amountIn : BigInt(0),
        gas: estimatedGas,
      });

      console.log("Swap transaction submitted:", swapTxHash);

      // Wait for swap transaction to be mined
      const swapReceipt = await publicClient.waitForTransactionReceipt({
        hash: swapTxHash,
      });

      console.log("Swap confirmed:", swapReceipt.transactionHash);

      return swapReceipt.transactionHash;
    } catch (error) {
      console.error("Error executing swap:", error);
      throw error;
    }
  };

  return { executeSwap };
}
