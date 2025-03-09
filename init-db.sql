-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create our application database
CREATE DATABASE raggy;
\c raggy

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
    embedding VECTOR(1536),  -- Adjust dimension based on your embedding model
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create an index on the embedding vector for similarity search
CREATE INDEX ON embeddings USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Grant privileges to the application user
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO raggy_user;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO raggy_user; 