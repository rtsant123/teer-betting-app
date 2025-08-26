# Teer Betting Application - Makefile
# Simplifies development and deployment tasks

.PHONY: help install dev build test clean deploy-dev deploy-prod backup restore lint format

# Default target
help:
	@echo "🎯 Teer Betting Application - Available Commands"
	@echo "=================================================="
	@echo ""
	@echo "📦 Setup & Installation:"
	@echo "  make install          Install all dependencies"
	@echo "  make install-backend  Install backend dependencies only"
	@echo "  make install-frontend Install frontend dependencies only"
	@echo ""
	@echo "🚀 Development:"
	@echo "  make dev              Start development environment"
	@echo "  make dev-backend      Start backend development server"
	@echo "  make dev-frontend     Start frontend development server"
	@echo "  make dev-db           Start database only"
	@echo ""
	@echo "🏗️  Build & Test:"
	@echo "  make build            Build all services"
	@echo "  make test             Run all tests"
	@echo "  make test-backend     Run backend tests"
	@echo "  make test-frontend    Run frontend tests"
	@echo "  make lint             Run linting on all code"
	@echo "  make format           Format all code"
	@echo ""
	@echo "🐳 Docker Operations:"
	@echo "  make docker-build     Build Docker images"
	@echo "  make docker-up        Start all containers"
	@echo "  make docker-down      Stop all containers"
	@echo "  make docker-logs      Show container logs"
	@echo ""
	@echo "🚀 Deployment:"
	@echo "  make deploy-dev       Deploy to development"
	@echo "  make deploy-staging   Deploy to staging"
	@echo "  make deploy-prod      Deploy to production"
	@echo ""
	@echo "🗄️  Database:"
	@echo "  make db-init          Initialize database with dummy data"
	@echo "  make db-migrate       Run database migrations"
	@echo "  make db-reset         Reset database (⚠️  DESTRUCTIVE)"
	@echo "  make backup           Create database backup"
	@echo "  make restore          Restore database from backup"
	@echo ""
	@echo "🧹 Maintenance:"
	@echo "  make clean            Clean build artifacts"
	@echo "  make clean-docker     Remove all Docker containers and images"
	@echo "  make logs             Show application logs"

# Installation targets
install: install-backend install-frontend
	@echo "✅ All dependencies installed successfully"

install-backend:
	@echo "📦 Installing backend dependencies..."
	cd backend && pip install -r requirements.txt

install-frontend:
	@echo "📦 Installing frontend dependencies..."
	cd frontend && npm install

# Development targets
dev: docker-up
	@echo "🚀 Development environment started"
	@echo "Frontend: http://localhost:3000"
	@echo "Backend: http://localhost:8000"
	@echo "API Docs: http://localhost:8000/docs"
	@echo "pgAdmin: http://localhost:5050"

dev-backend:
	@echo "🚀 Starting backend development server..."
	cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

dev-frontend:
	@echo "🚀 Starting frontend development server..."
	cd frontend && npm start

dev-db:
	@echo "🗄️ Starting database only..."
	docker-compose up -d db redis

# Build targets
build: build-backend build-frontend
	@echo "✅ All services built successfully"

build-backend:
	@echo "🏗️ Building backend..."
	cd backend && python -m py_compile app/main.py

build-frontend:
	@echo "🏗️ Building frontend..."
	cd frontend && npm run build

# Test targets
test: test-backend test-frontend
	@echo "✅ All tests completed"

test-backend:
	@echo "🧪 Running backend tests..."
	cd backend && python -m pytest tests/ -v --cov=app --cov-report=html

test-frontend:
	@echo "🧪 Running frontend tests..."
	cd frontend && npm test -- --coverage --watchAll=false

# Code quality targets
lint: lint-backend lint-frontend
	@echo "✅ Linting completed"

lint-backend:
	@echo "🔍 Linting backend code..."
	cd backend && python -m flake8 app/ --max-line-length=127 --exclude=migrations

lint-frontend:
	@echo "🔍 Linting frontend code..."
	cd frontend && npm run lint --if-present

format: format-backend format-frontend
	@echo "✅ Code formatting completed"

format-backend:
	@echo "🎨 Formatting backend code..."
	cd backend && python -m black app/ --line-length=127
	cd backend && python -m isort app/

format-frontend:
	@echo "🎨 Formatting frontend code..."
	cd frontend && npm run format --if-present

# Docker targets
docker-build:
	@echo "🐳 Building Docker images..."
	docker-compose build --no-cache

docker-up:
	@echo "🐳 Starting all containers..."
	docker-compose up -d
	@echo "⏳ Waiting for services to start..."
	sleep 10
	@make db-init

docker-down:
	@echo "🐳 Stopping all containers..."
	docker-compose down

docker-logs:
	@echo "📋 Showing container logs..."
	docker-compose logs -f

# Database targets
db-init:
	@echo "🗄️ Initializing database with dummy data..."
	docker-compose exec -T backend python init_db.py || echo "Database already initialized"

db-migrate:
	@echo "🗄️ Running database migrations..."
	docker-compose exec -T backend alembic upgrade head

db-reset:
	@echo "⚠️  Resetting database (this will delete all data)..."
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		docker-compose up -d db; \
		sleep 5; \
		make db-init; \
	fi

# Backup and restore
backup:
	@echo "💾 Creating database backup..."
	mkdir -p backups
	docker-compose exec -T db pg_dump -U postgres teer_betting > backups/backup_$$(date +%Y%m%d_%H%M%S).sql
	@echo "✅ Backup created in backups/ directory"

restore:
	@echo "📥 Available backups:"
	@ls -la backups/*.sql 2>/dev/null || echo "No backups found"
	@read -p "Enter backup filename (from backups/): " backup_file; \
	if [ -f "backups/$$backup_file" ]; then \
		docker-compose exec -T db psql -U postgres -d teer_betting < "backups/$$backup_file"; \
		echo "✅ Database restored from $$backup_file"; \
	else \
		echo "❌ Backup file not found"; \
	fi

# Deployment targets
deploy-dev:
	@echo "🚀 Deploying to development environment..."
	./deploy.sh dev

deploy-staging:
	@echo "🚀 Deploying to staging environment..."
	./deploy.sh staging

deploy-prod:
	@echo "🚀 Deploying to production environment..."
	@read -p "Are you sure you want to deploy to PRODUCTION? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		./deploy.sh production; \
	fi

# Maintenance targets
clean: clean-backend clean-frontend
	@echo "🧹 Cleanup completed"

clean-backend:
	@echo "🧹 Cleaning backend artifacts..."
	cd backend && find . -type d -name "__pycache__" -exec rm -rf {} + 2>/dev/null || true
	cd backend && find . -name "*.pyc" -delete 2>/dev/null || true
	cd backend && rm -rf .pytest_cache htmlcov .coverage 2>/dev/null || true

clean-frontend:
	@echo "🧹 Cleaning frontend artifacts..."
	cd frontend && rm -rf build coverage 2>/dev/null || true
	cd frontend && rm -rf node_modules/.cache 2>/dev/null || true

clean-docker:
	@echo "🧹 Cleaning Docker containers and images..."
	docker-compose down -v --remove-orphans
	docker system prune -f
	docker volume prune -f

logs:
	@echo "📋 Showing application logs..."
	docker-compose logs -f --tail=100

# Monitoring targets
monitor:
	@echo "📊 Starting monitoring stack..."
	docker-compose --profile monitoring up -d

monitor-down:
	@echo "📊 Stopping monitoring stack..."
	docker-compose --profile monitoring down

# Security scan
security-scan:
	@echo "🔒 Running security scan..."
	cd backend && python -m safety check --json || true
	cd frontend && npm audit --audit-level high || true

# Performance test
perf-test:
	@echo "⚡ Running performance tests..."
	@echo "Performance testing requires Apache Bench (ab) or Artillery"
	@echo "Install with: npm install -g artillery"
	# artillery quick --count 10 --num 3 http://localhost:8000/health

# Quick start for new developers
quick-start:
	@echo "🎯 Quick Start for New Developers"
	@echo "=================================="
	@make install
	@make docker-up
	@echo ""
	@echo "✅ Setup complete! Your Teer Betting platform is running:"
	@echo "   Frontend: http://localhost"
	@echo "   Backend:  http://localhost:8000"
	@echo "   Admin:    login with admin/admin123"
	@echo "   User:     login with testuser1/test123"

# Environment validation
validate-env:
	@echo "🔍 Validating environment..."
	@command -v docker >/dev/null 2>&1 || { echo "❌ Docker not installed"; exit 1; }
	@command -v docker-compose >/dev/null 2>&1 || { echo "❌ Docker Compose not installed"; exit 1; }
	@command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 not installed"; exit 1; }
	@command -v node >/dev/null 2>&1 || { echo "❌ Node.js not installed"; exit 1; }
	@command -v npm >/dev/null 2>&1 || { echo "❌ npm not installed"; exit 1; }
	@echo "✅ Environment validation passed"

.DEFAULT_GOAL := help