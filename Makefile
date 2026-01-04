.PHONY: help dev prod test stop clean logs ps db-init db-shell db-backup install

# Default target
help:
	@echo "Radio Calico - Available Make Targets"
	@echo "======================================"
	@echo ""
	@echo "Development:"
	@echo "  make dev          - Start development server (SQLite)"
	@echo "  make dev-docker   - Start development in Docker"
	@echo "  make stop-dev     - Stop development Docker containers"
	@echo ""
	@echo "Production:"
	@echo "  make prod         - Start production (PostgreSQL + Nginx)"
	@echo "  make prod-build   - Build and start production"
	@echo "  make stop-prod    - Stop production containers"
	@echo "  make restart-prod - Restart production containers"
	@echo ""
	@echo "Testing:"
	@echo "  make test         - Run all tests"
	@echo "  make test-watch   - Run tests in watch mode"
	@echo "  make test-coverage - Run tests with coverage report"
	@echo ""
	@echo "Utilities:"
	@echo "  make install      - Install npm dependencies"
	@echo "  make logs         - View production logs"
	@echo "  make logs-dev     - View development logs"
	@echo "  make ps           - Show running containers"
	@echo "  make clean        - Stop all containers and remove volumes"
	@echo ""
	@echo "Database:"
	@echo "  make db-init      - Initialize PostgreSQL schema"
	@echo "  make db-shell     - Access PostgreSQL shell"
	@echo "  make db-backup    - Backup PostgreSQL database"
	@echo ""

# Development targets
dev:
	@echo "Starting development server with SQLite..."
	npm start

dev-docker:
	@echo "Starting development environment in Docker..."
	docker compose up

stop-dev:
	@echo "Stopping development containers..."
	docker compose down

# Production targets
prod:
	@echo "Starting production environment (PostgreSQL + Nginx)..."
	@if [ ! -f .env ]; then \
		echo "ERROR: .env file not found!"; \
		echo "Production requires POSTGRES_PASSWORD to be set."; \
		echo ""; \
		echo "Create a .env file with:"; \
		echo "  POSTGRES_PASSWORD=your_secure_password_here"; \
		echo ""; \
		exit 1; \
	fi
	docker compose -f docker-compose.prod.yml up -d
	@echo ""
	@echo "Waiting for services to be healthy..."
	@until docker exec radiocalico-postgres pg_isready -U radiocalico > /dev/null 2>&1; do \
		echo "Waiting for PostgreSQL..."; \
		sleep 1; \
	done
	@echo ""
	@echo "Initializing database schema..."
	@docker exec -i radiocalico-postgres psql -U radiocalico -d radiocalico < db/init.sql 2>/dev/null || true
	@echo ""
	@echo "Production environment started!"
	@echo "  Application: http://localhost"
	@echo "  Health check: http://localhost/health"
	@echo ""
	@make ps

prod-build:
	@echo "Building and starting production environment..."
	@if [ ! -f .env ]; then \
		echo "ERROR: .env file not found!"; \
		echo "Production requires POSTGRES_PASSWORD to be set."; \
		echo ""; \
		echo "Create a .env file with:"; \
		echo "  POSTGRES_PASSWORD=your_secure_password_here"; \
		echo ""; \
		exit 1; \
	fi
	docker compose -f docker-compose.prod.yml up -d --build
	@until docker exec radiocalico-postgres pg_isready -U radiocalico > /dev/null 2>&1; do \
		echo "Waiting for PostgreSQL..."; \
		sleep 1; \
	done
	@docker exec -i radiocalico-postgres psql -U radiocalico -d radiocalico < db/init.sql 2>/dev/null || true
	@echo ""
	@echo "Production environment ready!"
	@make ps

stop-prod:
	@echo "Stopping production containers..."
	docker compose -f docker-compose.prod.yml down

restart-prod:
	@echo "Restarting production containers..."
	docker compose -f docker-compose.prod.yml restart

# Testing targets
install:
	@echo "Installing dependencies..."
	npm install

test:
	@echo "Running tests..."
	npm test

test-watch:
	@echo "Running tests in watch mode..."
	npm run test:watch

test-coverage:
	@echo "Running tests with coverage..."
	npm run test:coverage

# Utility targets
logs:
	@echo "Showing production logs (Ctrl+C to exit)..."
	docker compose -f docker-compose.prod.yml logs -f

logs-dev:
	@echo "Showing development logs (Ctrl+C to exit)..."
	docker compose logs -f

ps:
	@echo "Container Status:"
	@docker compose -f docker-compose.prod.yml ps 2>/dev/null || docker compose ps 2>/dev/null || echo "No containers running"

clean:
	@echo "Stopping all containers and removing volumes..."
	@docker compose down -v 2>/dev/null || true
	@docker compose -f docker-compose.prod.yml down -v 2>/dev/null || true
	@echo "Cleanup complete!"

# Database targets
db-init:
	@echo "Initializing PostgreSQL database schema..."
	@docker exec -i radiocalico-postgres psql -U radiocalico -d radiocalico < db/init.sql
	@echo "Database schema initialized!"
	@docker exec radiocalico-postgres psql -U radiocalico -d radiocalico -c "\dt"

db-shell:
	@echo "Connecting to PostgreSQL database..."
	@echo "Type 'exit' or '\q' to quit"
	@docker exec -it radiocalico-postgres psql -U radiocalico -d radiocalico

db-backup:
	@echo "Backing up PostgreSQL database..."
	@mkdir -p backups
	@docker exec radiocalico-postgres pg_dump -U radiocalico radiocalico > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "Backup created in backups/ directory"
	@ls -lh backups/ | tail -1

# Quick status check
status:
	@echo "=== Radio Calico Status ==="
	@echo ""
	@echo "Containers:"
	@make ps
	@echo ""
	@echo "Testing endpoints..."
	@curl -s http://localhost/api/test-db 2>/dev/null | grep -q "PostgreSQL" && echo "✓ Production API responding (PostgreSQL)" || echo "✗ Production API not responding"
	@curl -s http://localhost:3000/api/test-db 2>/dev/null | grep -q "SQLite" && echo "✓ Development API responding (SQLite)" || echo "✗ Development API not responding"
