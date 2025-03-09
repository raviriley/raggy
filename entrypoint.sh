#!/bin/bash

# This script ensures all services start properly

# Wait for PostgreSQL to be ready
wait_for_postgres() {
  echo "Waiting for PostgreSQL to start..."
  until pg_isready -h localhost -p 5432 -U postgres > /dev/null 2>&1; do
    echo "PostgreSQL is not ready yet, waiting..."
    sleep 3
  done
  echo "PostgreSQL is up and running!"
}

# Start supervisord which will manage both nginx and PostgreSQL
echo "Starting supervisord..."
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf
