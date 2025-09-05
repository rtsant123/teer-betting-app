# 🚀 PRODUCTION DEPLOYMENT GUIDE - VPS (1GB RAM)
**Target VPS:** `178.128.61.118`  
**Optimized for:** 1GB RAM Ubuntu Server

---

## 📋 Pre-Deployment Checklist

### ✅ VPS Requirements
- **OS:** Ubuntu 20.04/22.04 LTS
- **RAM:** 1GB (minimum)
- **Storage:** 20GB+ SSD
- **Network:** Public IP assigned
- **Access:** SSH root/sudo access

### ✅ Repository Status
- ✅ Fixed CORS configuration for VPS IP
- ✅ Optimized Docker containers for 1GB RAM
- ✅ Enhanced transaction details in admin panel
- ✅ Centralized API endpoints
- ✅ Production environment configuration

---

## 🔧 STEP 1: VPS Initial Setup

### SSH into your VPS:
```bash
ssh root@178.128.61.118
```

### Run the VPS setup script:
```bash
# Download and run VPS setup
curl -fsSL https://raw.githubusercontent.com/rtsant123/teer-betting-app/main/vps-setup.sh -o vps-setup.sh
chmod +x vps-setup.sh
./vps-setup.sh
```

**What this does:**
- 🔄 Updates system packages
- 🐳 Installs Docker & Docker Compose
- 👤 Creates deploy user with sudo access
- 🔥 Configures firewall (ports 22, 80, 443, 8000)
- 💾 Sets up 1GB swap file for memory optimization
- 📁 Clones your application repository
- 📊 Installs monitoring tools

---

## 🚀 STEP 2: Application Deployment

### Switch to deploy user:
```bash
sudo su - deploy
cd /home/deploy/teer-betting-app
```

### Run the production deployment:
```bash
./deploy-production-vps.sh
```

**What this does:**
- ⚙️ Configures environment for your VPS IP
- 🧠 Optimizes memory settings for 1GB RAM
- 🔨 Builds optimized Docker containers
- 🚀 Starts all services with resource limits
- 💾 Initializes database with migrations
- 👤 Creates admin user
- 💳 Sets up payment methods
- 🏥 Performs comprehensive health checks

---

## 🎯 Access Your Application

After successful deployment:

### 🌐 Frontend (User Interface)
```
http://178.128.61.118
```

### 🛠️ Admin Panel
```
http://178.128.61.118/admin
```
**Login with:** admin credentials created during setup

### 📚 API Documentation
```
http://178.128.61.118:8000/api/v1/docs
```

### ❤️ Health Check
```
http://178.128.61.118:8000/health
```

---

## 🔧 Production Optimizations Applied

### 📊 Memory Optimization (1GB RAM)
- **Backend:** 300MB limit, 1 worker, 2 threads
- **Frontend:** 150MB limit
- **Database:** 400MB limit, optimized PostgreSQL settings
- **Redis:** 100MB limit with LRU eviction

### 🌐 CORS & Networking
- ✅ Fixed CORS for VPS IP: `178.128.61.118`
- ✅ Centralized endpoint configuration
- ✅ Container networking optimized
- ✅ API base URL properly configured

### 🔐 Security Enhancements
- 👤 Non-root container execution
- 🔥 UFW firewall configured
- 🛡️ Fail2ban protection
- 🔑 Strong password generation

### 📈 Performance Tuning
- ⚡ Multi-stage Docker builds
- 🗜️ Compressed image layers
- 💾 Optimized PostgreSQL configuration
- 🔄 Health checks with proper intervals

---

## 📋 Post-Deployment Verification

### 1. Check Container Status
```bash
docker-compose -f docker-compose.prod-optimized.yml ps
```

### 2. Monitor Resource Usage
```bash
docker stats
```

### 3. View Application Logs
```bash
docker-compose -f docker-compose.prod-optimized.yml logs -f
```

### 4. Test API Endpoints
```bash
# Health check
curl http://178.128.61.118:8000/health

# API documentation
curl http://178.128.61.118:8000/api/v1/docs
```

---

## 🛠️ Management Commands

### 🔄 Restart Services
```bash
cd /home/deploy/teer-betting-app
docker-compose -f docker-compose.prod-optimized.yml restart
```

### 📊 View Real-time Logs
```bash
docker-compose -f docker-compose.prod-optimized.yml logs -f backend
docker-compose -f docker-compose.prod-optimized.yml logs -f frontend
```

### 💾 Database Backup
```bash
docker-compose -f docker-compose.prod-optimized.yml exec db pg_dump -U teer_admin teer_betting_prod > backup_$(date +%Y%m%d).sql
```

### 🔄 Update Application
```bash
git pull origin main
docker-compose -f docker-compose.prod-optimized.yml build --no-cache
docker-compose -f docker-compose.prod-optimized.yml up -d
```

---

## 🚨 Troubleshooting

### Memory Issues
```bash
# Check memory usage
free -h
htop

# Reduce container memory if needed
docker-compose -f docker-compose.prod-optimized.yml down
# Edit .env file to reduce memory limits
docker-compose -f docker-compose.prod-optimized.yml up -d
```

### Container Won't Start
```bash
# Check logs
docker-compose -f docker-compose.prod-optimized.yml logs container_name

# Rebuild if needed
docker-compose -f docker-compose.prod-optimized.yml build --no-cache container_name
```

### Database Connection Issues
```bash
# Check database status
docker-compose -f docker-compose.prod-optimized.yml exec db pg_isready -U teer_admin

# Reset database if needed
docker-compose -f docker-compose.prod-optimized.yml exec backend python -m alembic upgrade head
```

---

## 📈 Monitoring & Maintenance

### Daily Monitoring
- 📊 Check `docker stats` for resource usage
- 📝 Review logs for errors
- 💾 Verify database backups
- 🌐 Test application accessibility

### Weekly Maintenance
- 🔄 Update system packages
- 🧹 Clean up Docker resources: `docker system prune -f`
- 📋 Review application logs
- 💾 Test backup restoration

---

## 🎉 Success Metrics

Your deployment is successful when:
- ✅ All containers are running (`docker ps`)
- ✅ Health checks pass
- ✅ Frontend loads at `http://178.128.61.118`
- ✅ Admin panel accessible
- ✅ API documentation available
- ✅ Memory usage under 80%
- ✅ Response times under 2 seconds

---

## 📞 Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review container logs
3. Ensure VPS has sufficient resources
4. Verify network connectivity

**Your production-ready Teer Betting App is now deployed! 🚀**
