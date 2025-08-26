# 🚀 Teer Betting App - Deployment Checklist

## ✅ Pre-Deployment Checklist

### 📋 Prerequisites
- [ ] Docker Desktop installed and running
- [ ] Git repository initialized
- [ ] Environment variables configured
- [ ] Database credentials secured
- [ ] SSL certificates obtained (for production)

### 🔧 Local Development Setup

1. **Clone and Setup:**
```bash
git clone <your-repo-url>
cd teer-betting-app
```

2. **Quick Start (Windows):**
```powershell
.\quick-start.ps1
```

3. **Manual Setup:**
```bash
# Copy environment file
cp .env.development .env

# Build and start
docker-compose build
docker-compose up -d

# Run migrations
docker-compose exec backend alembic upgrade head
```

### 🧪 Testing Checklist

- [ ] Backend tests pass: `docker-compose -f docker-compose.test.yml exec backend-test python -m pytest`
- [ ] Frontend tests pass: `docker-compose -f docker-compose.test.yml exec frontend-test npm test`
- [ ] Integration tests pass
- [ ] Security scan clean: `make security-scan`
- [ ] Code linting passes: `make lint`

### 🔒 Security Checklist

- [ ] Update `SECRET_KEY` in production environment
- [ ] Change default database passwords
- [ ] Configure `ALLOWED_ORIGINS` for production domain
- [ ] Enable HTTPS with SSL certificates
- [ ] Set up firewall rules
- [ ] Configure backup strategy
- [ ] Enable database SSL connections
- [ ] Use non-root users in containers

### 🌍 Production Environment Setup

#### 1. Server Requirements
- [ ] Ubuntu 20.04+ or similar Linux distribution
- [ ] Docker and Docker Compose installed
- [ ] Minimum 4GB RAM, 2 CPU cores
- [ ] At least 20GB free disk space
- [ ] Domain name configured
- [ ] SSL certificate installed

#### 2. Environment Configuration
```bash
# Copy and edit production environment
cp .env.prod .env.production

# Update these critical values:
- SECRET_KEY=<your-super-secure-secret-key>
- POSTGRES_PASSWORD=<secure-database-password>
- ALLOWED_ORIGINS=https://yourdomain.com
- REACT_APP_API_BASE_URL=https://yourdomain.com/api/v1
```

#### 3. SSL Setup (Nginx)
```bash
# Create SSL directory
mkdir -p nginx/ssl

# Place your SSL certificates
cp your-cert.pem nginx/ssl/cert.pem
cp your-key.pem nginx/ssl/key.pem
```

### 🚀 Deployment Steps

#### Option A: GitHub Actions Deployment

1. **Setup Repository Secrets:**
   - [ ] `PRODUCTION_HOST` - Server IP/hostname
   - [ ] `PRODUCTION_USER` - SSH username
   - [ ] `PRODUCTION_SSH_KEY` - SSH private key
   - [ ] `SLACK_WEBHOOK` - Slack notification webhook (optional)

2. **Deploy:**
```bash
git push origin main  # Triggers automatic deployment
```

#### Option B: Manual Production Deployment

1. **On Production Server:**
```bash
# Clone repository
git clone <your-repo-url> /opt/teer-betting-app
cd /opt/teer-betting-app

# Copy and configure environment
cp .env.prod .env.production
# Edit .env.production with your values

# Build and start production services
docker-compose -f docker-compose.prod.yml build
docker-compose -f docker-compose.prod.yml up -d

# Run migrations
docker-compose -f docker-compose.prod.yml exec backend alembic upgrade head
```

2. **Verify Deployment:**
```bash
# Check service status
docker-compose -f docker-compose.prod.yml ps

# Test health endpoint
curl -f http://localhost:8001/health

# Check logs
docker-compose -f docker-compose.prod.yml logs
```

### 📊 Monitoring Setup

#### Health Monitoring
- [ ] Backend health: `http://your-domain.com/health`
- [ ] Frontend accessibility: `http://your-domain.com`
- [ ] Database connectivity
- [ ] API response times

#### Logging
```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f db
```

#### Backup Strategy
```bash
# Manual backup
make db-backup

# Automated backup (add to crontab)
0 2 * * * cd /opt/teer-betting-app && make db-backup
```

### 🔄 Continuous Deployment

#### GitHub Repository Setup

1. **Initialize Repository:**
```bash
git init
git add .
git commit -m "Initial commit: Complete Docker setup"
git branch -M main
git remote add origin https://github.com/yourusername/teer-betting-app.git
git push -u origin main
```

2. **Branch Strategy:**
- `main` - Production branch (auto-deploys)
- `develop` - Development branch (deploys to staging)
- `feature/*` - Feature branches (runs tests only)

#### Environment-Specific Deployments

**Development:**
```bash
git checkout develop
# Make changes
git push origin develop  # Triggers development deployment
```

**Production:**
```bash
git checkout main
git merge develop
git push origin main     # Triggers production deployment
```

### 🛠️ Maintenance Commands

#### Common Operations
```powershell
# Windows PowerShell
.\manage.ps1 help           # Show all commands
.\manage.ps1 start          # Start development
.\manage.ps1 start production # Start production
.\manage.ps1 test          # Run all tests
.\manage.ps1 logs          # View logs
.\manage.ps1 health        # Check health
.\manage.ps1 clean         # Clean up
```

```bash
# Linux/Mac with Make
make help           # Show all commands
make start          # Start development
make start-prod     # Start production
make test           # Run all tests
make logs           # View logs
make health         # Check health
make clean          # Clean up
```

#### Database Operations
```bash
# Run migrations
docker-compose exec backend alembic upgrade head

# Create backup
make db-backup

# Restore backup
make db-restore BACKUP_FILE=backups/backup_20241225_120000.sql

# Reset database (DANGER!)
make db-reset
```

### 🚨 Troubleshooting

#### Common Issues

**Port Conflicts:**
```bash
# Check what's using ports
netstat -tulpn | grep :80
netstat -tulpn | grep :8001

# Stop conflicting services
sudo systemctl stop apache2
sudo systemctl stop nginx
```

**Database Issues:**
```bash
# Check database status
docker-compose exec db pg_isready -U postgres

# Reset database
make db-reset
```

**Container Issues:**
```bash
# Rebuild containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Clean Docker cache
docker system prune -a
```

**Permission Issues:**
```bash
# Fix upload directory permissions
sudo chown -R $USER:$USER ./backend/uploads
sudo chown -R $USER:$USER ./backend/logs
```

### 📞 Support

If you encounter issues:

1. **Check logs:** `docker-compose logs -f`
2. **Verify services:** `docker-compose ps`
3. **Test connectivity:** `curl http://localhost:8001/health`
4. **Review environment:** Check `.env` files
5. **Check disk space:** `df -h`
6. **Review documentation:** `DOCKER_COMPLETE_GUIDE.md`

### ✅ Post-Deployment Verification

- [ ] All services running: `docker-compose ps`
- [ ] Backend health check: `curl http://localhost:8001/health`
- [ ] Frontend loading: `curl http://localhost:80`
- [ ] Database accessible: `docker-compose exec db pg_isready`
- [ ] API documentation: `http://localhost:8001/api/v1/docs`
- [ ] Admin panel functional
- [ ] User registration/login working
- [ ] Betting functionality operational
- [ ] Wallet operations functional
- [ ] File uploads working

### 🎯 Success Metrics

- [ ] Application loads in < 3 seconds
- [ ] API response time < 500ms
- [ ] Zero critical security vulnerabilities
- [ ] 99.9% uptime
- [ ] Automated backups running
- [ ] SSL certificate valid
- [ ] All tests passing

---

**🎉 Congratulations! Your Teer Betting App is now deployed and ready for users!**

For ongoing maintenance and updates, refer to the management scripts and monitoring setup above.
