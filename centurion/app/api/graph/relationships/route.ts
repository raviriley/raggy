import { NextRequest, NextResponse } from "next/server";
import { runQuery } from "@/lib/neo4j";

export async function POST(request: NextRequest) {
  try {
    const { sourceId, targetId, type, properties } = await request.json();

    if (!sourceId || !targetId || !type) {
      return NextResponse.json(
        { error: "Source ID, target ID, and relationship type are required" },
        { status: 400 },
      );
    }

    // Debug information
    console.log(`Creating relationship: ${sourceId} -[${type}]-> ${targetId}`);

    // Fix: Use elementId instead of ID() function for Neo4j 4.0+
    let cypher;
    if (Object.keys(properties || {}).length > 0) {
      const propsString = Object.keys(properties || {})
        .map((key) => `r.${key} = $${key}`)
        .join(", ");

      cypher = `
        MATCH (source) WHERE id(source) = $sourceId
        MATCH (target) WHERE id(target) = $targetId
        CREATE (source)-[r:${type}]->(target)
        SET ${propsString}
        RETURN source, r, target
      `;
    } else {
      cypher = `
        MATCH (source) WHERE id(source) = $sourceId
        MATCH (target) WHERE id(target) = $targetId
        CREATE (source)-[r:${type}]->(target)
        RETURN source, r, target
      `;
    }

    // Convert string IDs to integers
    const sourceIdInt = parseInt(sourceId);
    const targetIdInt = parseInt(targetId);

    console.log(`Using IDs: source=${sourceIdInt}, target=${targetIdInt}`);

    const result = await runQuery(cypher, {
      sourceId: sourceIdInt,
      targetId: targetIdInt,
      ...properties,
    });

    if (result.length === 0) {
      return NextResponse.json(
        {
          error: "Source or target node not found",
          query: cypher,
          params: { sourceId: sourceIdInt, targetId: targetIdInt },
        },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
      relationship: {
        source: result[0].source,
        relationship: result[0].r,
        target: result[0].target,
      },
    });
  } catch (error) {
    console.error("Error creating relationship:", error);
    return NextResponse.json(
      {
        error: "Failed to create relationship",
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type");

    let cypher = "MATCH (a)-[r]->(b)";
    if (type) {
      cypher = `MATCH (a)-[r:${type}]->(b)`;
    }
    cypher += " RETURN a, r, b LIMIT 100";

    const result = await runQuery(cypher);

    return NextResponse.json({
      relationships: result.map((record) => ({
        source: record.a,
        relationship: record.r,
        target: record.b,
      })),
    });
  } catch (error) {
    console.error("Error fetching relationships:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch relationships",
        details: (error as Error).message,
      },
      { status: 500 },
    );
  }
}
