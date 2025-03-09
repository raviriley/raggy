import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  console.log('📋 [GRAPH] Request received for transaction relationships');
  
  // Get transaction hash from query parameters
  const url = new URL(request.url);
  const hash = url.searchParams.get('hash');
  
  if (!hash) {
    console.log('❌ [GRAPH] No transaction hash provided');
    return NextResponse.json(
      { error: 'Transaction hash is required' },
      { status: 400 }
    );
  }
  
  console.log(`🔍 [GRAPH] Looking up relationships for transaction: ${hash}`);
  
  try {
    // Query the database for relationships involving this transaction
    const result = await sql`
      SELECT r.* 
      FROM relationships r
      JOIN transactions t ON r.transaction_hash = t.hash
      WHERE t.hash = ${hash}
    `;
    
    console.log(`✅ [GRAPH] Found ${result.rows.length} relationships for transaction ${hash}`);
    
    return NextResponse.json({
      success: true,
      transactionHash: hash,
      relationshipCount: result.rows.length,
      relationships: result.rows
    });
    
  } catch (error) {
    console.error(`❌ [GRAPH] Error fetching relationships:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch transaction relationships', details: (error as Error).message },
      { status: 500 }
    );
  }
} 