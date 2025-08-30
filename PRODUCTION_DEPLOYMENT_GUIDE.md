# 🚀 **Teer Betting App - Production Deployment Guide**

## 📋 **Quick Deployment (Recommended)**

### **One-Command Deployment**
```bash
# On your VPS, run:
curl -fsSL https://raw.githubusercontent.com/rtsant123/teer-betting-app/main/deploy-production-v2.sh | bash
```

**This single command will:**
- ✅ Install Docker & Docker Compose
- ✅ Configure firewall and security
- ✅ Clone the repository
- ✅ Generate secure passwords
- ✅ Build and deploy the application
- ✅ Initialize the database
- ✅ Set up auto-start services
- ✅ Create maintenance scripts

---

## 🌐 **Environment Configuration**

### **For VPS Deployment (IP-only)**
The script will automatically detect your VPS IP and configure:
- **Frontend**: `http://YOUR_VPS_IP`
- **Backend API**: `http://YOUR_VPS_IP:8001`
- **API Documentation**: `http://YOUR_VPS_IP:8001/docs`
- **Database Admin**: `http://YOUR_VPS_IP:5050`

### **For Domain-based Deployment**
When prompted, enter your domain name. The script will configure:
- **Frontend**: `https://yourdomain.com`
- **Backend API**: Proxied through frontend
- **API Documentation**: `https://yourdomain.com/api/v1/docs`

---

## ⚙️ **Manual Environment Setup**

If you need to customize settings manually, copy `.env.production` and modify:

```bash
# Copy production template
cp .env.production .env

# Edit configuration
nano .env
```

### **Critical Settings to Change:**

```env
# Database - Change password
POSTGRES_PASSWORD=your-strong-password-here

# Security - Generate strong key
SECRET_KEY=your-64-character-secret-key-here

# Domain/IP Configuration
DOMAIN=yourdomain.com
VPS_IP=your.vps.ip.address

# API URLs
REACT_APP_API_BASE_URL=/api/v1  # For domain
# OR
REACT_APP_API_BASE_URL=http://your.vps.ip:8001/api/v1  # For IP only

# CORS Origins
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
# OR
ALLOWED_ORIGINS=http://your.vps.ip,http://your.vps.ip:80
```

---

## 🔧 **Manual Deployment Steps**

### **1. VPS Prerequisites**
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

# Logout and login to apply docker group
```

### **2. Clone Repository**
```bash
git clone https://github.com/rtsant123/teer-betting-app.git
cd teer-betting-app
```

### **3. Configure Environment**
```bash
# Copy and customize environment
cp .env.production .env
nano .env  # Edit configuration
```

### **4. Deploy Application**
```bash
# Build and start services
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d

# Initialize database
docker-compose -f docker-compose.prod.yml exec backend python init_db_robust.py

# Create admin user
docker-compose -f docker-compose.prod.yml exec backend python create_admin_user.py
```

### **5. Configure Firewall**
```bash
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 8001/tcp
sudo ufw enable
```

---

## 🔍 **Health Checks & Troubleshooting**

### **Check Service Status**
```bash
# View running containers
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs frontend
docker-compose -f docker-compose.prod.yml logs backend
docker-compose -f docker-compose.prod.yml logs db

# Test API
curl http://localhost:8001/health
curl http://localhost:8001/api/v1/rounds/houses
```

### **Common Issues & Solutions**

#### **Frontend Not Loading**
```bash
# Check if frontend container is running
docker ps | grep frontend

# Check nginx configuration
docker-compose -f docker-compose.prod.yml logs frontend

# Rebuild frontend
docker-compose -f docker-compose.prod.yml build --no-cache frontend
docker-compose -f docker-compose.prod.yml up -d frontend
```

#### **Backend API Not Responding**
```bash
# Check backend logs
docker-compose -f docker-compose.prod.yml logs backend

# Check database connection
docker-compose -f docker-compose.prod.yml exec backend python -c "from app.database import engine; print('DB connected')"

# Restart backend
docker-compose -f docker-compose.prod.yml restart backend
```

#### **Database Issues**
```bash
# Check database status
docker-compose -f docker-compose.prod.yml exec db pg_isready -U teer_admin

# Access database
docker-compose -f docker-compose.prod.yml exec db psql -U teer_admin -d teer_betting_prod

# Reinitialize database
docker-compose -f docker-compose.prod.yml exec backend python init_db_robust.py
```

---

## 🛠️ **Maintenance Commands**

### **Update Application**
```bash
cd /opt/teer-betting-app
git pull origin main
docker-compose -f docker-compose.prod.yml build --no-cache
docker-compose -f docker-compose.prod.yml up -d
```

### **Backup Database**
```bash
# Create backup
docker-compose -f docker-compose.prod.yml exec db pg_dump -U teer_admin teer_betting_prod > backup_$(date +%Y%m%d).sql

# Restore backup
docker-compose -f docker-compose.prod.yml exec -T db psql -U teer_admin -d teer_betting_prod < backup_file.sql
```

### **Monitor Resources**
```bash
# Check resource usage
docker stats

# Check disk space
df -h

# Check memory usage
free -h

# View system load
htop
```

### **Clean Up**
```bash
# Remove unused Docker images
docker system prune -f

# Remove old log files
find /var/log -name "*.log" -mtime +30 -delete
```

---

## 🔒 **Security Best Practices**

### **1. Change Default Passwords**
- Database password
- Secret key (minimum 64 characters)
- Redis password
- pgAdmin password

### **2. Configure Firewall**
```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

### **3. SSL/HTTPS Setup (for domains)**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Update environment
echo "FORCE_HTTPS=True" >> .env
docker-compose -f docker-compose.prod.yml restart
```

### **4. Regular Updates**
```bash
# Set up auto-updates (optional)
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

---

## 📊 **Production URLs**

### **IP-based Deployment**
- **Application**: `http://YOUR_VPS_IP`
- **API**: `http://YOUR_VPS_IP:8001`
- **API Docs**: `http://YOUR_VPS_IP:8001/docs`
- **Database Admin**: `http://YOUR_VPS_IP:5050`

### **Domain-based Deployment**
- **Application**: `https://yourdomain.com`
- **API**: `https://yourdomain.com/api/v1`
- **API Docs**: `https://yourdomain.com/api/v1/docs`

---

## 🆘 **Support & Resources**

### **Log Files**
- Application logs: `docker-compose logs`
- System logs: `/var/log/syslog`
- Deployment logs: `/var/log/teer-deploy.log`

### **Useful Commands**
```bash
# Quick status check
~/teer-status.sh

# View recent logs
~/teer-logs.sh

# Create backup
~/teer-backup.sh

# Restart application
cd /opt/teer-betting-app && docker-compose -f docker-compose.prod.yml restart
```

### **Performance Tuning**
```bash
# For VPS with limited RAM, add swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## ✅ **Deployment Checklist**

- [ ] VPS meets minimum requirements (2GB RAM, 20GB storage)
- [ ] Domain DNS pointed to VPS IP (if using domain)
- [ ] Firewall configured and enabled
- [ ] Environment variables configured
- [ ] Application deployed and running
- [ ] Database initialized
- [ ] Admin user created
- [ ] SSL certificate installed (for domains)
- [ ] Backup strategy implemented
- [ ] Monitoring set up

---

**🎉 Your Teer Betting App is now ready for production!**
