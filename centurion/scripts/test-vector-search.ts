import { Pool } from 'pg';

interface DocumentRow {
  id: number;
  title: string;
  content: string;
  similarity: number;
}

// Database connection configuration - directly using port-based connection
const pool = new Pool({
  // Use a direct connection string instead of individual parameters
  connectionString: 'postgresql://raggy_user:changeme@localhost:5432/raggy',
  // Explicitly set to use password authentication and disable SSL
  ssl: false
});

// Generate a random embedding for testing
function generateRandomEmbedding(dimensions: number = 1536): number[] {
  return Array.from({ length: dimensions }, () => Math.random());
}

// Format the embedding array as a proper pgvector string
function formatEmbeddingForPgvector(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

async function testVectorSearch() {
  try {
    // First, let's insert some test data
    console.log('Inserting test documents and embeddings...');
    
    // Insert a test document
    const docResult = await pool.query(
      'INSERT INTO documents(title, content, metadata) VALUES($1, $2, $3) RETURNING id',
      ['Test Document', 'This is a test document for vector search', { source: 'test' }]
    );
    
    const docId = docResult.rows[0].id;
    console.log(`Created test document with ID: ${docId}`);
    
    // Insert a test embedding - format the embedding array as a pgvector string
    const embedding = generateRandomEmbedding();
    const embeddingString = formatEmbeddingForPgvector(embedding);
    
    await pool.query(
      'INSERT INTO embeddings(document_id, embedding) VALUES($1, $2)',
      [docId, embeddingString]
    );
    console.log('Created test embedding');
    
    // Now test the vector search
    console.log('\nTesting vector similarity search...');
    const searchEmbedding = generateRandomEmbedding();
    const searchEmbeddingString = formatEmbeddingForPgvector(searchEmbedding);
    
    const query = `
      SELECT d.id, d.title, d.content, 
             1 - (e.embedding <=> $1) as similarity
      FROM documents d
      JOIN embeddings e ON d.id = e.document_id
      ORDER BY similarity DESC
      LIMIT 3;
    `;
    
    const result = await pool.query<DocumentRow>(query, [searchEmbeddingString]);
    
    if (result.rows.length > 0) {
      console.log('Vector search successful!');
      console.log('Results:');
      result.rows.forEach(row => {
        console.log(`- ${row.title}: ${row.similarity.toFixed(4)} similarity`);
      });
    } else {
      console.log('No results found from vector search.');
    }
    
    // Clean up test data
    console.log('\nCleaning up test data...');
    await pool.query('DELETE FROM documents WHERE id = $1', [docId]);
    console.log('Test data removed');
    
  } catch (err) {
    console.error('Vector search test error:', err);
  } finally {
    await pool.end();
  }
}

testVectorSearch(); 