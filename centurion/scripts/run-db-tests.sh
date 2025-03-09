#!/bin/bash

# Check if the container is running
if ! docker ps | grep -q postgres-pgvector; then
  echo "Error: postgres-pgvector container is not running."
  echo "Please start it with: docker run -d --name postgres-pgvector -p 5432:5432 -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres pgvector/pgvector:pg17"
  exit 1
fi

# Set environment variables for database connection
# This explicitly uses password authentication for Docker
export POSTGRES_USER=raggy_user
export POSTGRES_PASSWORD=changeme
export POSTGRES_DB=raggy
export POSTGRES_HOST=localhost
export POSTGRES_PORT=5432
export PGPASSWORD=changeme  # This explicitly sets the password for psql

echo "Testing PostgreSQL connection with psql..."
docker exec -it postgres-pgvector psql -U raggy_user -d raggy -c "SELECT 1 as connection_test;"

echo "Running database connection test..."
npx tsx scripts/test-db-connection.ts

echo ""
echo "Running vector search test..."
npx tsx scripts/test-vector-search.ts

echo ""
echo "Running end-to-end test..."
npx tsx scripts/e2e-test.ts 