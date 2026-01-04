# Radio Calico - Quick Start Guide

## 🚀 Getting Started

### Prerequisites
- Docker & Docker Compose (for containerized deployment)
- Node.js 14+ & npm (for local development)

## ⚡ Quick Commands

```bash
# Show all available commands
make help

# Start production environment (PostgreSQL + Nginx)
make prod

# Start local development (SQLite)
make dev

# Run tests
make test

# Check system status
make status
```

## 📋 Common Tasks

### Development

```bash
# Local development with SQLite
make dev

# Docker development with hot reload
make dev-docker

# Stop development
make stop-dev
```

### Production

```bash
# Start production (PostgreSQL + Nginx on port 80)
make prod

# Build from scratch
make prod-build

# View logs
make logs

# Restart services
make restart-prod

# Stop production
make stop-prod
```

### Testing

```bash
# Run all tests
make test

# Watch mode
make test-watch

# With coverage
make test-coverage
```

### Database Management

```bash
# Initialize PostgreSQL schema
make db-init

# Access PostgreSQL CLI
make db-shell

# Backup database
make db-backup

# View backups
ls -lh backups/
```

## 🌐 Access Points

### Development
- Application: http://localhost:3000
- Database: SQLite file (`./database.db`)

### Production
- Application: http://localhost (port 80)
- Health Check: http://localhost/health
- Database: PostgreSQL (not exposed externally)

## 🔧 Architecture

### Development
```
localhost:3000 → Express + SQLite
```

### Production
```
localhost:80 → Nginx → Express (port 3000) → PostgreSQL (port 5432)
```

## 📦 What's Included

- **Nginx**: Reverse proxy with caching, compression, security headers
- **Express**: Node.js application with async/await
- **PostgreSQL**: Database with connection pooling (max 20 connections)
- **SQLite**: Fast local development
- **Database Abstraction**: Seamless switching between SQLite and PostgreSQL
- **Health Checks**: Automatic monitoring and restarts
- **Persistent Storage**: Docker volumes for database

## 🛠️ Troubleshooting

### Production won't start
```bash
make clean          # Clean everything
make prod-build     # Build from scratch
make status         # Check status
```

### Database issues
```bash
make db-init        # Reinitialize schema
make db-shell       # Access database
\dt                 # List tables
```

### View logs
```bash
make logs           # Production logs
make logs-dev       # Development logs
```

### Reset everything
```bash
make clean          # Stops all containers and removes volumes
```

## 📚 Documentation

- Full Docker guide: [README-DOCKER.md](README-DOCKER.md)
- Main README: [README.md](README.md)
- Project info: [CLAUDE.md](CLAUDE.md)

## 💡 Tips

1. **Always use `make help`** to see available commands
2. **Use `make status`** to check what's running
3. **Development uses SQLite** - fast and no setup needed
4. **Production uses PostgreSQL** - production-grade with connection pooling
5. **Database initialized automatically** when using `make prod`
6. **Backups stored in `backups/`** directory with timestamps
