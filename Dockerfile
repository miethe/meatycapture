# ============================================================================
# MeatyCapture Bun Server - Multi-Stage Production Dockerfile
# ============================================================================
#
# Optimized Docker image for running the MeatyCapture REST API server.
# Uses multi-stage build for minimal final image size and security best practices.
#
# Build arguments:
#   - BUN_VERSION: Bun runtime version (default: 1)
#   - PORT: HTTP server port (default: 3001)
#
# Environment variables at runtime:
#   - PORT: HTTP listening port (default: 3737, override with 3001 for container)
#   - MEATYCAPTURE_DATA_DIR: Base data directory (default: /data)
#   - NODE_ENV: Environment mode (default: production)
#   - LOG_LEVEL: Logging verbosity (debug | info | warn | error)
#
# Usage:
#   docker build -t meatycapture-server .
#   docker run -p 3001:3001 -v $(pwd)/data:/data meatycapture-server
# ============================================================================

# ----------------------------------------------------------------------------
# Stage 1: Dependencies
# Install production dependencies with frozen lockfile for reproducibility
# ----------------------------------------------------------------------------
FROM oven/bun:1 AS deps

WORKDIR /app

# Copy package manager files for dependency installation
# Using pnpm since package.json specifies it as packageManager
COPY package.json pnpm-lock.yaml ./

# Install pnpm globally (Bun includes npm, but we need pnpm for this project)
RUN npm install -g pnpm@8.15.0

# Install dependencies with frozen lockfile (no modifications to lockfile)
# --prod flag installs only production dependencies
RUN pnpm install --frozen-lockfile --prod

# ----------------------------------------------------------------------------
# Stage 2: Builder
# Copy source code and prepare for production runtime
# ----------------------------------------------------------------------------
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy dependencies from deps stage
COPY --from=deps /app/node_modules ./node_modules

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Copy TypeScript configuration
COPY tsconfig.json ./

# Copy only necessary source directories
# Following the structure: core (domain logic) -> adapters -> server
COPY src/core ./src/core
COPY src/adapters ./src/adapters
COPY src/platform ./src/platform
COPY src/server ./src/server
COPY src/types ./src/types

# No build step needed - Bun can run TypeScript directly
# This keeps the image lean and startup fast

# ----------------------------------------------------------------------------
# Stage 3: Production Runtime
# Minimal final image with only runtime dependencies
# ----------------------------------------------------------------------------
FROM oven/bun:1-slim AS runtime

# Install dumb-init for proper signal handling
# This ensures graceful shutdown works correctly in containers
RUN apt-get update && \
    apt-get install -y --no-install-recommends dumb-init && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create non-root user for security
# UID 1001 is commonly used for application users in containers
RUN groupadd -r -g 1001 meatycapture && \
    useradd -r -u 1001 -g meatycapture meatycapture && \
    mkdir -p /data && \
    chown -R meatycapture:meatycapture /app /data

# Copy dependencies and source from builder stage
COPY --from=builder --chown=meatycapture:meatycapture /app/node_modules ./node_modules
COPY --from=builder --chown=meatycapture:meatycapture /app/package.json ./
COPY --from=builder --chown=meatycapture:meatycapture /app/tsconfig.json ./
COPY --from=builder --chown=meatycapture:meatycapture /app/src ./src

# Switch to non-root user
USER meatycapture

# Set production environment variables
ENV NODE_ENV=production \
    PORT=3001 \
    MEATYCAPTURE_DATA_DIR=/data

# Expose server port
# Default 3001 for container (3737 is dev default, but 3001 is more standard for APIs)
EXPOSE 3001

# Add metadata labels following OCI image spec
LABEL org.opencontainers.image.title="MeatyCapture Server" \
      org.opencontainers.image.description="Bun-based REST API server for MeatyCapture request-log management" \
      org.opencontainers.image.version="0.1.0" \
      org.opencontainers.image.vendor="MeatyCapture" \
      org.opencontainers.image.licenses="MIT" \
      org.opencontainers.image.source="https://github.com/yourusername/meatycapture" \
      maintainer="MeatyCapture Team"

# Health check using the /health endpoint
# Start checking after 10s, check every 30s, timeout after 5s, 3 retries before unhealthy
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD bun run -e "fetch('http://localhost:3001/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Use dumb-init to handle signals properly (PID 1 problem)
# This ensures SIGTERM/SIGINT are forwarded correctly to Bun
ENTRYPOINT ["dumb-init", "--"]

# Run the server using Bun's native TypeScript execution
# No transpilation needed - Bun handles .ts files directly
CMD ["bun", "run", "src/server/index.ts"]
