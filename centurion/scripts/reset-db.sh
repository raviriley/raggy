#!/bin/bash

# Stop and remove existing container
echo "Stopping and removing existing container..."
docker stop postgres-pgvector || true
docker rm postgres-pgvector || true

# Start a fresh container
echo "Starting fresh PostgreSQL container with pgvector..."
docker run -d --name postgres-pgvector \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=postgres \
  -p 5432:5432 \
  pgvector/pgvector:pg17

# Wait for PostgreSQL to start
echo "Waiting for PostgreSQL to initialize..."
sleep 5
until docker exec postgres-pgvector pg_isready -U postgres; do
  echo "PostgreSQL is starting up. Waiting..."
  sleep 2
done

# Copy and run init script
echo "Initializing database schema..."
docker cp init-db.sql postgres-pgvector:/tmp/
docker exec -it postgres-pgvector psql -U postgres -f /tmp/init-db.sql

echo "Testing connection as raggy_user..."
docker exec -it postgres-pgvector psql -U raggy_user -d raggy -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
docker exec -it postgres-pgvector psql -U raggy_user -d raggy -c "SELECT '[1,2,3]'::vector <=> '[4,5,6]'::vector as similarity;"

echo "Database reset and initialized successfully!" 