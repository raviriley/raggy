import { NextRequest, NextResponse } from 'next/server';
import { runQuery } from '@/lib/neo4j';

export async function POST(request: NextRequest) {
  try {
    const { label, properties } = await request.json();
    
    if (!label) {
      return NextResponse.json(
        { error: 'Node label is required' },
        { status: 400 }
      );
    }

    // Fix: The issue is in the Cypher query syntax
    // We need to separate CREATE and SET with a newline or space
    let cypher;
    if (Object.keys(properties || {}).length > 0) {
      // If there are properties, use CREATE and then SET
      const propsString = Object.keys(properties || {})
        .map(key => `n.${key} = $${key}`)
        .join(', ');
      
      cypher = `
        CREATE (n:${label})
        SET ${propsString}
        RETURN n
      `;
    } else {
      // If no properties, just CREATE
      cypher = `
        CREATE (n:${label})
        RETURN n
      `;
    }
    
    const result = await runQuery(cypher, properties || {});
    
    return NextResponse.json({ success: true, node: result[0]?.n || null });
  } catch (error) {
    console.error('Error creating node:', error);
    return NextResponse.json(
      { error: 'Failed to create node', details: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const label = searchParams.get('label');
    
    let cypher = 'MATCH (n)';
    if (label) {
      cypher = `MATCH (n:${label})`;
    }
    cypher += ' RETURN n LIMIT 100';
    
    const result = await runQuery(cypher);
    
    return NextResponse.json({ nodes: result.map(record => record.n) });
  } catch (error) {
    console.error('Error fetching nodes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nodes', details: (error as Error).message },
      { status: 500 }
    );
  }
} 