# VPS Deployment Guide for Teer Betting App (2GB RAM)

## System Requirements
- ✅ 2GB RAM VPS (sufficient for this app)
- ✅ Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- ✅ Docker and Docker Compose installed
- ✅ Domain name (optional but recommended)

## Quick VPS Setup

### 1. Install Docker & Docker Compose
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login again to apply docker group
```

### 2. Clone Your Repository
```bash
git clone https://github.com/rtsant123/teer-betting-app.git
cd teer-betting-app
```

### 3. Create VPS Environment File
Create `.env.vps` with optimized settings for 2GB RAM:
```env
# Database Settings (Optimized for 2GB RAM)
DATABASE_URL=postgresql://teer_user:your_secure_password@db:5432/teer_betting
POSTGRES_USER=teer_user
POSTGRES_PASSWORD=your_secure_password
POSTGRES_DB=teer_betting

# Redis Settings
REDIS_URL=redis://redis:6379/0

# Backend Settings
SECRET_KEY=your_very_secure_secret_key_here_change_this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
ENVIRONMENT=production

# Frontend Settings
REACT_APP_API_URL=http://your-vps-ip:8000
```

### 4. Deploy with Optimized Configuration
Use the lightweight production setup:
```bash
# Set environment
export COMPOSE_FILE=docker-compose.vps.yml

# Start services
docker-compose up -d

# Initialize database
docker-compose exec backend python init_db.py
```

## VPS Optimization Tips

### Memory Usage (Expected):
- **PostgreSQL**: ~200-300MB
- **Redis**: ~50-100MB  
- **Backend (FastAPI)**: ~150-200MB
- **Frontend (Nginx)**: ~20-50MB
- **Total**: ~500-700MB (leaving 1.3GB+ free)

### Performance Optimizations:
1. **PostgreSQL** - Limited connections and memory
2. **Redis** - Small memory allocation
3. **Nginx** - Lightweight static serving
4. **Python** - Single worker process

### Security Setup:
```bash
# Basic firewall
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable

# Optional: Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx
```

## Domain Configuration (Optional)

### With Domain Name:
1. Point your domain A record to your VPS IP
2. Update `.env.vps`:
   ```env
   REACT_APP_API_URL=https://api.yourdomain.com
   ```
3. Setup Nginx reverse proxy and SSL

### Without Domain (IP Access):
- Frontend: `http://your-vps-ip:3000`
- Backend API: `http://your-vps-ip:8000`
- API Docs: `http://your-vps-ip:8000/docs`

## Maintenance Commands

```bash
# View logs
docker-compose logs -f

# Update application
git pull origin main
docker-compose build
docker-compose up -d

# Backup database
docker-compose exec db pg_dump -U teer_user teer_betting > backup.sql

# Monitor resources
docker stats
htop
```

## Troubleshooting

### If Memory Issues:
1. Add swap space: `sudo fallocate -l 1G /swapfile`
2. Reduce PostgreSQL memory settings
3. Use Redis with smaller memory allocation

### If Performance Issues:
1. Enable Nginx gzip compression
2. Add Redis caching
3. Optimize PostgreSQL queries

---

**Total Setup Time**: 15-20 minutes
**Memory Usage**: ~600-700MB 
**Perfect for**: 2GB RAM VPS deployment
