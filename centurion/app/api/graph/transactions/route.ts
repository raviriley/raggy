import { NextRequest, NextResponse } from "next/server";
import { runQuery } from "@/lib/neo4j";

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();

    // Validate required fields
    if (!data.hash) {
      return NextResponse.json(
        { error: "Transaction hash is required" },
        { status: 400 },
      );
    }

    // Create a node with the Transaction label and hash as unique identifier
    const cypher = `
      MERGE (t:Transaction {hash: $hash})
      SET t.fullLog = $fullLog,
          t.description = $description,
          t.createdAt = datetime()
      RETURN t
    `;

    const result = await runQuery(cypher, {
      hash: data.hash,
      fullLog: data.fullLog || "",
      description: data.description || "",
    });

    return NextResponse.json({
      success: true,
      transaction: result[0]?.t || null,
    });
  } catch (error) {
    console.error("Error creating transaction node:", error);
    return NextResponse.json(
      {
        error: "Failed to create transaction node",
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const hash = searchParams.get("hash");

    let cypher;
    if (hash) {
      cypher = `MATCH (t:Transaction {hash: $hash}) RETURN t`;
      const result = await runQuery(cypher, { hash });

      if (result.length === 0) {
        return NextResponse.json(
          { error: "Transaction not found" },
          { status: 404 },
        );
      }

      return NextResponse.json({ transaction: result[0].t });
    } else {
      cypher = `MATCH (t:Transaction) RETURN t ORDER BY t.createdAt DESC LIMIT 100`;
      const result = await runQuery(cypher);

      return NextResponse.json({
        transactions: result.map((record) => record.t),
      });
    }
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch transactions",
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
