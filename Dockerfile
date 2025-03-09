# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /frontend
COPY centurion/ .
# Create a minimal .eslintrc.json to disable ESLint
RUN echo '{"extends": "next/core-web-vitals", "rules": {"@typescript-eslint/no-explicit-any": "off"}}' > .eslintrc.json
# Install pnpm
RUN npm install -g pnpm
# Install dependencies with pnpm
RUN pnpm install
# Next.js configuration is already set to output static files
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Set environment variables for database connection
ENV POSTGRES_USER=raggy_user
ENV POSTGRES_PASSWORD=changeme
ENV POSTGRES_DB=raggy
ENV POSTGRES_HOST=localhost
ENV POSTGRES_PORT=5432
# Install pg for PostgreSQL connection
RUN pnpm add pg
# Build the Next.js app
RUN pnpm run build

# Stage 2: Final Image with PostgreSQL + pgvector
FROM pgvector/pgvector:pg17

# Set PostgreSQL environment variables
# The initial postgres user is needed for database initialization
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=postgres
ENV POSTGRES_DB=postgres
ENV PGDATA=/var/lib/postgresql/data

# These variables will be used by our application
ENV RAGGY_USER=raggy_user
ENV RAGGY_PASSWORD=changeme
ENV RAGGY_DB=raggy

# Install nginx for serving the frontend
RUN apt-get update && \
    apt-get install -y \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

# Copy frontend files to nginx directory
COPY --from=frontend-builder /frontend/out /usr/share/nginx/html

# Copy configuration files
COPY nginx.conf /etc/nginx/sites-enabled/default
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY init-db.sql /docker-entrypoint-initdb.d/

# Copy entrypoint script
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# Allow workload operator to override environment variables
LABEL "tee.launch_policy.allow_env_override"="POSTGRES_PASSWORD"
LABEL "tee.launch_policy.log_redirect"="always"

# Expose ports for both PostgreSQL and nginx
EXPOSE 80 5432

# Start supervisor (which will start both nginx and PostgreSQL)
CMD ["/entrypoint.sh"]
