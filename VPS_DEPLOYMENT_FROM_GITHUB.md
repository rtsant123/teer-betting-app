# 🚀 **VPS Deployment from GitHub - Complete Guide**

## 📋 **Prerequisites**

### **VPS Requirements**
- ✅ **RAM**: 2GB minimum (4GB recommended)
- ✅ **Storage**: 20GB minimum  
- ✅ **OS**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- ✅ **Access**: SSH root or sudo access

### **Before Starting**
- 🔑 SSH access to your VPS
- 🌐 Domain name (optional but recommended)
- 📧 Email for SSL certificates (if using domain)

---

## 🎯 **Option 1: One-Command Deployment (Recommended)**

### **Step 1: Connect to Your VPS**
```bash
ssh root@YOUR_VPS_IP
# or
ssh username@YOUR_VPS_IP
```

### **Step 2: Run Auto-Deploy Script**
```bash
# Single command that does everything:
curl -fsSL https://raw.githubusercontent.com/rtsant123/teer-betting-app/main/vps-deploy.sh | bash
```

**This script automatically:**
- ✅ Updates system packages
- ✅ Installs Docker & Docker Compose
- ✅ Configures firewall
- ✅ Clones your GitHub repository
- ✅ Sets up environment files
- ✅ Builds and starts the application
- ✅ Initializes the database

---

## 🔧 **Option 2: Manual Step-by-Step Deployment**

### **Step 1: Update System**
```bash
sudo apt update && sudo apt upgrade -y
```

### **Step 2: Install Docker**
```bash
# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Add user to docker group
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Logout and login to apply docker group
exit
ssh username@YOUR_VPS_IP
```

### **Step 3: Configure Firewall**
```bash
sudo ufw --force reset
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS  
sudo ufw allow 3000/tcp  # Frontend
sudo ufw allow 8000/tcp  # Backend API
sudo ufw --force enable
```

### **Step 4: Clone Repository**
```bash
git clone https://github.com/rtsant123/teer-betting-app.git
cd teer-betting-app
```

### **Step 5: Setup Environment**
```bash
# Copy production environment template
cp .env.production .env.production.local

# Edit with your settings
nano .env.production.local
```

### **Step 6: Generate Secure Values**
```bash
# Generate secure secret key
openssl rand -base64 32

# Generate secure database password  
openssl rand -base64 16

# Get your VPS IP
curl -s https://ipv4.icanhazip.com
```

### **Step 7: Update Environment File**
Edit `.env.production.local` with your values:
```env
# CHANGE THESE VALUES!
SECRET_KEY=your_generated_secret_key_here
POSTGRES_PASSWORD=your_generated_db_password_here

# Your VPS IP or domain
ALLOWED_ORIGINS=http://YOUR_VPS_IP:3000,http://YOUR_DOMAIN.com
REACT_APP_API_BASE_URL=http://YOUR_VPS_IP:8000/api/v1

# Production settings
DEBUG=False
ENVIRONMENT=production
```

### **Step 8: Deploy Application**
```bash
# Build and start services
docker-compose -f docker-compose.prod.yml --env-file .env.production.local up -d --build

# Wait for services to start
sleep 30

# Initialize database
docker-compose -f docker-compose.prod.yml --env-file .env.production.local exec backend python init_db.py
```

---

## ✅ **Verification Steps**

### **Check Service Status**
```bash
# View running containers
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f
```

### **Test Endpoints**
```bash
# Test backend API
curl http://YOUR_VPS_IP:8000/health

# Test frontend
curl http://YOUR_VPS_IP:3000

# Check API documentation
# Open: http://YOUR_VPS_IP:8000/docs
```

### **Access Application**
- 🌐 **Frontend**: `http://YOUR_VPS_IP:3000`
- 🔧 **Backend API**: `http://YOUR_VPS_IP:8000`
- 📚 **API Docs**: `http://YOUR_VPS_IP:8000/docs`

---

## 🔒 **Security Setup (Optional but Recommended)**

### **SSL Certificate with Let's Encrypt**
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### **Domain Setup**
If you have a domain, point these A records to your VPS IP:
- `yourdomain.com` → `YOUR_VPS_IP`
- `www.yourdomain.com` → `YOUR_VPS_IP`

---

## 🛠️ **Management Commands**

### **Application Management**
```bash
# Start services
docker-compose -f docker-compose.prod.yml --env-file .env.production.local up -d

# Stop services  
docker-compose -f docker-compose.prod.yml down

# Restart services
docker-compose -f docker-compose.prod.yml restart

# View logs
docker-compose -f docker-compose.prod.yml logs -f

# Update application
git pull origin main
docker-compose -f docker-compose.prod.yml --env-file .env.production.local up -d --build
```

### **Database Management**
```bash
# Backup database
docker-compose -f docker-compose.prod.yml exec db pg_dump -U teer_user teer_betting > backup_$(date +%Y%m%d_%H%M%S).sql

# Access database shell
docker-compose -f docker-compose.prod.yml exec db psql -U teer_user -d teer_betting
```

---

## 🚨 **Troubleshooting**

### **Services Won't Start**
```bash
# Check logs
docker-compose -f docker-compose.prod.yml logs

# Check Docker status
sudo systemctl status docker

# Restart Docker
sudo systemctl restart docker
```

### **Port Issues**
```bash
# Check what's using ports
sudo netstat -tulpn | grep :80
sudo netstat -tulpn | grep :3000
sudo netstat -tulpn | grep :8000

# Kill processes if needed
sudo fuser -k 80/tcp
```

### **Memory Issues**
```bash
# Check memory usage
free -h
docker stats

# Create swap file if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

---

## 🎉 **Success! Your App is Live**

After successful deployment:

### **Demo Credentials**
- **Admin**: username: `admin`, password: `admin123`
- **Test User**: username: `testuser1`, password: `test123`

### **Next Steps**
1. 🔐 Change default admin password
2. 🌐 Set up domain name and SSL
3. 📊 Set up monitoring
4. 💾 Set up automated backups
5. 🔄 Set up CI/CD for auto-deployment

**Your Teer Betting App is now running on your VPS!** 🎯
