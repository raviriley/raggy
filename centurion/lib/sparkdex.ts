"use client";

import { parseUnits, formatUnits } from "viem";
import { readContract, writeContract, getAccount } from "wagmi/actions";
import { SPARKDEX_CONTRACTS } from "./config";

// SparkDex Router ABI (simplified for swap functionality)
const ROUTER_ABI = [
  {
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForTokens",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    name: "swapExactETHForTokens",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { name: "amountIn", type: "uint256" },
      { name: "amountOutMin", type: "uint256" },
      { name: "path", type: "address[]" },
      { name: "to", type: "address" },
      { name: "deadline", type: "uint256" },
    ],
    name: "swapExactTokensForETH",
    outputs: [{ name: "amounts", type: "uint256[]" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

// ERC20 Token ABI (for approvals)
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

// Function to approve token spending
export async function approveToken(
  tokenAddress: string,
  amount: string,
  decimals: number
) {
  try {
    const account = getAccount();
    if (!account?.address) throw new Error("No wallet connected");

    const parsedAmount = parseUnits(amount, decimals);

    const hash = await writeContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "approve",
      args: [SPARKDEX_CONTRACTS.router as `0x${string}`, parsedAmount],
    });

    return hash;
  } catch (error) {
    console.error("Error approving token:", error);
    throw error;
  }
}

// Function to check token allowance
export async function checkAllowance(
  tokenAddress: string,
  ownerAddress: string,
  decimals: number
) {
  try {
    const allowance = await readContract({
      address: tokenAddress as `0x${string}`,
      abi: ERC20_ABI,
      functionName: "allowance",
      args: [
        ownerAddress as `0x${string}`,
        SPARKDEX_CONTRACTS.router as `0x${string}`,
      ],
    });

    return formatUnits(allowance as bigint, decimals);
  } catch (error) {
    console.error("Error checking allowance:", error);
    throw error;
  }
}

// Function to perform token swap
export async function swapTokens(
  fromToken: string,
  toToken: string,
  amount: string,
  fromDecimals: number,
  toDecimals: number,
  slippagePercentage: number = 2 // Default 2% slippage
) {
  try {
    const account = getAccount();
    if (!account?.address) throw new Error("No wallet connected");

    const parsedAmount = parseUnits(amount, fromDecimals);
    const path = [fromToken, toToken];

    // Calculate minimum amount out based on slippage
    // In a real implementation, you would get a quote from the router first
    const amountOutMin =
      (parsedAmount * BigInt(100 - slippagePercentage)) / BigInt(100);

    // Set deadline to 20 minutes from now
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 20 * 60);

    // Native token (FLR) to token swap
    if (fromToken === "0x0000000000000000000000000000000000000000") {
      const hash = await writeContract({
        address: SPARKDEX_CONTRACTS.router as `0x${string}`,
        abi: ROUTER_ABI,
        functionName: "swapExactETHForTokens",
        args: [amountOutMin, [path[1]], account.address, deadline],
        value: parsedAmount,
      });
      return hash;
    }

    // Token to native token (FLR) swap
    if (toToken === "0x0000000000000000000000000000000000000000") {
      const hash = await writeContract({
        address: SPARKDEX_CONTRACTS.router as `0x${string}`,
        abi: ROUTER_ABI,
        functionName: "swapExactTokensForETH",
        args: [
          parsedAmount,
          amountOutMin,
          [path[0]],
          account.address,
          deadline,
        ],
      });
      return hash;
    }

    // Token to token swap
    const hash = await writeContract({
      address: SPARKDEX_CONTRACTS.router as `0x${string}`,
      abi: ROUTER_ABI,
      functionName: "swapExactTokensForTokens",
      args: [parsedAmount, amountOutMin, path, account.address, deadline],
    });

    return hash;
  } catch (error) {
    console.error("Error swapping tokens:", error);
    throw error;
  }
}
