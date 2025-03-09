/* eslint-disable */

import { ethers } from "ethers";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";
import axios from "axios";

// Load environment variables from the root .env file
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

// If API key is not found in the current directory, try the parent directory
if (!process.env.OPENROUTER_API_KEY) {
  dotenv.config({ path: path.resolve(process.cwd(), "../.env") });
}

// If API key is still not found, try the root directory
if (!process.env.OPENROUTER_API_KEY) {
  dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
}

// Configure OpenRouter client
const openRouterApiKey = process.env.OPENROUTER_API_KEY;
if (!openRouterApiKey) {
  throw new Error(
    "OPENROUTER_API_KEY is not defined in the environment variables",
  );
}

// Configure Ethereum provider for Flare Mainnet
const RPC_URL = "https://flare-api.flare.network/ext/C/rpc";
const CHAIN_ID = 14;
const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);

// Configuration
const BLOCKS_TO_FETCH = 500; // Fetch the past 500 blocks
const MAX_TRANSACTIONS = 100; // Limit the total number of transactions to process

// Output file path
const OUTPUT_PATH = path.resolve(
  process.cwd(),
  "flare-mainnet-transactions.json",
);

interface TransactionData {
  hash: string;
  fullLog: string;
  description: string;
}

// Helper function to handle BigInt serialization
function replaceBigInt(key: string, value: any) {
  if (typeof value === "bigint") {
    return value.toString();
  }
  return value;
}

// Add delay function to avoid rate limiting
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Helper function to append transaction to file
async function appendTransactionToFile(
  transaction: TransactionData,
): Promise<void> {
  try {
    let existingData: TransactionData[] = [];

    // Read existing file if it exists
    if (fs.existsSync(OUTPUT_PATH)) {
      const fileContent = fs.readFileSync(OUTPUT_PATH, "utf8");
      if (fileContent.trim()) {
        existingData = JSON.parse(fileContent);
      }
    }

    // Add new transaction
    existingData.push(transaction);

    // Write back to file
    fs.writeFileSync(
      OUTPUT_PATH,
      JSON.stringify(existingData, replaceBigInt, 2),
    );

    console.log(`Transaction ${transaction.hash} saved to file`);
  } catch (error) {
    console.error("Error appending transaction to file:", error);
  }
}

// Function to get additional transaction context
async function getTransactionContext(
  txData: ethers.TransactionResponse,
  txReceipt: ethers.TransactionReceipt | null,
): Promise<any> {
  const context: any = {};

  // Check if this is a contract interaction
  if (txData.to) {
    try {
      // Get contract code
      const code = await provider.getCode(txData.to);
      context.isContract = code !== "0x" && code !== "0x0";

      if (context.isContract) {
        // Get contract code
        context.contractCode =
          code.length > 2000
            ? `${code.substring(0, 2000)}... (truncated)`
            : code;

        // Try to get contract balance
        try {
          const balance = await provider.getBalance(txData.to);
          context.contractBalance = ethers.formatEther(balance);
        } catch (error) {
          context.contractBalance = "Failed to fetch balance";
        }

        // Try to get some basic contract info if it might be a token
        try {
          const tokenInterface = new ethers.Interface([
            "function name() view returns (string)",
            "function symbol() view returns (string)",
            "function decimals() view returns (uint8)",
            "function totalSupply() view returns (uint256)",
          ]);

          const contract = new ethers.Contract(
            txData.to,
            tokenInterface,
            provider,
          );

          // Try to get token info
          try {
            const name = await contract.name();
            context.tokenName = name;
          } catch (error) {
            // Not a token or doesn't have name function
          }

          try {
            const symbol = await contract.symbol();
            context.tokenSymbol = symbol;
          } catch (error) {
            // Not a token or doesn't have symbol function
          }
        } catch (error) {
          // Ignore errors in token detection
        }
      }
    } catch (error) {
      context.contractError = "Failed to check contract status";
    }
  }

  // Get block information
  try {
    if (txReceipt && txReceipt.blockNumber) {
      const block = await provider.getBlock(txReceipt.blockNumber);
      if (block) {
        context.blockTimestamp = new Date(
          Number(block.timestamp) * 1000,
        ).toISOString();
        context.blockGasLimit = block.gasLimit.toString();
        context.blockGasUsed = block.gasUsed.toString();
      }
    }
  } catch (error) {
    context.blockError = "Failed to fetch block details";
  }

  // Check sender account
  try {
    const senderCode = await provider.getCode(txData.from);
    context.senderIsContract = senderCode !== "0x" && senderCode !== "0x0";

    const senderBalance = await provider.getBalance(txData.from);
    context.senderBalance = ethers.formatEther(senderBalance);
  } catch (error) {
    context.senderError = "Failed to check sender details";
  }

  return context;
}

// Function to extract and format transaction data for better LLM understanding
function formatTransactionData(
  txData: ethers.TransactionResponse,
  txReceipt: ethers.TransactionReceipt | null,
  context: any,
): string {
  let formattedData = "";

  // Basic transaction info
  formattedData += `Transaction Hash: ${txData.hash}\n`;
  formattedData += `From: ${txData.from}${context.senderIsContract ? " (Contract)" : " (EOA)"}\n`;
  formattedData += `To: ${txData.to || "Contract Creation"}\n`;
  formattedData += `Value: ${ethers.formatEther(txData.value)} FLR\n`;
  formattedData += `Gas Price: ${ethers.formatUnits(txData.gasPrice || "0", "gwei")} Gwei\n`;
  formattedData += `Gas Limit: ${txData.gasLimit.toString()}\n`;

  if (txReceipt) {
    formattedData += `Gas Used: ${txReceipt.gasUsed.toString()}\n`;
    formattedData += `Status: ${txReceipt.status === 1 ? "Success" : "Failed"}\n`;
    formattedData += `Block Number: ${txReceipt.blockNumber}\n`;
    formattedData += `Transaction Index: ${txReceipt.index}\n`;
  }

  formattedData += `Nonce: ${txData.nonce}\n`;

  // Context information
  if (context.blockTimestamp) {
    formattedData += `Block Timestamp: ${context.blockTimestamp}\n`;
  }

  if (context.senderBalance) {
    formattedData += `Sender Balance: ${context.senderBalance} FLR\n`;
  }

  // Contract information if applicable
  if (context.isContract) {
    formattedData += "\n--- CONTRACT INFORMATION ---\n";

    if (context.tokenName) {
      formattedData += `Token Name: ${context.tokenName}\n`;
    }

    if (context.tokenSymbol) {
      formattedData += `Token Symbol: ${context.tokenSymbol}\n`;
    }

    if (context.contractBalance) {
      formattedData += `Contract Balance: ${context.contractBalance} FLR\n`;
    }
  }

  // Transaction data
  formattedData += "\n--- TRANSACTION DATA ---\n";
  if (txData.data && txData.data !== "0x") {
    // If data starts with a function selector (4 bytes / 8 hex chars + "0x")
    if (txData.data.length >= 10) {
      formattedData += `Function Selector: ${txData.data.substring(0, 10)}\n`;
      formattedData += `Function Parameters: ${txData.data.substring(10)}\n`;
    }
    formattedData += `Full Data: ${txData.data}\n`;
  } else {
    formattedData += "No data (simple transfer)\n";
  }

  // Transaction logs
  if (txReceipt && txReceipt.logs && txReceipt.logs.length > 0) {
    formattedData += "\n--- EVENT LOGS ---\n";
    txReceipt.logs.forEach((log, index) => {
      formattedData += `Log #${index + 1}:\n`;
      formattedData += `  Address: ${log.address}\n`;
      formattedData += `  Topics:\n`;
      log.topics.forEach((topic, topicIndex) => {
        formattedData += `    ${topicIndex}: ${topic}\n`;
      });
      formattedData += `  Data: ${log.data}\n`;
    });
  } else {
    formattedData += "\nNo event logs emitted\n";
  }

  // Contract code (truncated)
  if (context.contractCode) {
    formattedData += "\n--- CONTRACT CODE (TRUNCATED) ---\n";
    formattedData += `${context.contractCode}\n`;
  }

  return formattedData;
}

async function generateTransactionDescription(
  txData: ethers.TransactionResponse,
  txReceipt: ethers.TransactionReceipt | null,
  blockInfo: any,
): Promise<string> {
  try {
    // Get additional context for the transaction
    const context = await getTransactionContext(txData, txReceipt);

    // Format transaction data for better LLM understanding
    const formattedData = formatTransactionData(txData, txReceipt, context);

    // Create a comprehensive prompt with all transaction data
    const prompt = `
      You are an expert blockchain analyst specializing in the Flare Network. Analyze this transaction from the Flare Mainnet and provide a detailed description of what's happening.

      ${formattedData}

      Based on the above transaction data, provide a thorough analysis of:
      1. What type of transaction this is (transfer, contract call, contract creation, etc.)
      2. The specific action being performed (token transfer, swap, staking, etc.)
      3. Any protocols or contracts involved that you can identify
      4. The purpose and outcome of the transaction
      5. Any token transfers or state changes indicated by the event logs
      6. Any notable patterns, anomalies, or security concerns

      Format your response as a clear, structured analysis with bullet points for key observations. Be specific about what you can determine with high confidence versus what is speculative. Include technical details where relevant.
    `;

    // Use OpenRouter API directly with axios
    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "anthropic/claude-3-sonnet",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 500,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openRouterApiKey}`,
          "HTTP-Referer": "https://github.com/raggy",
          "X-Title": "Flare Mainnet Transaction Analysis",
        },
      },
    );

    return (
      response.data.choices[0]?.message?.content || "No description available"
    );
  } catch (error) {
    console.error("Error generating description:", error);
    return "Failed to generate description";
  }
}

async function fetchTransactions(): Promise<void> {
  try {
    // Initialize output file with empty array if it doesn't exist
    if (!fs.existsSync(OUTPUT_PATH)) {
      fs.writeFileSync(OUTPUT_PATH, JSON.stringify([], null, 2));
      console.log(`Created output file at ${OUTPUT_PATH}`);
    }

    // Get current block number
    const currentBlockNumber = await provider.getBlockNumber();
    console.log(`Current block number: ${currentBlockNumber}`);

    // Calculate start block
    const startBlockNumber = Math.max(0, currentBlockNumber - BLOCKS_TO_FETCH);
    console.log(
      `Fetching transactions from block ${startBlockNumber} to ${currentBlockNumber}`,
    );

    let transactionCount = 0;

    // Fetch blocks and transactions
    for (
      let i = startBlockNumber;
      i <= currentBlockNumber && transactionCount < MAX_TRANSACTIONS;
      i++
    ) {
      try {
        console.log(`Fetching block ${i}...`);
        const block = await provider.getBlock(i, true);

        if (block && block.transactions) {
          for (const txHash of block.transactions) {
            if (transactionCount >= MAX_TRANSACTIONS) break;

            console.log(`Processing transaction ${txHash}...`);

            // Get full transaction details
            const fullTx = await provider.getTransaction(txHash);
            if (!fullTx) continue;

            const fullTxReceipt = await provider.getTransactionReceipt(txHash);

            // Get detailed block info
            const blockInfo = {
              number: block.number,
              timestamp: block.timestamp,
              hash: block.hash,
              parentHash: block.parentHash,
              miner: block.miner,
              gasLimit: block.gasLimit,
              gasUsed: block.gasUsed,
            };

            // Combine transaction data and handle BigInt serialization
            const fullLog = JSON.stringify(
              {
                transaction: fullTx,
                receipt: fullTxReceipt,
                block: blockInfo,
              },
              replaceBigInt,
              2,
            );

            // Generate AI description
            const description = await generateTransactionDescription(
              fullTx,
              fullTxReceipt,
              blockInfo,
            );

            // Create transaction data object
            const transactionData: TransactionData = {
              hash: fullTx.hash,
              fullLog,
              description,
            };

            // Save transaction to file immediately
            await appendTransactionToFile(transactionData);

            console.log(`Added transaction ${fullTx.hash} with description`);
            transactionCount++;

            // Add a delay between API calls to avoid rate limiting
            await delay(2000); // Increased delay to avoid rate limiting
          }
        }
      } catch (error) {
        console.error(`Error processing block ${i}:`, error);
      }
    }

    console.log(`Successfully processed ${transactionCount} transactions`);
  } catch (error) {
    console.error("Error fetching transactions:", error);
  }
}

// Execute the script
fetchTransactions()
  .then(() => console.log("Script completed successfully"))
  .catch((error) => console.error("Script failed:", error));
