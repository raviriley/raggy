import { NextRequest, NextResponse } from "next/server";
import neo4j from "neo4j-driver";

// Configure Neo4j connection
const driver = neo4j.driver(
  process.env.NEO4J_URI || "neo4j://localhost:7687",
  neo4j.auth.basic(
    process.env.NEO4J_USER || "neo4j",
    process.env.NEO4J_PASSWORD || "password",
  ),
);

interface TransactionNode {
  hash: string;
  description: string;
  [key: string]: any; // For any other properties
}

interface TransactionRelationship {
  source: string; // source hash
  target: string; // target hash
  [key: string]: any; // For any other properties
}

interface ImportData {
  transactions?: TransactionNode[];
  relationships?: TransactionRelationship[];
}

export async function POST(request: NextRequest) {
  console.log("📋 [GRAPH IMPORT] Request received for graph import");

  const session = driver.session();

  try {
    const data: ImportData = await request.json();

    if (!data.transactions) {
      console.log("❌ [GRAPH IMPORT] Invalid import data format");
      await session.close();
      return NextResponse.json(
        { error: "Import data must contain a transactions array" },
        { status: 400 },
      );
    }

    const transactions = data.transactions;
    const relationships = data.relationships || [];

    console.log(
      `🔍 [GRAPH IMPORT] Processing ${transactions.length} transactions and ${relationships.length} relationships`,
    );

    // 1. Clear existing database if requested
    const url = new URL(request.url);
    const clearExisting = url.searchParams.get("clear") === "true";

    if (clearExisting) {
      console.log("🧹 [GRAPH IMPORT] Clearing existing database");
      await session.run("MATCH (n) DETACH DELETE n");
    }

    // 2. Create constraints and indexes
    try {
      await session.run(
        "CREATE CONSTRAINT transaction_hash_constraint IF NOT EXISTS FOR (t:Transaction) REQUIRE t.hash IS UNIQUE",
      );
      console.log("✅ [GRAPH IMPORT] Created constraints and indexes");
    } catch (error) {
      console.log("⚠️ [GRAPH IMPORT] Error creating constraints:", error);
      // Continue anyway, as older Neo4j versions might have different syntax
    }

    // 3. Create transaction nodes in batches
    const batchSize = 500;
    const transactionCount = transactions.length;
    let processedTx = 0;

    for (let i = 0; i < transactionCount; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      const batchParams = { transactions: batch };

      await session.run(
        `
        UNWIND $transactions AS tx
        MERGE (t:Transaction {hash: tx.hash})
        SET t.description = tx.description
        SET t += tx
        RETURN count(t) as created
        `,
        batchParams,
      );

      processedTx += batch.length;
      console.log(
        `✅ [GRAPH IMPORT] Created ${processedTx}/${transactionCount} transaction nodes`,
      );
    }

    // 4. Create relationships between transactions (if any)
    if (relationships.length > 0) {
      console.log(
        `🔗 [GRAPH IMPORT] Creating ${relationships.length} direct transaction relationships`,
      );

      // Process in batches
      let processedRel = 0;

      for (let i = 0; i < relationships.length; i += batchSize) {
        const batch = relationships.slice(i, i + batchSize);
        const batchParams = { relationships: batch };

        await session.run(
          `
          UNWIND $relationships AS rel
          MATCH (source:Transaction {hash: rel.source})
          MATCH (target:Transaction {hash: rel.target})
          MERGE (source)-[r:RELATED_TO]->(target)
          SET r += rel
          RETURN count(r) as created
          `,
          batchParams,
        );

        processedRel += batch.length;
        console.log(
          `✅ [GRAPH IMPORT] Created ${processedRel}/${relationships.length} transaction relationships`,
        );
      }
    }

    // 5. Get summary statistics
    const stats = await session.run(`
      MATCH (t:Transaction) WITH count(t) as txCount
      OPTIONAL MATCH ()-[r:RELATED_TO]->() WITH txCount, count(r) as relCount
      RETURN txCount, relCount
    `);

    const { txCount, relCount } = stats.records[0].toObject();

    // 6. Create embeddings file for Letta if requested
    const createEmbeddings =
      url.searchParams.get("createEmbeddings") === "true";

    if (createEmbeddings) {
      console.log(
        "📝 [GRAPH IMPORT] Preparing transaction descriptions for embedding",
      );

      // Generate the letta-ready format for transaction embeddings
      const embeddingData = transactions.map((tx) => ({
        hash: tx.hash,
        description: tx.description,
        fullLog: tx.fullLog || tx.description, // Use fullLog if available, otherwise description
      }));

      // Return with embedding data
      await session.close();
      return NextResponse.json({
        success: true,
        message: "Graph import completed successfully",
        statistics: {
          transactions: txCount.toNumber(),
          relationships: relCount.toNumber(),
        },
        embeddingData: embeddingData,
      });
    }

    await session.close();

    return NextResponse.json({
      success: true,
      message: "Graph import completed successfully",
      statistics: {
        transactions: txCount.toNumber(),
        relationships: relCount.toNumber(),
      },
    });
  } catch (error) {
    console.error(`❌ [GRAPH IMPORT] Error importing graph data:`, error);
    await session.close();
    return NextResponse.json(
      {
        error: "Failed to import graph data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
