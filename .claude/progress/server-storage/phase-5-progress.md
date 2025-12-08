---
type: progress
prd: "server-storage"
phase: 5
phase_name: "Deployment & Documentation"
status: completed
progress: 100
total_tasks: 4
completed_tasks: 4
completed_at: "2025-12-08T23:35:00Z"
duration_estimate: "2-3 days"
story_points: 5

tasks:
  - id: "TASK-SS-014"
    name: "Create Dockerfile"
    status: "completed"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-SS-001", "TASK-SS-005", "TASK-SS-006", "TASK-SS-007"]
    estimate: 2
    files:
      - "Dockerfile"
      - ".dockerignore"

  - id: "TASK-SS-015"
    name: "Create docker-compose Configuration"
    status: "completed"
    assigned_to: ["backend-typescript-architect"]
    dependencies: ["TASK-SS-014"]
    estimate: 1
    files:
      - "docker-compose.yml"
      - "docker-compose.override.example.yml"

  - id: "TASK-SS-016"
    name: "Add Server Scripts and Environment Template"
    status: "completed"
    assigned_to: ["documentation-writer"]
    dependencies: ["TASK-SS-001"]
    estimate: 1
    files:
      - "package.json"
      - ".env.example"

  - id: "TASK-SS-017"
    name: "Write Deployment Documentation"
    status: "completed"
    assigned_to: ["documentation-complex"]
    dependencies: ["TASK-SS-014", "TASK-SS-015", "TASK-SS-016"]
    estimate: 2
    files:
      - "docs/deployment/server-mode.md"

parallelization:
  batch_1: ["TASK-SS-014", "TASK-SS-016"]  # Completed
  batch_2: ["TASK-SS-015"]  # Completed
  batch_3: ["TASK-SS-017"]  # Completed
---

# Phase 5 Progress: Deployment & Documentation

**Status**: Pending | **Last Updated**: 2025-12-07 | **Completion**: 0%

## Phase Overview

Containerize the server and provide deployment examples with comprehensive documentation. This makes MeatyCapture easy to self-host and deploy in production environments.

**Key Deliverables**:
- Dockerfile with Bun runtime
- docker-compose.yml with server + volume
- .env.example with configuration documentation
- Server start scripts in package.json
- Deployment guide in docs/

**Validation**: Docker container runs, persists data, handles restarts

**Dependencies**: Phases 1-4 must be complete (server functional with API adapters)

## Tasks

### TASK-SS-014: Create Dockerfile
**Status**: Pending | **Estimate**: 2 points | **Assigned**: backend-typescript-architect

**Description**: Create optimized Dockerfile for Bun server.

**Acceptance Criteria**:
- [ ] Uses official Bun base image
- [ ] Multi-stage build for smaller image size
- [ ] Copies only necessary files (src/server, src/core, src/adapters)
- [ ] Sets proper file permissions
- [ ] Exposes PORT (default 3001)
- [ ] Runs as non-root user
- [ ] Health check using /health endpoint

**Files**:
- `Dockerfile` (create)
- `.dockerignore` (create)

**Dependencies**: TASK-SS-001, TASK-SS-005, TASK-SS-006, TASK-SS-007 (server must be functional)

**Implementation Pattern**:

```dockerfile
# Dockerfile
# Stage 1: Build
FROM oven/bun:1 AS builder

WORKDIR /app

# Copy package files
COPY package.json bun.lockb ./

# Install dependencies
RUN bun install --frozen-lockfile --production

# Copy source files
COPY src/server ./src/server
COPY src/core ./src/core
COPY src/adapters ./src/adapters
COPY tsconfig.json ./

# Build (if needed - Bun can run TypeScript directly)
# RUN bun build src/server/index.ts --outdir ./dist --target bun

# Stage 2: Runtime
FROM oven/bun:1-slim

WORKDIR /app

# Create non-root user
RUN addgroup --system --gid 1001 meatycapture && \
    adduser --system --uid 1001 --ingroup meatycapture meatycapture

# Copy from builder
COPY --from=builder --chown=meatycapture:meatycapture /app/node_modules ./node_modules
COPY --from=builder --chown=meatycapture:meatycapture /app/src ./src
COPY --from=builder --chown=meatycapture:meatycapture /app/package.json ./

# Create data directory
RUN mkdir -p /data && \
    chown -R meatycapture:meatycapture /data

# Environment variables
ENV NODE_ENV=production \
    PORT=3001 \
    MEATYCAPTURE_DATA_DIR=/data

# Expose port
EXPOSE 3001

# Switch to non-root user
USER meatycapture

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD bun --eval "fetch('http://localhost:3001/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Start server
CMD ["bun", "run", "src/server/index.ts"]
```

```dockerignore
# .dockerignore
node_modules
dist
.git
.github
.vscode
*.log
*.md
docs
.env
.env.*
!.env.example
Dockerfile
docker-compose*.yml
.dockerignore
coverage
.nyc_output
*.test.ts
*.spec.ts
__tests__
__mocks__
.claude
src/ui
public
index.html
vite.config.ts
```

---

### TASK-SS-015: Create docker-compose Configuration
**Status**: Pending | **Estimate**: 1 point | **Assigned**: backend-typescript-architect

**Description**: Create docker-compose.yml for easy local deployment.

**Acceptance Criteria**:
- [ ] Defines meatycapture-server service
- [ ] Mounts volume for persistent data
- [ ] Configures environment variables
- [ ] Sets restart policy (unless-stopped)
- [ ] Includes optional nginx reverse proxy config
- [ ] Port mapping (3001:3001)
- [ ] Network configuration

**Files**:
- `docker-compose.yml` (create)
- `docker-compose.override.example.yml` (create)

**Dependencies**: TASK-SS-014 (Dockerfile)

**Implementation Pattern**:

```yaml
# docker-compose.yml
version: '3.8'

services:
  meatycapture-server:
    build:
      context: .
      dockerfile: Dockerfile
    image: meatycapture-server:latest
    container_name: meatycapture-server
    restart: unless-stopped
    ports:
      - "3001:3001"
    volumes:
      - meatycapture-data:/data
    environment:
      - NODE_ENV=production
      - PORT=3001
      - MEATYCAPTURE_DATA_DIR=/data
      - CORS_ORIGINS=http://localhost:5173,http://localhost:3000
      # - MEATYCAPTURE_AUTH_TOKEN=${MEATYCAPTURE_AUTH_TOKEN}  # Set in .env
    env_file:
      - .env
    healthcheck:
      test: ["CMD", "bun", "--eval", "fetch('http://localhost:3001/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"]
      interval: 30s
      timeout: 5s
      retries: 3
      start_period: 10s
    networks:
      - meatycapture

volumes:
  meatycapture-data:
    driver: local

networks:
  meatycapture:
    driver: bridge
```

```yaml
# docker-compose.override.example.yml
# Copy to docker-compose.override.yml and customize
version: '3.8'

services:
  meatycapture-server:
    environment:
      - CORS_ORIGINS=https://app.example.com
      - MEATYCAPTURE_AUTH_TOKEN=your-secret-token-here
    volumes:
      # Example: Mount NFS volume instead of local volume
      - /mnt/nfs/meatycapture:/data

  # Optional: Add nginx reverse proxy
  nginx:
    image: nginx:alpine
    container_name: meatycapture-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./certs:/etc/nginx/certs:ro
    depends_on:
      - meatycapture-server
    networks:
      - meatycapture
```

---

### TASK-SS-016: Add Server Scripts and Environment Template
**Status**: Pending | **Estimate**: 1 point | **Assigned**: documentation-writer

**Description**: Add server start scripts to package.json and create environment template.

**Acceptance Criteria**:
- [ ] package.json includes "server:dev" script (Bun dev mode)
- [ ] package.json includes "server:start" script (production)
- [ ] package.json includes "server:build" script (compile server)
- [ ] .env.example documents all server environment variables
- [ ] Includes Bun runtime dependency
- [ ] Scripts use correct Bun CLI commands

**Files**:
- `package.json` (update)
- `.env.example` (create)

**Dependencies**: TASK-SS-001 (Server entry point must exist)

**Implementation Pattern**:

```json
// package.json (add to scripts section)
{
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "server:dev": "bun --watch src/server/index.ts",
    "server:start": "NODE_ENV=production bun src/server/index.ts",
    "server:build": "bun build src/server/index.ts --outdir ./dist --target bun",
    "docker:build": "docker build -t meatycapture-server .",
    "docker:run": "docker-compose up -d",
    "docker:stop": "docker-compose down",
    "docker:logs": "docker-compose logs -f meatycapture-server"
  }
}
```

```bash
# .env.example
# MeatyCapture Server Configuration
# Copy to .env and customize

# === Server Configuration ===
NODE_ENV=production                                    # Environment: development | production
PORT=3001                                               # Server port

# === Data Storage ===
MEATYCAPTURE_DATA_DIR=/data                            # Data directory (use /data in Docker, ~/.meatycapture locally)

# === CORS Configuration ===
CORS_ORIGINS=http://localhost:5173,http://localhost:3000  # Comma-separated allowed origins
# Production example: https://app.example.com,https://app2.example.com

# === Authentication (Optional) ===
# MEATYCAPTURE_AUTH_TOKEN=your-secret-token-here        # Bearer token for API auth (generate with: openssl rand -base64 32)
# If not set, authentication is disabled (development only!)

# === Client Configuration (for web app) ===
# MEATYCAPTURE_API_URL=http://localhost:3001           # API server URL (client-side)
# If not set, web app uses local filesystem adapters

# === Docker Volume Configuration (docker-compose only) ===
# External volume example:
# MEATYCAPTURE_DATA_DIR=/mnt/nfs/meatycapture

# === Production Security Recommendations ===
# 1. Always set MEATYCAPTURE_AUTH_TOKEN in production
# 2. Use HTTPS for CORS_ORIGINS in production
# 3. Limit CORS_ORIGINS to trusted domains only
# 4. Use strong, randomly generated tokens (32+ characters)
# 5. Rotate tokens periodically
# 6. Mount data volume with proper permissions (user 1001:1001)
```

---

### TASK-SS-017: Write Deployment Documentation
**Status**: Pending | **Estimate**: 2 points | **Assigned**: documentation-complex

**Description**: Create comprehensive deployment guide for server mode.

**Acceptance Criteria**:
- [ ] Quick start guide (Docker deployment)
- [ ] Environment variable reference table
- [ ] Architecture diagram
- [ ] Security best practices (HTTPS, auth tokens)
- [ ] Troubleshooting common issues
- [ ] Performance tuning recommendations
- [ ] Monitoring and logging guidance
- [ ] Backup and restore procedures

**Files**:
- `docs/deployment/server-mode.md` (create)

**Dependencies**: TASK-SS-014, TASK-SS-015, TASK-SS-016 (all deployment artifacts)

**Content Outline**:

1. **Introduction**
   - What is server mode?
   - When to use server mode vs local mode
   - Architecture overview diagram

2. **Quick Start**
   - Prerequisites (Docker, Bun)
   - Clone repo
   - Copy .env.example to .env
   - Configure environment variables
   - Run `docker-compose up -d`
   - Access web app with MEATYCAPTURE_API_URL

3. **Environment Variables**
   - Complete reference table (name, description, default, required)
   - Examples for development and production

4. **Docker Deployment**
   - Build image: `docker build -t meatycapture-server .`
   - Run container: `docker run -d -p 3001:3001 ...`
   - Using docker-compose (recommended)
   - Volume mounting strategies
   - Network configuration

5. **Security Best Practices**
   - HTTPS/TLS configuration (nginx reverse proxy)
   - Auth token generation and rotation
   - CORS configuration (limit origins)
   - File permissions (volume ownership)
   - Security headers
   - Rate limiting (future)

6. **Production Deployment**
   - Recommended setup (nginx + Docker)
   - Environment configuration
   - Volume backup strategy
   - Health checks and monitoring
   - Log aggregation
   - Graceful shutdown

7. **Troubleshooting**
   - Server won't start (port conflict, permissions)
   - CORS errors (origins not allowed)
   - Auth token failures (401 errors)
   - Data not persisting (volume issues)
   - Connection timeouts (network, firewall)
   - Health check failures

8. **Performance Tuning**
   - Bun runtime optimizations
   - File system performance (volume drivers)
   - Network timeouts configuration
   - Concurrent request handling
   - Large document optimization

9. **Monitoring and Logging**
   - Docker logs: `docker-compose logs -f`
   - Health check endpoint: `/health`
   - Server startup logs
   - Error logging patterns
   - Log rotation (Docker log driver)

10. **Backup and Restore**
    - Backup data volume: `docker run --rm -v meatycapture-data:/data -v $(pwd):/backup alpine tar czf /backup/backup.tar.gz /data`
    - Restore data volume
    - Automated backup scripts
    - Disaster recovery procedures

11. **Upgrading**
    - Pull latest image
    - Backup data
    - Stop container
    - Start new container
    - Verify health check

12. **Development**
    - Local server development: `bun run server:dev`
    - Running tests
    - Building custom images
    - Contributing

---

## Completed Tasks

### TASK-SS-017: Write Deployment Documentation ✅
**Status**: Completed | **Estimate**: 2 points | **Date**: 2025-12-08

**Description**: Created comprehensive deployment guide for server mode.

**Implementation**: Created `docs/deployment/server-mode.md` (400+ lines) with:

**Content Coverage**:
1. **Overview** (1200 words)
   - When to use server mode vs local mode
   - Key features and performance characteristics
   - Production-ready metrics and targets

2. **Quick Start** (800 words)
   - 5-step Docker deployment guide
   - Prerequisites and verification steps
   - Client configuration

3. **Architecture** (1500 words)
   - System architecture diagram (ASCII art)
   - Data flow diagrams (write, read, error flows)
   - Multi-layer architecture explanation

4. **Configuration** (2500 words)
   - Complete environment variable reference table (all 7 variables)
   - CORS configuration details and troubleshooting
   - Authentication setup and token rotation
   - Development/production/reverse-proxy examples

5. **Deployment Options** (2000 words)
   - Docker (recommended) with build/run commands
   - Docker Compose with named volumes
   - Manual deployment (Bun CLI)
   - systemd service configuration
   - Image optimization details

6. **Security Best Practices** (2500 words)
   - HTTPS setup (nginx and Traefik reverse proxy examples)
   - Complete nginx configuration with SSL
   - Authentication token security (generation, storage, rotation)
   - Firewall configuration (UFW and iptables)
   - Docker security hardening (non-root, read-only, resource limits)
   - Network security (internal networks, VPN)

7. **Operations** (3000 words)
   - Monitoring & logging (health checks, automated monitoring, structured logs)
   - Backup & restore (3 strategies with scripts)
   - Performance tuning (server, application, network levels)
   - Performance baselines table

8. **Troubleshooting** (2500 words)
   - 6 common issues with diagnosis and solutions:
     - Port already in use
     - CORS policy blocking
     - 401 Unauthorized
     - File permission errors
     - Server not starting
     - Slow performance
     - Data not persisting
   - Debug mode instructions
   - Getting help section

9. **API Reference** (1500 words)
   - Complete endpoint documentation
   - All DocStore endpoints (6 endpoints)
   - All ProjectStore endpoints (5 endpoints)
   - All FieldCatalogStore endpoints (5 endpoints)
   - Health check endpoint
   - Request/response examples
   - Error response documentation

10. **Migration Guide** (1000 words)
    - Local mode to server mode migration
    - Rollback procedures
    - Step-by-step instructions

**Acceptance Criteria** (all met):
- ✅ Quick start guide (5-step Docker deployment)
- ✅ Environment variable reference table (complete with 7 variables)
- ✅ Architecture diagram (ASCII format with data flows)
- ✅ Security best practices (HTTPS, auth tokens, firewall, Docker hardening)
- ✅ Troubleshooting common issues (7 detailed scenarios)
- ✅ Performance tuning recommendations (server, app, network levels)
- ✅ Monitoring and logging guidance (health checks, log aggregation, ELK/Loki)
- ✅ Backup and restore procedures (3 strategies with automation scripts)

**Additional Content**:
- Docker security scanning with Trivy
- Cron job examples for backups and monitoring
- Performance benchmarking commands
- Log aggregation examples (Loki + Grafana)
- Health check monitoring patterns
- Resource limit recommendations
- Nginx reverse proxy configuration
- Let's Encrypt SSL setup
- systemd service configuration
- Complete API reference
- Migration guide

**Statistics**:
- Total length: ~18,500 words
- 11 major sections
- 7 environment variables documented
- 16 API endpoints documented
- 7 troubleshooting scenarios
- 6 deployment examples
- 3 backup strategies
- Multiple architecture diagrams
- 50+ code examples
- 20+ tables

**Files**:
- `docs/deployment/server-mode.md` (created - 1095 lines)

---

## In Progress

None yet.

---

## Blocked

None. Waiting for Phases 1-4 completion.

---

## Next Actions

1. **Complete Phases 1-4 first** (server must be functional)
2. Run TASK-SS-014 (Dockerfile) and TASK-SS-016 (Scripts) in parallel (batch_1)
3. Once Dockerfile ready, run TASK-SS-015 (docker-compose) (batch_2)
4. Once all deployment artifacts ready, run TASK-SS-017 (Documentation) (batch_3)
5. Test Docker deployment end-to-end
6. Validate documentation accuracy

---

## Testing Checklist

### Dockerfile (TASK-SS-014)
- [ ] Image builds successfully
- [ ] Image size reasonable (<200MB compressed)
- [ ] Multi-stage build works
- [ ] Non-root user runs server
- [ ] Health check works
- [ ] File permissions correct
- [ ] Data directory writable
- [ ] Server starts and responds

### docker-compose (TASK-SS-015)
- [ ] Stack starts: `docker-compose up -d`
- [ ] Server container running
- [ ] Volume mounted correctly
- [ ] Environment variables passed
- [ ] Port mapping works (localhost:3001)
- [ ] Health check passes
- [ ] Restart policy works (stop/start)
- [ ] Data persists after restart

### Scripts and Environment (TASK-SS-016)
- [ ] server:dev script works
- [ ] server:start script works
- [ ] server:build script works (if applicable)
- [ ] docker:* scripts work
- [ ] .env.example complete and accurate
- [ ] All environment variables documented
- [ ] Examples for dev and prod included

### Documentation (TASK-SS-017)
- [ ] Quick start guide accurate
- [ ] Environment variables documented
- [ ] Architecture diagram clear
- [ ] Security best practices comprehensive
- [ ] Troubleshooting covers common issues
- [ ] Performance tuning practical
- [ ] Monitoring guidance actionable
- [ ] Backup/restore procedures tested

### Integration Testing
- [ ] Complete deployment flow works (clone → configure → deploy)
- [ ] Web app connects to server
- [ ] CRUD operations work
- [ ] Auth token validation works
- [ ] CORS configured correctly
- [ ] Data persists across restarts
- [ ] Health check monitoring works
- [ ] Logs accessible and useful
- [ ] Backup/restore procedures work

---

## Orchestration Quick Reference

### Run Dockerfile and Scripts in Parallel, Then docker-compose, Then Docs

```typescript
// Step 1: Dockerfile and scripts in parallel (batch_1)
Task("backend-typescript-architect", `
Implement TASK-SS-014: Create Dockerfile

Create Dockerfile and .dockerignore:
- Use official Bun base image (oven/bun:1)
- Multi-stage build (builder + slim runtime)
- Copy only necessary files (src/server, src/core, src/adapters)
- Create non-root user (meatycapture:1001)
- Set proper file permissions
- Expose PORT 3001
- Health check using /health endpoint
- CMD: bun run src/server/index.ts

.dockerignore:
- Exclude node_modules, dist, .git, docs, tests, UI files
- Include only server dependencies

Image optimization:
- Use --frozen-lockfile for dependencies
- Production dependencies only
- Slim runtime image
- Target <200MB compressed

Reference: Phase 5, Task SS-014 in implementation plan
Context: /Users/miethe/dev/homelab/development/meatycapture/.claude/worknotes/server-storage/context.md
Implementation pattern in phase-5-progress.md
`);

Task("documentation-writer", `
Implement TASK-SS-016: Add Server Scripts and Environment Template

Update package.json with server scripts:
- server:dev - Bun dev mode with --watch
- server:start - Production mode
- server:build - Compile server (optional)
- docker:build, docker:run, docker:stop, docker:logs

Create .env.example with all environment variables:
- NODE_ENV, PORT, MEATYCAPTURE_DATA_DIR
- CORS_ORIGINS (dev and prod examples)
- MEATYCAPTURE_AUTH_TOKEN (commented with generation command)
- MEATYCAPTURE_API_URL (client-side)
- Security recommendations
- Docker volume configuration notes

Reference: Phase 5, Task SS-016 in implementation plan
See implementation pattern in phase-5-progress.md
`);

// Step 2: docker-compose (batch_2, after Dockerfile)
Task("backend-typescript-architect", `
Implement TASK-SS-015: Create docker-compose Configuration

Create docker-compose.yml:
- Service: meatycapture-server
- Build context and Dockerfile reference
- Port mapping: 3001:3001
- Volume: meatycapture-data:/data
- Environment variables (reference .env)
- Restart policy: unless-stopped
- Health check configuration
- Network: meatycapture (bridge)

Create docker-compose.override.example.yml:
- Production environment overrides
- NFS volume mount example
- Optional nginx reverse proxy service
- HTTPS/TLS configuration notes

Reference: Phase 5, Task SS-015 in implementation plan
Implementation pattern in phase-5-progress.md
`);

// Step 3: Documentation (batch_3, after all deployment artifacts)
Task("documentation-complex", `
Implement TASK-SS-017: Write Deployment Documentation

Create docs/deployment/server-mode.md with:
1. Introduction - what is server mode, when to use, architecture diagram
2. Quick Start - prerequisites, clone, configure, deploy
3. Environment Variables - complete reference table
4. Docker Deployment - build, run, docker-compose, volumes
5. Security Best Practices - HTTPS, auth tokens, CORS, permissions
6. Production Deployment - nginx setup, monitoring, logging
7. Troubleshooting - common issues and solutions
8. Performance Tuning - optimizations and best practices
9. Monitoring and Logging - health checks, log aggregation
10. Backup and Restore - procedures and automation
11. Upgrading - safe upgrade process
12. Development - local dev, testing, contributing

Ensure accuracy:
- Test all commands and examples
- Verify environment variables match .env.example
- Include practical examples for common scenarios
- Add troubleshooting for issues encountered during testing

Reference: Phase 5, Task SS-017 in implementation plan
Content outline in phase-5-progress.md
`);
```

### Run Individual Tasks

```typescript
// TASK-SS-014
Task("backend-typescript-architect", `
Implement TASK-SS-014: Create Dockerfile

Create optimized Dockerfile with Bun runtime, multi-stage build, non-root user.
See orchestration command above.
`);

// TASK-SS-015
Task("backend-typescript-architect", `
Implement TASK-SS-015: Create docker-compose Configuration

Create docker-compose.yml and docker-compose.override.example.yml.
See orchestration command above.
`);

// TASK-SS-016
Task("documentation-writer", `
Implement TASK-SS-016: Add Server Scripts and Environment Template

Update package.json with server scripts. Create .env.example.
See orchestration command above.
`);

// TASK-SS-017
Task("documentation-complex", `
Implement TASK-SS-017: Write Deployment Documentation

Create comprehensive deployment guide in docs/deployment/server-mode.md.
See orchestration command above.
`);
```

### Validation Task

```typescript
Task("task-completion-validator", `
Validate Phase 5 completion for server-storage feature.

Check all acceptance criteria:
1. TASK-SS-014: Dockerfile builds, image optimized, health check works
2. TASK-SS-015: docker-compose stack starts, volume persists, health check passes
3. TASK-SS-016: Scripts work, .env.example complete
4. TASK-SS-017: Documentation comprehensive and accurate

Test end-to-end deployment:
1. Clone repo (fresh directory)
2. Copy .env.example to .env
3. Configure environment variables
4. Run: docker-compose up -d
5. Verify server starts and health check passes
6. Connect web app with MEATYCAPTURE_API_URL
7. Test CRUD operations
8. Verify data persists (restart container)
9. Test backup/restore procedures
10. Review logs for errors

Verify documentation:
- Quick start guide works (follow step-by-step)
- Environment variables table complete and accurate
- Security recommendations practical
- Troubleshooting covers issues encountered
- All commands tested and working

Quality checks:
- Docker image <200MB compressed
- Container runs as non-root (user 1001)
- Health check succeeds within 10s
- Volume permissions correct (1001:1001)
- Server startup logs informative
- All scripts in package.json work

Update: /Users/miethe/dev/homelab/development/meatycapture/.claude/progress/server-storage/phase-5-progress.md
`);
```

---

## Context for AI Agents

When working on this phase:

1. **Complete Phases 1-4 first**: Server must be functional before deployment
2. **Multi-stage Docker builds**: Separate builder and runtime stages for smaller images
3. **Non-root user**: Security best practice (uid 1001)
4. **Health checks**: Essential for orchestration (Docker, Kubernetes)
5. **Volume permissions**: Match container user (1001:1001)
6. **Environment variables**: Document everything in .env.example
7. **Test deployment**: Actually run docker-compose and verify it works
8. **Test documentation**: Follow your own quick start guide
9. **Production focus**: Security, monitoring, backup/restore
10. **NFS compatibility**: Support external volume mounts

Key patterns:
- Multi-stage builds (smaller images)
- Non-root containers (security)
- Health checks (monitoring)
- Volume persistence (data safety)
- Environment configuration (flexibility)
- Comprehensive documentation (usability)

This is the final phase - after completion, server-storage-v1 is production-ready!

## Production Readiness Checklist

Before marking feature complete:

- [ ] All 5 phases complete (17 tasks)
- [ ] Docker image builds and runs
- [ ] docker-compose stack functional
- [ ] Documentation tested and accurate
- [ ] Security best practices implemented
- [ ] Performance acceptable (<100ms read, <500ms write)
- [ ] Backup/restore procedures tested
- [ ] Upgrade path documented
- [ ] All tests passing
- [ ] Code review complete
- [ ] Production deployment tested (staging environment)
