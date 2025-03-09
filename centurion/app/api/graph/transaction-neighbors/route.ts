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

export async function GET(request: NextRequest) {
  console.log("📋 [GRAPH] Request received for transaction neighbors");

  // Get transaction hash from query parameters
  const url = new URL(request.url);
  const hash = url.searchParams.get("hash");

  if (!hash) {
    console.log("❌ [GRAPH] No transaction hash provided");
    return NextResponse.json(
      { error: "Transaction hash is required" },
      { status: 400 },
    );
  }

  console.log(`🔍 [GRAPH] Looking up neighbors for transaction: ${hash}`);

  const session = driver.session();

  try {
    // 1. Get the transaction details using Cypher
    const transactionResult = await session.run(
      `MATCH (t:Transaction {hash: $hash}) 
       RETURN t`,
      { hash },
    );

    if (transactionResult.records.length === 0) {
      console.log(`❌ [GRAPH] Transaction not found: ${hash}`);
      await session.close();
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 },
      );
    }

    const transaction = transactionResult.records[0].get("t").properties;
    console.log(`✅ [GRAPH] Found transaction: ${hash}`);

    // 2. Get directly connected transactions (RELATED_TO relationships)
    const relationshipsResult = await session.run(
      `MATCH (t:Transaction {hash: $hash})-[r:RELATED_TO]-(neighbor:Transaction)
       RETURN r, neighbor.hash as connected_hash, neighbor.description as connected_description, 
              CASE WHEN startNode(r).hash = $hash THEN 'outgoing' ELSE 'incoming' END as direction`,
      { hash },
    );

    const relationships = relationshipsResult.records.map((record) => ({
      sourceHash: hash,
      targetHash: record.get("connected_hash"),
      direction: record.get("direction"),
      ...record.get("r").properties,
    }));

    console.log(
      `✅ [GRAPH] Found ${relationships.length} relationships for transaction ${hash}`,
    );

    // 3. Extract neighbors
    const neighborDetails = [];

    for (const record of relationshipsResult.records) {
      const neighborHash = record.get("connected_hash");
      const neighborDescription = record.get("connected_description");
      const direction = record.get("direction");

      // Get all relationships for this neighbor
      const neighborRelationshipsResult = await session.run(
        `MATCH (t:Transaction {hash: $hash})-[r:RELATED_TO]-(neighbor:Transaction)
         RETURN count(r) as relationshipCount`,
        { hash: neighborHash },
      );

      const relationshipCount = neighborRelationshipsResult.records[0]
        .get("relationshipCount")
        .toNumber();

      neighborDetails.push({
        hash: neighborHash,
        description: neighborDescription,
        type: "transaction",
        relationshipCount,
        direction,
        connectedVia: record.get("r").properties,
      });
    }

    await session.close();

    return NextResponse.json({
      success: true,
      transaction,
      relationships,
      neighbors: neighborDetails,
    });
  } catch (error) {
    console.error(`❌ [GRAPH] Error fetching transaction neighbors:`, error);
    await session.close();
    return NextResponse.json(
      {
        error: "Failed to fetch transaction neighbors",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
