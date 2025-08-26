# Teer Betting App - Docker Setup & Deployment Guide

A complete dockerized teer betting platform with FastAPI backend, React frontend, and PostgreSQL database.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git
- Make (optional, but recommended)

### Installation

1. **Clone the repository:**
```bash
git clone <your-repo-url>
cd teer-betting-app
```

2. **Quick setup with Make:**
```bash
make install
```

Or manually:

3. **Build and start development environment:**
```bash
docker-compose build
docker-compose up -d
```

4. **Run database migrations:**
```bash
docker-compose exec backend alembic upgrade head
```

### Access the Application

- **Frontend:** http://localhost:80
- **Backend API:** http://localhost:8001
- **API Documentation:** http://localhost:8001/api/v1/docs
- **pgAdmin:** http://localhost:5050 (admin@teer.com / admin)

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   FastAPI       │    │   PostgreSQL    │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Database)    │
│   Port: 80      │    │   Port: 8001    │    │   Port: 5434    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         └───────────────────────┼───────────────────────┘
                                 │
                    ┌─────────────────┐
                    │     Redis       │
                    │   (Caching)     │
                    │   Port: 6379    │
                    └─────────────────┘
```

## 📁 Project Structure

```
teer-betting-app/
├── backend/
│   ├── app/
│   │   ├── api/          # API endpoints
│   │   ├── models/       # Database models
│   │   ├── schemas/      # Pydantic schemas
│   │   └── services/     # Business logic
│   ├── Dockerfile        # Development
│   ├── Dockerfile.prod   # Production
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── pages/        # Page components
│   │   └── services/     # API services
│   ├── Dockerfile        # Development
│   ├── Dockerfile.prod   # Production
│   └── package.json
├── docker-compose.yml          # Development
├── docker-compose.prod.yml     # Production
├── docker-compose.test.yml     # Testing
└── Makefile                    # Management commands
```

## 🛠️ Development

### Available Make Commands

```bash
make help              # Show all available commands
make build             # Build development containers
make start             # Start development environment
make stop              # Stop all services
make restart           # Restart development environment
make logs              # Show logs for all services
make test              # Run all tests
make lint              # Run code linting
make clean             # Clean up Docker resources
```

### Manual Docker Commands

**Development Environment:**
```bash
# Build containers
docker-compose build

# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

**Production Environment:**
```bash
# Build production containers
docker-compose -f docker-compose.prod.yml build

# Start production services
docker-compose -f docker-compose.prod.yml up -d

# Stop production services
docker-compose -f docker-compose.prod.yml down
```

### Environment Configuration

Copy and modify environment files:

```bash
# Development
cp .env.development .env

# Production
cp .env.prod .env.production
```

**Important:** Update the following in production:
- `SECRET_KEY` - Use a strong random string
- `POSTGRES_PASSWORD` - Use a secure password
- `ALLOWED_ORIGINS` - Set to your domain
- `REACT_APP_API_BASE_URL` - Set to your API URL

## 🧪 Testing

### Run All Tests
```bash
make test
```

### Individual Test Suites
```bash
# Backend tests
make test-backend

# Frontend tests
make test-frontend

# Integration tests
make test-integration
```

### Manual Testing
```bash
# Setup test environment
docker-compose -f docker-compose.test.yml up -d

# Run backend tests
docker-compose -f docker-compose.test.yml exec backend-test python -m pytest

# Run frontend tests
docker-compose -f docker-compose.test.yml exec frontend-test npm test

# Cleanup
docker-compose -f docker-compose.test.yml down -v
```

## 🔒 Security

### Security Scanning
```bash
make security-scan
```

### Production Security Checklist

- [ ] Change all default passwords
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure firewall rules
- [ ] Enable database SSL connections
- [ ] Use non-root users in containers
- [ ] Regular security updates

## 📊 Monitoring

### Health Checks
```bash
make health
```

### Logs
```bash
# All services
make logs

# Specific service
make logs-backend
make logs-frontend
make logs-db
```

### Service Status
```bash
docker-compose ps
```

## 💾 Database Management

### Migrations
```bash
# Run migrations
make db-migrate

# Create new migration
docker-compose exec backend alembic revision --autogenerate -m "description"
```

### Backup & Restore
```bash
# Create backup
make db-backup

# Restore from backup
make db-restore BACKUP_FILE=backups/backup_20241225_120000.sql
```

### Database Access
```bash
# PostgreSQL shell
make shell-db

# pgAdmin interface
# http://localhost:5050
```

## 🚀 Deployment

### CI/CD Pipeline

The project includes GitHub Actions workflows for:
- Automated testing
- Security scanning
- Docker image building
- Deployment to staging/production

### Manual Deployment

1. **Build production images:**
```bash
make build-prod
```

2. **Deploy to production:**
```bash
make start-prod
```

3. **Run migrations:**
```bash
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

### Environment-Specific Deployments

**Staging:**
```bash
git push origin develop  # Triggers staging deployment
```

**Production:**
```bash
git push origin main     # Triggers production deployment
```

## 🔧 Troubleshooting

### Common Issues

1. **Port conflicts:**
```bash
# Check what's using ports
netstat -tulpn | grep :80
netstat -tulpn | grep :8001

# Stop conflicting services
sudo systemctl stop apache2
sudo systemctl stop nginx
```

2. **Database connection issues:**
```bash
# Check database status
docker-compose exec db pg_isready -U postgres

# Reset database
make db-reset
```

3. **Container build failures:**
```bash
# Clean build cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
```

4. **Permission issues:**
```bash
# Fix volume permissions
sudo chown -R $USER:$USER ./backend/uploads
sudo chown -R $USER:$USER ./backend/logs
```

### Debug Mode

Enable debug logging:
```bash
export DEBUG=True
docker-compose up
```

### Container Inspection

```bash
# Enter container shell
make shell-backend
make shell-frontend

# Inspect container
docker inspect teer_backend
docker inspect teer_frontend
```

## 📝 Environment Variables

### Backend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@db:5432/teer_betting` |
| `SECRET_KEY` | JWT secret key | `your-super-secret-key` |
| `DEBUG` | Enable debug mode | `True` |
| `ALLOWED_ORIGINS` | CORS allowed origins | `http://localhost:3000` |

### Frontend Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `REACT_APP_API_BASE_URL` | Backend API URL | `http://localhost:8001/api/v1` |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `make test`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the logs: `make logs`

---

**Happy Coding! 🎯**
