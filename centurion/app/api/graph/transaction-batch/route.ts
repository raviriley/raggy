import { NextRequest, NextResponse } from "next/server";
import { runQuery } from "@/lib/neo4j";

// Types for our transaction data
interface TransactionData {
  hash: string;
  fullLog: string;
  description: string;
  timestamp?: string; // Optional: allow timestamp for temporal analysis
}

export async function POST(request: NextRequest) {
  try {
    const transactions: TransactionData[] = await request.json();

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json(
        { error: "Request must contain an array of transaction objects" },
        { status: 400 },
      );
    }

    // Validate each transaction has required fields
    for (const tx of transactions) {
      if (!tx.hash) {
        return NextResponse.json(
          { error: "All transactions must have a hash" },
          { status: 400 },
        );
      }
    }

    // Step 1: Create all nodes first
    const createdNodes = [];
    for (const tx of transactions) {
      // Create a node with the Transaction label and hash as unique identifier
      const cypher = `
        MERGE (t:Transaction {hash: $hash})
        SET t.fullLog = $fullLog,
            t.description = $description,
            t.timestamp = $timestamp,
            t.createdAt = CASE WHEN t.createdAt IS NULL THEN datetime() ELSE t.createdAt END
        RETURN t
      `;

      const result = await runQuery(cypher, {
        hash: tx.hash,
        fullLog: tx.fullLog || "",
        description: tx.description || "",
        timestamp: tx.timestamp || null,
      });

      createdNodes.push({
        hash: tx.hash,
        node: result[0]?.t,
      });
    }

    // Step 2: Enhanced pattern extraction and relationship creation
    const relationships = [];

    // Extract patterns with enhanced detection
    const extractPatterns = (tx: TransactionData) => {
      const text = `${tx.description} ${tx.fullLog}`.toLowerCase();

      const patterns: Record<string, string[]> = {
        // Ethereum/Flare addresses (0x followed by 40 hex chars)
        addresses: text.match(/0x[a-fA-F0-9]{40}/gi) || [],

        // Transaction hashes (0x followed by 64 hex chars)
        txHashes: text.match(/0x[a-fA-F0-9]{64}/gi) || [],

        // Other contract hashes or identifiers (any sequence that looks like a hash)
        otherHashes: (text.match(/[a-fA-F0-9]{32,}/gi) || []).filter(
          (hash) => !hash.startsWith("0x"),
        ),

        // Token symbols (common tokens and potentially custom ones)
        tokens: extractTokens(text),

        // Numeric amounts (numbers followed by tokens or standalone)
        amounts: extractAmounts(text),

        // Action types (specific transaction behaviors)
        actions: extractActions(text),

        // Chain/network identifiers
        chains: extractChains(text),

        // Protocol/dApp names
        protocols: extractProtocols(text),
      };

      return patterns;
    };

    // Helper functions for pattern extraction
    function extractTokens(text: string): string[] {
      const commonTokens = [
        "eth",
        "btc",
        "usdc",
        "usdt",
        "dai",
        "link",
        "aave",
        "uni",
        "sushi",
        "matic",
        "weth",
        "wbtc",
        "sol",
        "avax",
        "bnb",
        "ftm",
        "op",
        "arb",
      ];

      const tokenMatches = new Set<string>();

      // Find common tokens
      for (const token of commonTokens) {
        // Make sure it's a standalone token reference (with word boundaries)
        const regex = new RegExp(`\\b${token}\\b`, "gi");
        const matches = text.match(regex) || [];
        matches.forEach((match) => tokenMatches.add(match.toLowerCase()));
      }

      // Find token amounts (e.g., "50 ETH", "1000 USDC")
      const amountRegex = /(\d+(\.\d+)?)\s*([a-zA-Z]{2,10})/gi;
      let match;

      while ((match = amountRegex.exec(text)) !== null) {
        if (match[3]) {
          tokenMatches.add(match[3].toLowerCase());
        }
      }

      return Array.from(tokenMatches);
    }

    function extractAmounts(text: string): string[] {
      const amountMatches = new Set<string>();

      // Find numeric amounts with tokens (e.g., "50 ETH", "1000 USDC")
      const amountWithTokenRegex = /(\d+(\.\d+)?)\s*([a-zA-Z]{2,10})/gi;
      let match;

      while ((match = amountWithTokenRegex.exec(text)) !== null) {
        if (match[0]) {
          amountMatches.add(match[0].toLowerCase());
        }
      }

      // Find large standalone numbers that might be amounts
      const largeNumberRegex = /\b\d{4,}\b/g;
      const largeNumbers = text.match(largeNumberRegex) || [];
      largeNumbers.forEach((num) => amountMatches.add(num));

      return Array.from(amountMatches);
    }

    function extractActions(text: string): string[] {
      const actionKeywords = [
        "transfer",
        "swap",
        "deposit",
        "withdraw",
        "mint",
        "burn",
        "stake",
        "unstake",
        "borrow",
        "repay",
        "claim",
        "bridge",
        "approve",
        "exchange",
        "provide",
        "remove",
        "liquidate",
        "lend",
      ];

      const actionMatches = new Set<string>();

      for (const action of actionKeywords) {
        // Check for action keywords with word boundaries
        const regex = new RegExp(`\\b${action}\\w*\\b`, "gi");
        const matches = text.match(regex) || [];
        matches.forEach((match) => actionMatches.add(match.toLowerCase()));
      }

      return Array.from(actionMatches);
    }

    function extractChains(text: string): string[] {
      const chainKeywords = [
        "ethereum",
        "eth",
        "arbitrum",
        "arb",
        "optimism",
        "op",
        "polygon",
        "matic",
        "binance",
        "bnb",
        "bsc",
        "avalanche",
        "avax",
        "fantom",
        "ftm",
        "solana",
        "sol",
        "mainnet",
        "testnet",
        "goerli",
        "sepolia",
        "mumbai",
        "rinkeby",
      ];

      const chainMatches = new Set<string>();

      for (const chain of chainKeywords) {
        const regex = new RegExp(`\\b${chain}\\b`, "gi");
        const matches = text.match(regex) || [];
        matches.forEach((match) => chainMatches.add(match.toLowerCase()));
      }

      return Array.from(chainMatches);
    }

    function extractProtocols(text: string): string[] {
      const protocolKeywords = [
        "uniswap",
        "sushiswap",
        "aave",
        "compound",
        "maker",
        "curve",
        "balancer",
        "yearn",
        "synthetix",
        "1inch",
        "pancakeswap",
        "opensea",
        "lido",
        "convex",
        "gmx",
        "trader joe",
        "dydx",
        "metamask",
        "chainlink",
      ];

      const protocolMatches = new Set<string>();

      for (const protocol of protocolKeywords) {
        const regex = new RegExp(
          `\\b${protocol.replace(" ", "\\s+")}\\b`,
          "gi",
        );
        const matches = text.match(regex) || [];
        matches.forEach((match) => protocolMatches.add(match.toLowerCase()));
      }

      return Array.from(protocolMatches);
    }

    // Map for storing pattern data by transaction
    const txPatternMap = new Map<string, Record<string, string[]>>();

    // Extract patterns for each transaction
    transactions.forEach((tx) => {
      const patterns = extractPatterns(tx);
      txPatternMap.set(tx.hash, patterns);
    });

    // Create a map of patterns to transactions for each pattern type
    const patternTypeMap = new Map<string, Map<string, string[]>>();

    for (const [txHash, patterns] of txPatternMap.entries()) {
      for (const [patternType, patternList] of Object.entries(patterns)) {
        if (!patternTypeMap.has(patternType)) {
          patternTypeMap.set(patternType, new Map<string, string[]>());
        }

        const typeMap = patternTypeMap.get(patternType)!;

        for (const pattern of patternList) {
          if (!typeMap.has(pattern)) {
            typeMap.set(pattern, []);
          }

          typeMap.get(pattern)!.push(txHash);
        }
      }
    }

    // Define relationship type mapping based on pattern type
    const relationshipTypes: Record<string, string> = {
      addresses: "SHARES_ADDRESS",
      txHashes: "SHARES_TX_HASH",
      otherHashes: "SHARES_HASH",
      tokens: "INVOLVES_TOKEN",
      amounts: "SIMILAR_AMOUNT",
      actions: "SIMILAR_ACTION",
      chains: "ON_SAME_CHAIN",
      protocols: "USES_SAME_PROTOCOL",
    };

    // Create relationships for transactions that share patterns
    for (const [patternType, patternMap] of patternTypeMap.entries()) {
      const relationType = relationshipTypes[patternType] || "RELATED_TO";

      for (const [pattern, txHashes] of patternMap.entries()) {
        // Skip patterns that only appear in one transaction
        if (txHashes.length <= 1) continue;

        // Create relationships between all transactions that share this pattern
        for (let i = 0; i < txHashes.length; i++) {
          for (let j = i + 1; j < txHashes.length; j++) {
            const sourceHash = txHashes[i];
            const targetHash = txHashes[j];

            // Skip self-relationships
            if (sourceHash === targetHash) continue;

            // Create a more specific relationship type with the pattern as a property
            const relationshipCypher = `
              MATCH (source:Transaction {hash: $sourceHash})
              MATCH (target:Transaction {hash: $targetHash})
              MERGE (source)-[r:${relationType} {pattern: $pattern, patternType: $patternType}]->(target)
              RETURN source, r, target
            `;

            const relResult = await runQuery(relationshipCypher, {
              sourceHash,
              targetHash,
              pattern,
              patternType,
            });

            if (relResult.length > 0) {
              relationships.push({
                source: sourceHash,
                target: targetHash,
                relationType,
                pattern,
                patternType,
                relationship: relResult[0].r,
              });
            }
          }
        }
      }
    }

    // Step 3: Look for complex multi-pattern relationships
    // For transactions that have multiple shared patterns, create a stronger relationship
    const multiPatternRelationships = [];
    const txPairCount = new Map<
      string,
      { count: number; patterns: Set<string>; types: Set<string> }
    >();

    for (const rel of relationships) {
      const pairKey = [rel.source, rel.target].sort().join("_");

      if (!txPairCount.has(pairKey)) {
        txPairCount.set(pairKey, {
          count: 0,
          patterns: new Set(),
          types: new Set(),
        });
      }

      const pairData = txPairCount.get(pairKey)!;
      pairData.count++;
      pairData.patterns.add(rel.pattern);
      pairData.types.add(rel.patternType);
    }

    // Create stronger relationships for transaction pairs with multiple connections
    for (const [pairKey, data] of txPairCount.entries()) {
      if (data.count >= 2) {
        const [source, target] = pairKey.split("_");

        const patternTypes = Array.from(data.types).join(",");
        const patterns = Array.from(data.patterns).join(",");

        const strengthCypher = `
          MATCH (source:Transaction {hash: $source})
          MATCH (target:Transaction {hash: $target})
          MERGE (source)-[r:STRONGLY_RELATED {
            strength: $strength,
            patternTypes: $patternTypes,
            patterns: $patterns
          }]->(target)
          RETURN source, r, target
        `;

        const strengthResult = await runQuery(strengthCypher, {
          source,
          target,
          strength: data.count,
          patternTypes,
          patterns,
        });

        if (strengthResult.length > 0) {
          multiPatternRelationships.push({
            source,
            target,
            strength: data.count,
            patternTypes: Array.from(data.types),
            patterns: Array.from(data.patterns),
            relationship: strengthResult[0].r,
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      nodesCreated: createdNodes.length,
      relationshipsCreated: relationships.length,
      strongRelationships: multiPatternRelationships.length,
      details: {
        nodes: createdNodes,
        relationships,
        strongRelationships: multiPatternRelationships,
      },
    });
  } catch (error) {
    console.error("Error processing transactions batch:", error);
    return NextResponse.json(
      {
        error: "Failed to process transactions",
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
