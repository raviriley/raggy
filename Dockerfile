# Stage 1: Build Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /frontend
COPY chat-ui/ .
RUN npm install
RUN npm run build

# Stage 2: Build Backend
FROM ghcr.io/astral-sh/uv:python3.12-bookworm-slim AS backend-builder
WORKDIR /flare-ai-rag
COPY pyproject.toml README.md ./
COPY src ./src
RUN uv venv .venv && \
    . .venv/bin/activate && \
    uv pip install -e .

# Stage 2b: Build Letta
FROM ankane/pgvector:v0.5.1 AS letta-builder
# Install Python and required packages
RUN apt-get update && apt-get install -y \
    python3 \
    python3-venv \
    python3-pip \
    python3-full \
    build-essential \
    libpq-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

ARG LETTA_ENVIRONMENT=PRODUCTION
ENV LETTA_ENVIRONMENT=${LETTA_ENVIRONMENT} \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_VIRTUALENVS_CREATE=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

WORKDIR /app/letta
# Copy dependency files first
COPY letta/pyproject.toml letta/poetry.lock ./
# Then copy the rest of the application code
COPY letta/ ./

RUN python3 -m venv .venv && \
    . .venv/bin/activate && \
    pip install --no-cache-dir poetry==1.8.2 && \
    poetry lock --no-update && \
    poetry install --all-extras && \
    rm -rf $POETRY_CACHE_DIR

# Stage 3: Final Image
FROM ankane/pgvector:v0.5.1
# Install OS-level dependencies needed for Qdrant and other services
RUN apt-get update && \
    apt-get install -y \
    wget \
    tar \
    curl \
    nginx \
    supervisor \
    python3 \
    python3-venv \
    python3-pip \
    python3-full \
    && rm -rf /var/lib/apt/lists/*

ENV LANG=en_US.UTF-8
ENV LC_ALL=en_US.UTF-8

WORKDIR /app

# Create a virtual environment for uv
RUN python3 -m venv /opt/uv_venv
ENV PATH="/opt/uv_venv/bin:$PATH"

# Install uv in the virtual environments
RUN pip install uv

# Copy backend files
COPY --from=backend-builder /flare-ai-rag/.venv ./.venv
COPY --from=backend-builder /flare-ai-rag/src ./src
COPY --from=backend-builder /flare-ai-rag/pyproject.toml .
COPY --from=backend-builder /flare-ai-rag/README.md .

# Copy Letta files
COPY --from=letta-builder /app/letta /app/letta

# Download and install Qdrant binary
RUN wget https://github.com/qdrant/qdrant/releases/download/v1.13.4/qdrant-x86_64-unknown-linux-musl.tar.gz && \
    tar -xzf qdrant-x86_64-unknown-linux-musl.tar.gz && \
    mv qdrant /usr/local/bin/ && \
    rm qdrant-x86_64-unknown-linux-musl.tar.gz

# Make entrypoint executable
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

# Copy frontend files
COPY --from=frontend-builder /frontend/build /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/sites-enabled/default

# Setup supervisor configuration
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Create PostgreSQL initialization directory and default initialization SQL
RUN mkdir -p /docker-entrypoint-initdb.d && \
    echo "CREATE EXTENSION IF NOT EXISTS vector;" > /docker-entrypoint-initdb.d/init.sql

# Try to copy initialization SQL if it exists
COPY letta/init.sql /docker-entrypoint-initdb.d/

# Set Letta environment variables
ENV POSTGRES_USER=letta \
    POSTGRES_PASSWORD=letta \
    POSTGRES_DB=letta \
    LETTA_ENVIRONMENT=PRODUCTION \
    PATH="/app/letta/.venv/bin:$PATH" \
    COMPOSIO_DISABLE_VERSION_CHECK=true

# Allow workload operator to override environment variables
LABEL "tee.launch_policy.allow_env_override"="GEMINI_API_KEY"
LABEL "tee.launch_policy.log_redirect"="always"

# Ensure Letta startup script is executable
RUN if [ -f /app/letta/letta/server/startup.sh ]; then \
    chmod +x /app/letta/letta/server/startup.sh; \
    elif [ -f /app/letta/server/startup.sh ]; then \
    chmod +x /app/letta/server/startup.sh; \
    else \
    mkdir -p /app/letta/server && \
    echo '#!/bin/bash\necho "Letta server starting..."\ncd /app/letta && python -m letta.main' > /app/letta/server/startup.sh && \
    chmod +x /app/letta/server/startup.sh; \
    fi

EXPOSE 80 5432 8283

# Start supervisor (which will start nginx, the backend, and Letta)
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]