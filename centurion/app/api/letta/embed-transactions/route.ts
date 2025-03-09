import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

// Configuration
const LETTA_API_URL = "http://34.162.165.188:8283/v1/sources/";
const SOURCE_IDS_FILE = path.join(process.cwd(), "letta-source-ids.txt");

// Types
interface TransactionData {
  hash: string;
  fullLog: string;
  description: string;
}

interface EmbeddingResponse {
  id: string;
  name: string;
  description: string;
  // Other fields omitted for brevity
}

export async function POST(request: NextRequest) {
  console.log("📋 [LETTA EMBED] Request received to embed transactions");

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
      if (!tx.hash || !tx.description) {
        return NextResponse.json(
          { error: "All transactions must have hash and description fields" },
          { status: 400 },
        );
      }
    }

    // Process each transaction and embed its description
    const results = [];
    const sourceIds = [];

    for (let i = 0; i < transactions.length; i++) {
      const tx = transactions[i];
      try {
        // Create a name based on the transaction hash
        const name = `Transaction ${tx.hash}`;

        // Prepare the request payload for Letta API
        const payload = {
          name,
          description: tx.description,
          embedding_config: {
            model: "text-embedding-ada-002",
            parameters: {},
            embedding_endpoint_type: "openai",
            embedding_model: "text-embedding-ada-002",
            embedding_dim: 1536,
          },
        };

        // Call the Letta API
        const response = await fetch(LETTA_API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Letta API error: ${JSON.stringify(errorData)}`);
        }

        // Parse the response
        const data: EmbeddingResponse = await response.json();

        // Store the source ID
        sourceIds.push(data.id);

        // Add to results
        results.push({
          hash: tx.hash,
          sourceId: data.id,
          success: true,
        });

        // Add a short delay to prevent rate limiting
        await new Promise((resolve) => setTimeout(resolve, 100));

        console.log(
          `📝 [LETTA EMBED] Embedding transaction ${i + 1}/${transactions.length}: ${name}`,
        );
        console.log(
          `✅ [LETTA EMBED] Source ID created: ${data.id} for transaction ${i + 1}`,
        );
        console.log(`💾 [LETTA EMBED] Appended source ID to file: ${data.id}`);
      } catch (error) {
        console.error(`Error embedding transaction ${tx.hash}:`, error);
        results.push({
          hash: tx.hash,
          success: false,
          error: (error as Error).message,
        });
      }
    }

    // Write source IDs to a text file
    try {
      // Read existing file if it exists
      let existingIds: string[] = [];
      try {
        const fileContent = await fs.readFile(SOURCE_IDS_FILE, "utf-8");
        existingIds = fileContent.split("\n").filter((id) => id.trim());
      } catch (error) {
        // File doesn't exist yet, that's ok
      }

      // Combine existing and new IDs, removing duplicates
      const allIds = [...new Set([...existingIds, ...sourceIds])];

      // Write back to file
      await fs.writeFile(SOURCE_IDS_FILE, allIds.join("\n"));
    } catch (error) {
      console.error("Error writing source IDs to file:", error);
      return NextResponse.json({
        success: false,
        error: `Successfully embedded descriptions but failed to write source IDs to file: ${(error as Error).message}`,
        results,
      });
    }

    console.log(
      `🎉 [LETTA EMBED] Completed embedding ${sourceIds.length}/${transactions.length} transactions`,
    );

    return NextResponse.json({
      success: true,
      totalEmbedded: results.filter((r) => r.success).length,
      failedCount: results.filter((r) => !r.success).length,
      sourceIds,
      results,
    });
  } catch (error) {
    console.error("Error processing transactions for embedding:", error);
    return NextResponse.json(
      {
        error: "Failed to process transactions",
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
