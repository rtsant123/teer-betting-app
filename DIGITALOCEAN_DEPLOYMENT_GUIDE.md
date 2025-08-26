# DigitalOcean Deployment Guide for Teer Betting App

## 🌊 DigitalOcean Droplet Setup

### Step 1: Create a Droplet
1. Go to [DigitalOcean](https://www.digitalocean.com)
2. Click **"Create"** → **"Droplets"**
3. **Choose Image**: Ubuntu 22.04 LTS x64
4. **Choose Size**: 
   - **Recommended**: Basic $12/month (2GB RAM, 1 vCPU, 50GB SSD)
   - **Budget**: Basic $6/month (1GB RAM, 1 vCPU, 25GB SSD)
5. **Choose Region**: Select closest to your users
6. **Authentication**: Add your SSH key or use password
7. **Hostname**: `teer-betting-app`
8. Click **"Create Droplet"**

### Step 2: Connect to Your Droplet
```bash
# Using SSH (replace YOUR_DROPLET_IP)
ssh root@YOUR_DROPLET_IP

# If using password, enter it when prompted
```

### Step 3: Initial Server Setup
```bash
# Update system
apt update && apt upgrade -y

# Create a new user (optional but recommended)
adduser teer
usermod -aG sudo teer
usermod -aG docker teer

# Switch to new user
su - teer
```

## 🚀 Automated Deployment

### Option 1: One-Command Deployment (Recommended)
```bash
# Run this single command on your droplet:
curl -fsSL https://raw.githubusercontent.com/rtsant123/teer-betting-app/main/vps-deploy.sh | bash
```

### Option 2: Manual Step-by-Step
```bash
# 1. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 2. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 3. Logout and login to apply docker group
exit
ssh root@YOUR_DROPLET_IP
su - teer

# 4. Clone repository
git clone https://github.com/rtsant123/teer-betting-app.git
cd teer-betting-app

# 5. Configure environment
cp .env.vps.example .env.vps

# Get your droplet IP
DROPLET_IP=$(curl -s https://ipv4.icanhazip.com)
echo "Your Droplet IP: $DROPLET_IP"

# 6. Update environment file
sed -i "s/YOUR_VPS_IP/$DROPLET_IP/g" .env.vps

# Generate secure passwords
SECRET_KEY=$(openssl rand -base64 32)
DB_PASSWORD=$(openssl rand -base64 16)
sed -i "s/change_this_to_a_very_secure_random_string_at_least_32_characters/$SECRET_KEY/g" .env.vps
sed -i "s/change_this_secure_password/$DB_PASSWORD/g" .env.vps

# 7. Deploy application
docker-compose -f docker-compose.vps.yml --env-file .env.vps up -d --build

# 8. Initialize database
sleep 30
docker-compose -f docker-compose.vps.yml exec backend python init_db.py
```

## 🔐 Security Setup

### Configure Firewall
```bash
# Install and configure UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 8000/tcp  # Backend API
sudo ufw enable
```

### Optional: Setup Domain and SSL
```bash
# If you have a domain name pointing to your droplet:

# 1. Install Nginx (for reverse proxy)
sudo apt install nginx

# 2. Install Certbot for SSL
sudo apt install certbot python3-certbot-nginx

# 3. Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# 4. Configure Nginx reverse proxy (see nginx config below)
```

## 🌐 Access Your Application

### After Deployment:
- **Frontend**: `http://YOUR_DROPLET_IP:3000`
- **Backend API**: `http://YOUR_DROPLET_IP:8000`
- **API Documentation**: `http://YOUR_DROPLET_IP:8000/docs`
- **Database Admin**: `http://YOUR_DROPLET_IP:5050`

### With Domain (Optional):
- **Frontend**: `https://yourdomain.com`
- **Backend API**: `https://api.yourdomain.com`

## 📊 Resource Usage (2GB Droplet)

### Expected Memory Usage:
- **PostgreSQL**: ~200-300MB
- **Redis**: ~50-100MB
- **Backend**: ~150-200MB
- **Frontend**: ~20-50MB
- **System**: ~300-400MB
- **Free**: ~1GB+ available

### Performance Tips:
1. **Enable Swap**: 1GB swap file created automatically
2. **Database Optimization**: Connection limits set for 2GB RAM
3. **Container Limits**: Memory limits prevent overconsumption
4. **Nginx Caching**: Static file caching enabled

## 🔧 Management Commands

### Application Management:
```bash
# View application status
docker-compose -f docker-compose.vps.yml ps

# View logs
docker-compose -f docker-compose.vps.yml logs -f

# Restart application
docker-compose -f docker-compose.vps.yml restart

# Stop application
docker-compose -f docker-compose.vps.yml down

# Update application
git pull origin main
docker-compose -f docker-compose.vps.yml build
docker-compose -f docker-compose.vps.yml up -d
```

### System Monitoring:
```bash
# Check resource usage
htop
docker stats

# Check disk usage
df -h

# Check memory usage
free -h
```

### Database Backup:
```bash
# Create backup
docker-compose -f docker-compose.vps.yml exec db pg_dump -U teer_user teer_betting > backup_$(date +%Y%m%d).sql

# Restore backup
docker-compose -f docker-compose.vps.yml exec -T db psql -U teer_user teer_betting < backup_file.sql
```

## 🌍 Domain Configuration (Optional)

### Nginx Reverse Proxy Config:
Create `/etc/nginx/sites-available/teer-betting`:
```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/teer-betting /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 💰 Cost Breakdown

### DigitalOcean Pricing:
- **$6/month**: 1GB RAM, 1 vCPU, 25GB SSD (tight but works)
- **$12/month**: 2GB RAM, 1 vCPU, 50GB SSD (recommended)
- **$18/month**: 2GB RAM, 2 vCPU, 60GB SSD (optimal performance)

### Additional Services:
- **Domain**: $10-15/year
- **Backups**: $1.20/month (20% of droplet cost)
- **Load Balancer**: $12/month (if needed later)

## 🆘 Troubleshooting

### Common Issues:
1. **Out of Memory**: Add swap space or upgrade droplet
2. **Port Access**: Check UFW firewall rules
3. **Docker Permissions**: Add user to docker group
4. **Database Connection**: Check container network connectivity

### Getting Help:
```bash
# Check all services
docker-compose -f docker-compose.vps.yml ps

# Check specific service logs
docker-compose -f docker-compose.vps.yml logs backend

# Check system resources
free -h && df -h

# Check network connectivity
curl http://localhost:8000/health
```

---

## 🎉 Quick Start Summary

1. **Create DigitalOcean Droplet** (Ubuntu 22.04, 2GB RAM)
2. **SSH into droplet**: `ssh root@YOUR_DROPLET_IP`
3. **Run deployment script**: `curl -fsSL https://raw.githubusercontent.com/rtsant123/teer-betting-app/main/vps-deploy.sh | bash`
4. **Access your app**: `http://YOUR_DROPLET_IP:3000`

**Total Setup Time**: 10-15 minutes
**Monthly Cost**: $12 (2GB RAM droplet)
**Perfect for**: Production deployment with full control
