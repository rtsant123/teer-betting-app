# Teer Betting App - Docker Management
.PHONY: help build build-prod start start-prod stop clean test test-backend test-frontend lint security-scan logs backup restore

# Default environment
ENV ?= development

# Colors for output
RED=\033[0;31m
GREEN=\033[0;32m
YELLOW=\033[1;33m
NC=\033[0m # No Color

help: ## Show this help message
	@echo "$(GREEN)Teer Betting App - Docker Management$(NC)"
	@echo "====================================="
	@echo "Available commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "$(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'

# Development Commands
build: ## Build development containers
	@echo "$(GREEN)Building development containers...$(NC)"
	docker-compose build --no-cache

start: ## Start development environment
	@echo "$(GREEN)Starting development environment...$(NC)"
	docker-compose --env-file .env.development up -d
	@echo "$(GREEN)Services started:$(NC)"
	@echo "  Frontend: http://localhost:80"
	@echo "  Backend:  http://localhost:8001"
	@echo "  pgAdmin: http://localhost:5050"

stop: ## Stop all services
	@echo "$(YELLOW)Stopping all services...$(NC)"
	docker-compose down

restart: stop start ## Restart development environment

# Production Commands
build-prod: ## Build production containers
	@echo "$(GREEN)Building production containers...$(NC)"
	docker-compose -f docker-compose.prod.yml build --no-cache

start-prod: ## Start production environment
	@echo "$(GREEN)Starting production environment...$(NC)"
	docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d
	@echo "$(GREEN)Production services started$(NC)"

stop-prod: ## Stop production environment
	@echo "$(YELLOW)Stopping production environment...$(NC)"
	docker-compose -f docker-compose.prod.yml down

# Testing Commands
test: test-backend test-frontend ## Run all tests

test-setup: ## Setup test environment
	@echo "$(GREEN)Setting up test environment...$(NC)"
	docker-compose -f docker-compose.test.yml up -d
	@sleep 30
	@echo "$(GREEN)Test environment ready$(NC)"

test-backend: ## Run backend tests
	@echo "$(GREEN)Running backend tests...$(NC)"
	docker-compose -f docker-compose.test.yml exec backend-test python -m pytest tests/ -v --cov=app

test-frontend: ## Run frontend tests
	@echo "$(GREEN)Running frontend tests...$(NC)"
	docker-compose -f docker-compose.test.yml exec frontend-test npm test -- --coverage --watchAll=false

test-integration: ## Run integration tests
	@echo "$(GREEN)Running integration tests...$(NC)"
	docker-compose -f docker-compose.test.yml up -d
	@sleep 30
	docker-compose -f docker-compose.test.yml exec backend-test python -m pytest tests/integration/ -v
	docker-compose -f docker-compose.test.yml down

test-cleanup: ## Cleanup test environment
	@echo "$(YELLOW)Cleaning up test environment...$(NC)"
	docker-compose -f docker-compose.test.yml down -v

# Code Quality Commands
lint: ## Run linting on all code
	@echo "$(GREEN)Running linting...$(NC)"
	docker-compose exec backend python -m black --check .
	docker-compose exec backend python -m flake8 .
	docker-compose exec backend python -m isort --check-only .
	docker-compose exec frontend npm run lint

format: ## Format all code
	@echo "$(GREEN)Formatting code...$(NC)"
	docker-compose exec backend python -m black .
	docker-compose exec backend python -m isort .
	docker-compose exec frontend npm run lint -- --fix

security-scan: ## Run security vulnerability scan
	@echo "$(GREEN)Running security scan...$(NC)"
	docker run --rm -v $(PWD):/app aquasec/trivy fs /app

# Database Commands
db-migrate: ## Run database migrations
	@echo "$(GREEN)Running database migrations...$(NC)"
	docker-compose exec backend alembic upgrade head

db-reset: ## Reset database (DANGER: Deletes all data)
	@echo "$(RED)Resetting database... This will delete all data!$(NC)"
	@read -p "Are you sure? [y/N] " -n 1 -r; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose exec backend alembic downgrade base; \
		docker-compose exec backend alembic upgrade head; \
		echo "$(GREEN)Database reset complete$(NC)"; \
	else \
		echo "$(YELLOW)Database reset cancelled$(NC)"; \
	fi

db-backup: ## Backup database
	@echo "$(GREEN)Creating database backup...$(NC)"
	mkdir -p backups
	docker-compose exec db pg_dump -U postgres teer_betting > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)Backup created in backups/ directory$(NC)"

db-restore: ## Restore database from backup (specify BACKUP_FILE=filename)
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(RED)Please specify BACKUP_FILE=filename$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)Restoring database from $(BACKUP_FILE)...$(NC)"
	docker-compose exec -T db psql -U postgres -d teer_betting < $(BACKUP_FILE)

# Monitoring and Logs
logs: ## Show logs for all services
	docker-compose logs -f

logs-backend: ## Show backend logs
	docker-compose logs -f backend

logs-frontend: ## Show frontend logs
	docker-compose logs -f frontend

logs-db: ## Show database logs
	docker-compose logs -f db

health: ## Check health of all services
	@echo "$(GREEN)Checking service health...$(NC)"
	@curl -s http://localhost:8001/health | jq . || echo "$(RED)Backend not responding$(NC)"
	@curl -s http://localhost:80 > /dev/null && echo "$(GREEN)Frontend is healthy$(NC)" || echo "$(RED)Frontend not responding$(NC)"

# Cleanup Commands
clean: ## Remove all containers, images, and volumes
	@echo "$(YELLOW)Cleaning up Docker resources...$(NC)"
	docker-compose down -v --remove-orphans
	docker-compose -f docker-compose.prod.yml down -v --remove-orphans
	docker-compose -f docker-compose.test.yml down -v --remove-orphans
	docker system prune -f
	docker volume prune -f

clean-images: ## Remove all built images
	@echo "$(YELLOW)Removing built images...$(NC)"
	docker rmi $(shell docker images | grep teer | awk '{print $$3}') 2>/dev/null || true

# Development Helpers
shell-backend: ## Open shell in backend container
	docker-compose exec backend bash

shell-frontend: ## Open shell in frontend container
	docker-compose exec frontend sh

shell-db: ## Open PostgreSQL shell
	docker-compose exec db psql -U postgres -d teer_betting

# Git and Deployment
git-init: ## Initialize git repository
	@echo "$(GREEN)Initializing git repository...$(NC)"
	git init
	git add .
	git commit -m "Initial commit: Teer Betting App with Docker setup"

deploy-staging: ## Deploy to staging (requires staging setup)
	@echo "$(GREEN)Deploying to staging...$(NC)"
	# Add staging deployment commands here

deploy-prod: ## Deploy to production (requires production setup)
	@echo "$(GREEN)Deploying to production...$(NC)"
	# Add production deployment commands here

# Installation and Setup
install: ## Initial setup and installation
	@echo "$(GREEN)Setting up Teer Betting App...$(NC)"
	@echo "1. Building containers..."
	make build
	@echo "2. Starting services..."
	make start
	@echo "3. Running migrations..."
	sleep 30
	make db-migrate
	@echo "$(GREEN)Setup complete!$(NC)"
	@echo "Access the application at:"
	@echo "  Frontend: http://localhost:80"
	@echo "  Backend:  http://localhost:8001"
	@echo "  API Docs: http://localhost:8001/api/v1/docs"
	@echo "  pgAdmin:  http://localhost:5050"
