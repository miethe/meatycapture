# Docker Compose Configuration - TASK-SS-015

## Summary

Created production-ready docker-compose configuration for MeatyCapture server with:
- Service definition with health checks
- Persistent volume mounting
- Environment variable configuration
- Network isolation
- Restart policies
- Comprehensive override examples

## Files Created

### 1. `/docker-compose.yml` (Main Configuration)

**Key Features:**
- Service: `meatycapture-server` with build context
- Port mapping: `3001:3001` (HOST:CONTAINER)
- Volume mount: `./data:/data` for persistent storage
- Health check: Uses `/health` endpoint (30s interval, 5s timeout, 3 retries)
- Restart policy: `unless-stopped`
- Network: `meatycapture-network` (bridge driver)
- Environment variables from `.env` file
- Resource limits (commented, ready for production)

**Environment Variables Configured:**
- `PORT=3001` - HTTP server port
- `NODE_ENV=production` - Runtime environment
- `LOG_LEVEL=info` - Logging verbosity
- `MEATYCAPTURE_DATA_DIR=/data` - Container data directory
- `CORS_ORIGINS` - Allowed CORS origins
- `MEATYCAPTURE_AUTH_TOKEN` - Optional API authentication

### 2. `/docker-compose.override.example.yml` (Advanced Examples)

**Demonstrates 7 Configuration Patterns:**

1. **Production with Nginx Reverse Proxy**
   - SSL termination
   - HTTPS support
   - Internal-only server port
   - Nginx service with Let's Encrypt integration

2. **Custom Port Mapping**
   - Alternative port configurations
   - Development port conflict resolution

3. **Custom Data Path**
   - Non-default data directory
   - Environment variable path override

4. **Development Hot Reload**
   - Source code mounting
   - Bun watch mode (future enhancement)

5. **Resource Limits**
   - CPU constraints (2 cores limit, 1 core reservation)
   - Memory constraints (1GB limit, 512MB reservation)

6. **Monitoring Stack**
   - Prometheus metrics collection
   - Grafana visualization
   - Docker Compose profiles usage

7. **Automated Backups**
   - Daily tar.gz backups
   - 7-day retention policy
   - Cron-style scheduling

## Usage Instructions

### Basic Usage

```bash
# 1. Copy environment file
cp .env.example .env

# 2. Edit .env with your configuration
vim .env

# 3. Start server
docker-compose up -d

# 4. View logs
docker-compose logs -f meatycapture-server

# 5. Check health
curl http://localhost:3001/health

# 6. Stop server
docker-compose down
```

### With Override File

```bash
# Copy override example
cp docker-compose.override.example.yml docker-compose.override.yml

# Edit override file (uncomment sections you need)
vim docker-compose.override.yml

# Start with override (auto-loaded)
docker-compose up -d
```

### Custom Override File

```bash
# Use specific override file
docker-compose -f docker-compose.yml -f production.yml up -d
```

### With Profiles (Monitoring)

```bash
# Start with monitoring stack
docker-compose --profile monitoring up -d

# Start with backup service
docker-compose --profile backup up -d
```

## Health Check Details

The server includes a comprehensive health check:
- **Endpoint:** `http://localhost:3001/health`
- **Interval:** 30 seconds
- **Timeout:** 5 seconds
- **Start Period:** 10 seconds (grace period on startup)
- **Retries:** 3 consecutive failures before marking unhealthy

Health check uses Bun's native fetch API:
```bash
bun run -e "fetch('http://localhost:3001/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"
```

## Data Persistence

### Bind Mount (Default)
```yaml
volumes:
  - ./data:/data
```
- Data stored in `./data` directory on host
- Easy to backup and inspect
- Direct file access from host

### Named Volume (Alternative)
```yaml
volumes:
  - meatycapture-data:/data

volumes:
  meatycapture-data:
    name: meatycapture-data
```
- Docker-managed volume
- Better portability
- Managed with `docker volume` commands

## Network Configuration

**Bridge Network:** `meatycapture-network`
- Isolates service from other Docker networks
- Allows internal service communication
- Controlled external access via port mapping

## Environment Variables

All variables can be set in `.env` file:

```env
# Required
PORT=3001
NODE_ENV=production
LOG_LEVEL=info
MEATYCAPTURE_DATA_DIR=/data

# Optional
CORS_ORIGINS=http://localhost:5173,http://localhost:4173
MEATYCAPTURE_AUTH_TOKEN=your-secret-token
```

## Production Considerations

### 1. Enable Resource Limits
Uncomment `deploy.resources` section in docker-compose.yml:
```yaml
deploy:
  resources:
    limits:
      cpus: '1'
      memory: 512M
```

### 2. Add Nginx Reverse Proxy
Use Example 1 from override file for HTTPS termination

### 3. Enable Authentication
Set `MEATYCAPTURE_AUTH_TOKEN` in `.env`:
```env
MEATYCAPTURE_AUTH_TOKEN=generated-secure-token-here
```

### 4. Configure CORS
Set specific allowed origins (no wildcards):
```env
CORS_ORIGINS=https://app.example.com,https://www.example.com
```

### 5. Enable Monitoring
Use profiles to add Prometheus + Grafana:
```bash
docker-compose --profile monitoring up -d
```

### 6. Set Up Backups
Use backup profile or external backup solution

## Acceptance Criteria Status

- [x] Defines meatycapture-server service
- [x] Mounts volume for persistent data at /data
- [x] Configures environment variables from .env
- [x] Sets restart policy (unless-stopped)
- [x] Includes optional nginx reverse proxy config in override example
- [x] Port mapping (3001:3001)
- [x] Network configuration (bridge network)
- [x] Health check integration (from Dockerfile)

## Testing

```bash
# Build and start
docker-compose up -d --build

# Verify health
docker-compose ps
# Should show "healthy" status

# Test endpoint
curl http://localhost:3001/health
# Should return: {"status":"ok","timestamp":"..."}

# Check logs
docker-compose logs -f

# Verify data persistence
echo "test" > ./data/test.txt
docker-compose restart
cat ./data/test.txt  # Should still exist

# Cleanup
docker-compose down
rm ./data/test.txt
```

## Next Steps

1. Document nginx configuration files (if using reverse proxy)
2. Set up SSL certificates (Let's Encrypt recommended)
3. Configure monitoring dashboards (if using Grafana)
4. Implement backup automation
5. Add to deployment documentation

## References

- Dockerfile: `/Dockerfile`
- Environment Example: `/.env.example`
- Docker Compose Spec: https://docs.docker.com/compose/compose-file/
