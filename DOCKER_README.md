# 🐳 Docker Compose Setup for Teer Betting App

This directory contains comprehensive Docker Compose configurations for running the Teer Betting Application in different environments.

## 📋 Table of Contents

- [Quick Start](#quick-start)
- [Environment Configurations](#environment-configurations)
- [Management Scripts](#management-scripts)
- [Service Architecture](#service-architecture)
- [Environment Variables](#environment-variables)
- [Port Mappings](#port-mappings)
- [Volume Management](#volume-management)
- [Monitoring & Logging](#monitoring--logging)
- [Backup & Restore](#backup--restore)
- [Troubleshooting](#troubleshooting)

## 🚀 Quick Start

### Prerequisites
- Docker 20.10+ installed
- Docker Compose 2.0+ installed
- At least 4GB RAM available
- 10GB free disk space

### Development Environment
```bash
# Using management script (recommended)
./manage.sh dev

# Or manually
docker-compose -f docker-compose.yml -f docker-compose.development.yml up -d
```

### Production Environment
```bash
# Create production environment file
cp .env.template .env.production
# Edit .env.production with production values

# Start production environment
./manage.sh prod
```

## 🔧 Environment Configurations

### 1. Development (`docker-compose.development.yml`)
**Purpose**: Local development with hot reload and debugging tools

**Features**:
- Hot reload for backend and frontend
- Development database with sample data
- Debug ports exposed
- Email testing with Mailhog
- Redis management UI
- File browser for uploads
- API documentation

**Services**: `db`, `backend`, `frontend`, `redis`, `pgadmin`, `redis-commander`, `mailhog`, `filebrowser`

### 2. Production (`docker-compose.production.yml`)
**Purpose**: Production deployment with security and performance optimizations

**Features**:
- Optimized resource limits
- SSL/TLS configuration
- Production-grade Nginx reverse proxy
- Monitoring with Prometheus and Grafana
- Automated backups
- Log aggregation
- Health checks

**Services**: `db`, `backend`, `frontend`, `redis`, `nginx`, `prometheus`, `grafana`, `backup`

### 3. Full Stack (`docker-compose.full.yml`)
**Purpose**: Complete development environment with all monitoring and logging tools

**Features**:
- All development features
- Complete ELK stack (Elasticsearch, Logstash, Kibana)
- Advanced monitoring
- Load balancing
- Complete observability

**Services**: All services from development + `elasticsearch`, `kibana`, `logstash`, `nginx`

## 🛠 Management Scripts

### PowerShell (Windows)
```powershell
# Start development environment
.\manage.ps1 dev

# View logs
.\manage.ps1 logs backend dev

# Create backup
.\manage.ps1 backup

# Clean up everything
.\manage.ps1 clean
```

### Bash (Linux/macOS)
```bash
# Start development environment
./manage.sh dev

# View logs
./manage.sh logs backend dev

# Create backup
./manage.sh backup

# Clean up everything
./manage.sh clean
```

### Available Commands
- `dev` - Start development environment
- `prod` - Start production environment
- `full` - Start full environment with monitoring
- `stop` - Stop all services
- `clean` - Remove all containers, volumes, and networks
- `logs [service] [env]` - Show service logs
- `backup` - Create database backup
- `restore <file>` - Restore database from backup
- `status` - Show current status
- `help` - Show help information

## 🏗 Service Architecture

### Core Services
```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Frontend  │    │   Backend   │    │  Database   │
│   (React)   │◄──►│  (FastAPI)  │◄──►│(PostgreSQL) │
│   Port: 80  │    │  Port: 8001 │    │ Port: 5434  │
└─────────────┘    └─────────────┘    └─────────────┘
                           │
                           ▼
                   ┌─────────────┐
                   │    Redis    │
                   │   (Cache)   │
                   │ Port: 6379  │
                   └─────────────┘
```

### Development Tools
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   pgAdmin   │  │Redis Command│  │   Mailhog   │
│ Port: 5050  │  │ Port: 8081  │  │ Port: 8025  │
└─────────────┘  └─────────────┘  └─────────────┘
```

### Monitoring Stack
```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│ Prometheus  │  │   Grafana   │  │   Kibana    │
│ Port: 9090  │  │ Port: 3000  │  │ Port: 5601  │
└─────────────┘  └─────────────┘  └─────────────┘
```

## 🔐 Environment Variables

Create environment files from the template:

```bash
cp .env.template .env.development
cp .env.template .env.production
```

### Key Variables

**Database**:
- `POSTGRES_DB` - Database name
- `POSTGRES_USER` - Database user
- `POSTGRES_PASSWORD` - Database password
- `DATABASE_URL` - Full database connection string

**Security**:
- `SECRET_KEY` - Application secret key (minimum 32 characters)
- `JWT_SECRET_KEY` - JWT token secret
- `ALLOWED_ORIGINS` - CORS allowed origins

**Application**:
- `ENVIRONMENT` - Application environment (development/production)
- `DEBUG` - Enable debug mode (true/false)
- `LOG_LEVEL` - Logging level (DEBUG/INFO/WARNING/ERROR)

## 🔌 Port Mappings

### Development Environment
| Service | Internal Port | External Port | Description |
|---------|---------------|---------------|-------------|
| Frontend | 80 | 80 | React application |
| Backend | 8000 | 8001 | FastAPI application |
| Database | 5432 | 5434 | PostgreSQL database |
| Redis | 6379 | 6379 | Redis cache |
| pgAdmin | 80 | 5050 | Database management |
| Redis Commander | 8081 | 8081 | Redis management |
| Mailhog SMTP | 1025 | 1025 | Email testing |
| Mailhog Web | 8025 | 8025 | Email web interface |
| File Browser | 80 | 8080 | File management |

### Production Environment
| Service | Internal Port | External Port | Description |
|---------|---------------|---------------|-------------|
| Nginx | 80/443 | 80/443 | Reverse proxy |
| Grafana | 3000 | 3000 | Monitoring dashboard |

## 💾 Volume Management

### Persistent Volumes
- `postgres_data` - Database data
- `redis_data` - Redis persistence
- `pgadmin_data` - pgAdmin configuration
- `grafana_data` - Grafana dashboards and settings
- `prometheus_data` - Prometheus metrics
- `backend_logs` - Application logs
- `nginx_logs` - Web server logs

### Backup Volumes
```bash
# Create manual backup
docker run --rm -v teer_postgres_data:/data -v $(pwd)/backup:/backup alpine tar czf /backup/postgres_backup.tar.gz -C /data .

# Restore from backup
docker run --rm -v teer_postgres_data:/data -v $(pwd)/backup:/backup alpine tar xzf /backup/postgres_backup.tar.gz -C /data
```

## 📊 Monitoring & Logging

### Prometheus Metrics
Available at `http://localhost:9090`

**Custom Metrics**:
- Application performance metrics
- Database connection pool status
- Redis cache hit rates
- API endpoint response times

### Grafana Dashboards
Available at `http://localhost:3000`

**Default Dashboards**:
- Application Overview
- Database Performance
- API Performance
- Infrastructure Monitoring

### Log Aggregation
**Development**: Logs available via `docker-compose logs`
**Production**: ELK stack with Kibana at `http://localhost:5601`

## 🔄 Backup & Restore

### Automated Backups
Production environment includes automated daily backups:
- Schedule: 2 AM daily
- Retention: 30 days
- Location: `./backups/`

### Manual Backup
```bash
# Create backup
./manage.sh backup

# List backups
ls -la backups/
```

### Manual Restore
```bash
# Restore from backup
./manage.sh restore backups/backup_20231201_020000.sql
```

## 🔧 Troubleshooting

### Common Issues

**1. Port Already in Use**
```bash
# Check what's using the port
netstat -tulpn | grep :80
# or on Windows
netstat -ano | findstr :80

# Stop conflicting services
sudo systemctl stop apache2  # Linux
net stop w3svc               # Windows IIS
```

**2. Permission Denied**
```bash
# Fix file permissions
sudo chown -R $USER:$USER .
chmod +x manage.sh

# Fix Docker permissions (Linux)
sudo usermod -aG docker $USER
```

**3. Out of Memory**
```bash
# Check Docker memory usage
docker stats

# Increase Docker memory limits in Docker Desktop
# Or adjust resource limits in compose files
```

**4. Database Connection Issues**
```bash
# Check database logs
docker-compose logs db

# Test database connection
docker exec -it teer_db psql -U postgres -d teer_betting

# Reset database
docker-compose down -v
docker-compose up -d
```

### Health Checks

**Check Service Status**:
```bash
./manage.sh status
```

**Check Service Health**:
```bash
# Backend health
curl http://localhost:8001/health

# Database health
docker exec teer_db pg_isready -U postgres

# Redis health
docker exec teer_redis redis-cli ping
```

### Performance Tuning

**Database Optimization**:
- Adjust `shared_buffers` in PostgreSQL config
- Monitor slow queries with pgAdmin
- Use connection pooling

**Redis Optimization**:
- Configure memory limits
- Enable AOF persistence for durability
- Monitor memory usage

**Application Optimization**:
- Enable Gzip compression in Nginx
- Use Redis for session storage
- Implement API caching

## 📚 Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Redis Docker Hub](https://hub.docker.com/_/redis)
- [Nginx Docker Hub](https://hub.docker.com/_/nginx)

## 🤝 Contributing

When adding new services:
1. Add service to appropriate compose file
2. Update this README
3. Add health checks
4. Update management scripts
5. Test in all environments

## 📄 License

This Docker configuration is part of the Teer Betting Application project.
