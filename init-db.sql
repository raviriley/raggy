-- Create our application database
CREATE DATABASE raggy;

-- Connect to the raggy database
\c raggy

-- Enable pgvector extension in the raggy database
CREATE EXTENSION IF NOT EXISTS vector;

-- Create application user with same credentials as in Dockerfile
CREATE USER raggy_user WITH PASSWORD 'changeme';
GRANT ALL PRIVILEGES ON DATABASE raggy TO raggy_user;

-- Create documents table
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create embeddings table with vector support
CREATE TABLE embeddings (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    embedding vector(1536),  -- Adjust dimension based on your embedding model
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on the embedding vector for similarity search
CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create attestations table for tool and RAG operation tracking
CREATE TABLE IF NOT EXISTS attestations (
  id VARCHAR(36) PRIMARY KEY,
  tool_name VARCHAR(100) NOT NULL,
  action_type VARCHAR(100) NOT NULL,
  query TEXT,
  result TEXT,
  metadata JSONB,
  timestamp TIMESTAMP NOT NULL
);

-- Create indexes for faster attestation queries
CREATE INDEX IF NOT EXISTS idx_attestations_tool_name ON attestations(tool_name);
CREATE INDEX IF NOT EXISTS idx_attestations_action_type ON attestations(action_type);
CREATE INDEX IF NOT EXISTS idx_attestations_timestamp ON attestations(timestamp);

-- Grant privileges to the application user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO raggy_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO raggy_user; 