# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /frontend
COPY centurion/ .
# Create a minimal .eslintrc.json to disable ESLint
RUN echo '{"extends": "next/core-web-vitals", "rules": {"@typescript-eslint/no-explicit-any": "off"}}' > .eslintrc.json
RUN npm install
# Next.js configuration is already set to output static files
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
# Build the Next.js app
RUN npm run build

# Stage 2: Build Backend
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS backend-builder
WORKDIR /flare-ai-rag
COPY pyproject.toml README.md ./
COPY src ./src
RUN uv venv .venv && \
    . .venv/bin/activate && \
    uv pip install -e .

# Stage 3: Final Image
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim
# Install OS-level dependencies needed for Qdrant
RUN apt-get update && \
    apt-get install -y \
    wget \
    tar \
    curl \
    nginx \
    supervisor \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY --from=backend-builder /flare-ai-rag/.venv ./.venv
COPY --from=backend-builder /flare-ai-rag/src ./src
COPY --from=backend-builder /flare-ai-rag/pyproject.toml .
COPY --from=backend-builder /flare-ai-rag/README.md .

# Download and install Qdrant binary
RUN wget https://github.com/qdrant/qdrant/releases/download/v1.13.4/qdrant-x86_64-unknown-linux-musl.tar.gz && \
    tar -xzf qdrant-x86_64-unknown-linux-musl.tar.gz && \
    mv qdrant /usr/local/bin/ && \
    rm qdrant-x86_64-unknown-linux-musl.tar.gz

# Make entrypoint executable
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Copy frontend files - Next.js static export goes to the 'out' directory
COPY --from=frontend-builder /frontend/out /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/sites-enabled/default

# Setup supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Allow workload operator to override environment variables
LABEL "tee.launch_policy.allow_env_override"="OPENAI_API_KEY"
LABEL "tee.launch_policy.log_redirect"="always"

EXPOSE 80

# Start supervisor (which will start both nginx and the backend)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
