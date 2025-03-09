import { Pool } from 'pg';
import { findRelevantContent } from '../lib/actions/rag';

// Database connection configuration - directly using port-based connection
const pool = new Pool({
  // Use a direct connection string instead of individual parameters
  connectionString: 'postgresql://raggy_user:changeme@localhost:5432/raggy',
  // Explicitly set to use password authentication and disable SSL
  ssl: false
});

// Random embedding generator (placeholder)
function generateRandomEmbedding(dimensions: number = 1536): number[] {
  return Array.from({ length: dimensions }, () => Math.random());
}

// Format the embedding array as a proper pgvector string
function formatEmbeddingForPgvector(embedding: number[]): string {
  return `[${embedding.join(',')}]`;
}

async function runE2ETest() {
  try {
    console.log('Starting end-to-end test...');
    
    // Step 1: Clear existing test data
    console.log('Cleaning up any existing test data...');
    await pool.query(`
      DELETE FROM documents 
      WHERE title LIKE 'Test Document%'
    `);
    
    // Step 2: Insert test documents with embeddings
    console.log('Inserting test documents...');
    
    const testDocs = [
      {
        title: 'Test Document 1',
        content: 'This is a test document about blockchain and cryptocurrencies.'
      },
      {
        title: 'Test Document 2',
        content: 'Flare Network provides Oracle services and cross-chain interoperability.'
      },
      {
        title: 'Test Document 3',
        content: 'Vector databases are used for similarity search in RAG applications.'
      }
    ];
    
    for (const doc of testDocs) {
      // Insert document
      const docResult = await pool.query(
        'INSERT INTO documents(title, content, metadata) VALUES($1, $2, $3) RETURNING id',
        [doc.title, doc.content, { source: 'e2e-test' }]
      );
      
      const docId = docResult.rows[0].id;
      
      // Insert embedding for document
      const embedding = generateRandomEmbedding();
      const embeddingString = formatEmbeddingForPgvector(embedding);
      
      await pool.query(
        'INSERT INTO embeddings(document_id, embedding) VALUES($1, $2)',
        [docId, embeddingString]
      );
      
      console.log(`Created ${doc.title} with ID: ${docId}`);
    }
    
    // Step 3: Test findRelevantContent function
    console.log('\nTesting findRelevantContent function...');
    
    const testQueries = [
      'Tell me about blockchains',
      'What is Flare Network?',
      'How do vector databases work?'
    ];
    
    for (const query of testQueries) {
      console.log(`\nQuery: "${query}"`);
      const result = await findRelevantContent(query);
      console.log('Result:');
      console.log(result);
    }
    
    console.log('\nEnd-to-end test completed successfully!');
    
  } catch (err) {
    console.error('Error during E2E test:', err);
  } finally {
    await pool.end();
  }
}

runE2ETest(); 