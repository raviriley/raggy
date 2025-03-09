import { Pool } from 'pg';

// Database connection configuration - directly using port-based connection
const pool = new Pool({
  // Use a direct connection string instead of individual parameters
  connectionString: 'postgresql://raggy_user:changeme@localhost:5432/raggy',
  // Explicitly set to use password authentication and disable SSL
  ssl: false
});

async function testConnection() {
  try {
    // Test basic connection
    const res = await pool.query('SELECT version()');
    console.log('PostgreSQL connection successful!');
    console.log('PostgreSQL version:', res.rows[0].version);
    
    // Test pgvector extension
    const vectorRes = await pool.query('SELECT * FROM pg_extension WHERE extname = $1', ['vector']);
    if (vectorRes.rows.length > 0) {
      console.log('pgvector extension is installed!');
    } else {
      console.error('pgvector extension is NOT installed!');
    }
    
    // Check if our tables exist
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('documents', 'embeddings')
    `);
    
    console.log('Found tables:', tablesRes.rows.map((row: { table_name: string }) => row.table_name).join(', ') || 'None');
    
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await pool.end();
  }
}

testConnection(); 