# Radio Calico - Docker Deployment Guide

This guide covers how to build and deploy Radio Calico using Docker for both development and production environments.

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+

## Quick Start

### Development Mode

Start the development server with hot reloading:

```bash
docker-compose up
```

The application will be available at http://localhost:3000

To run in detached mode:
```bash
docker-compose up -d
```

### Production Mode

Build and start the production container:

```bash
docker-compose -f docker-compose.prod.yml up -d
```

## Docker Architecture

### Multi-Stage Dockerfile

The project uses a multi-stage Dockerfile with three targets:

1. **base** - Common dependencies and build tools
2. **development** - Includes nodemon for hot reloading and all dev dependencies
3. **production** - Optimized image with only production dependencies, non-root user, and health checks

### Build Stages

```
base (Node 20 Alpine + SQLite + build tools)
├── development (All dependencies + nodemon)
└── prod-deps → production (Production deps only + security hardening)
```

## Environment Variables

The application supports the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `NODE_ENV` | `development` | Node environment (development/production) |
| `PORT` | `3000` | HTTP server port |
| `DB_PATH` | `./database.db` | SQLite database file path |

## Volume Management

### Development

- Source code is mounted for hot reloading
- Database persisted in named volume `radiocalico-db-dev`
- node_modules excluded from mount to prevent host conflicts

### Production

- Only database persisted in named volume `radiocalico-db-prod`
- Application code baked into image for consistency

## Commands Reference

### Development

```bash
# Start development environment
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f

# Stop containers
docker-compose down

# Rebuild after changing dependencies
docker-compose up --build

# Access container shell
docker-compose exec radiocalico-dev sh

# Stop and remove volumes (WARNING: deletes database)
docker-compose down -v
```

### Production

```bash
# Build and start production
docker-compose -f docker-compose.prod.yml up -d --build

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Check health status
docker-compose -f docker-compose.prod.yml ps

# Restart service
docker-compose -f docker-compose.prod.yml restart

# Stop production
docker-compose -f docker-compose.prod.yml down

# Update to latest code
git pull
docker-compose -f docker-compose.prod.yml up -d --build
```

## Building Images Directly

### Development Image

```bash
docker build --target development -t radiocalico:dev .
docker run -p 3000:3000 -v $(pwd):/app -v /app/node_modules radiocalico:dev
```

### Production Image

```bash
docker build --target production -t radiocalico:prod .
docker run -p 3000:3000 -v radiocalico-data:/app/data radiocalico:prod
```

## Database Management

### Backup Database

Development:
```bash
docker-compose exec radiocalico-dev cp /app/data/database.db /app/data/database.backup.db
docker cp radiocalico-dev:/app/data/database.backup.db ./backup.db
```

Production:
```bash
docker-compose -f docker-compose.prod.yml exec radiocalico cp /app/data/database.db /app/data/database.backup.db
docker cp radiocalico-prod:/app/data/database.backup.db ./backup.db
```

### Restore Database

```bash
# Copy backup to container
docker cp ./backup.db radiocalico-prod:/app/data/database.db

# Or restore into volume
docker run --rm -v radiocalico-db-prod:/data -v $(pwd):/backup alpine cp /backup/backup.db /data/database.db
```

### Access Database

```bash
# Development
docker-compose exec radiocalico-dev sqlite3 /app/data/database.db

# Production
docker-compose -f docker-compose.prod.yml exec radiocalico sqlite3 /app/data/database.db
```

## Health Checks

The production image includes health checks that verify the database connection:

- Interval: 30 seconds
- Timeout: 3 seconds
- Retries: 3
- Start period: 40 seconds

Check health status:
```bash
docker-compose -f docker-compose.prod.yml ps
```

## Networking

Both configurations create an isolated bridge network:

- Development: `radiocalico-network`
- Production: `radiocalico-prod-network`

This allows for future expansion with additional services (reverse proxy, monitoring, etc.).

## Security Features (Production)

1. **Non-root user**: Application runs as user `nodejs` (UID 1001)
2. **Minimal base image**: Alpine Linux reduces attack surface
3. **No dev dependencies**: Only production packages included
4. **Health monitoring**: Automatic container restarts on failure
5. **Log rotation**: Prevents disk space issues (max 3 files × 10MB)

## Troubleshooting

### Container won't start

Check logs:
```bash
docker-compose logs
```

### Port 3000 already in use

Change the port mapping in docker-compose.yml:
```yaml
ports:
  - "8080:3000"  # Map to port 8080 on host
```

### Database permission errors

Ensure the data directory has correct permissions:
```bash
docker-compose exec radiocalico sh -c "chown -R nodejs:nodejs /app/data"
```

### Hot reload not working (development)

Ensure volumes are mounted correctly:
```bash
docker-compose down -v
docker-compose up --build
```

### Cannot connect to stream

The HLS stream URL is external (CloudFront CDN). Ensure your network can reach:
`https://d3d4yli4hf5bmh.cloudfront.net/hls/live.m3u8`

## Production Deployment Checklist

- [ ] Review and set appropriate environment variables
- [ ] Configure reverse proxy (nginx/traefik) for SSL/TLS
- [ ] Set up automated backups for database volume
- [ ] Configure log aggregation
- [ ] Set up monitoring and alerts
- [ ] Review and adjust resource limits
- [ ] Implement rate limiting
- [ ] Configure firewall rules
- [ ] Test disaster recovery procedures

## Advanced Configuration

### Custom Port

Create a `.env` file:
```env
PORT=8080
```

Update docker-compose.yml to use the .env file:
```yaml
env_file:
  - .env
```

### Resource Limits

Add to docker-compose.prod.yml:
```yaml
deploy:
  resources:
    limits:
      cpus: '0.5'
      memory: 512M
    reservations:
      cpus: '0.25'
      memory: 256M
```

### Using with Reverse Proxy (nginx)

Example nginx configuration:
```nginx
server {
    listen 80;
    server_name radio.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Support

For issues or questions:
1. Check container logs: `docker-compose logs -f`
2. Verify environment variables are set correctly
3. Ensure volumes are properly mounted
4. Check network connectivity to external services

## License

ISC
