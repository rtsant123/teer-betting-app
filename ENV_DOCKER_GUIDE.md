# 📋 **Environment Files & Docker Configuration Guide**

## 🌍 **Environment Files (.env) - Each Serves a Specific Purpose**

### **1. `.env` (324 bytes)**
- **Purpose**: Current active environment (usually development)
- **Usage**: When you run `docker-compose up` locally
- **Contains**: Database URLs, API keys, debug settings for local development

### **2. `.env.development` (701 bytes)**  
- **Purpose**: Development environment template
- **Usage**: Copy to `.env` for local development
- **Contains**: Debug=True, local database settings, development API endpoints

### **3. `.env.production` (8,928 bytes) - MOST COMPREHENSIVE**
- **Purpose**: Production deployment template with full documentation
- **Usage**: Copy and customize for live production servers
- **Contains**: 
  - Security settings (SSL, JWT secrets)
  - Production database configurations
  - Performance tuning parameters
  - Monitoring and logging settings
  - Complete documentation for each setting

### **4. `.env.vps.example` (856 bytes)**
- **Purpose**: VPS deployment template (2GB RAM servers)
- **Usage**: Copy to `.env.vps` for VPS deployment
- **Contains**: Optimized settings for 2GB RAM VPS servers

### **5. `.env.1gb.example` (841 bytes)**
- **Purpose**: Ultra-optimized for 1GB RAM servers
- **Usage**: Copy to `.env.1gb` for budget hosting (DigitalOcean $6/month droplets)
- **Contains**: Memory-constrained settings, reduced workers, smaller cache sizes

---

## 🐳 **Docker Compose Files - Different Deployment Scenarios**

### **1. `docker-compose.yml` (2,487 bytes) - DEVELOPMENT**
```yaml
# Purpose: Local development with hot-reload
# Usage: docker-compose up
# Features:
- Volume mounting for live code changes
- Debug mode enabled
- Development database with relaxed settings
- Frontend with hot-reload
- No SSL/HTTPS
```

### **2. `docker-compose.prod.yml` (3,083 bytes) - PRODUCTION**
```yaml
# Purpose: Production deployment with full optimization
# Usage: docker-compose -f docker-compose.prod.yml up -d
# Features:
- Multi-stage builds for smaller images
- SSL/HTTPS support
- Production database optimizations
- Health checks
- Resource limits
- Security hardening
```

### **3. `docker-compose.vps.yml` (3,178 bytes) - VPS OPTIMIZED**
```yaml
# Purpose: VPS deployment (2GB RAM servers)
# Usage: docker-compose -f docker-compose.vps.yml up -d
# Features:
- Optimized for 2GB RAM
- PostgreSQL with moderate memory settings
- Redis with 100MB limit
- Single worker processes
- Basic monitoring
```

### **4. `docker-compose.1gb.yml` (3,247 bytes) - ULTRA-LIGHTWEIGHT**
```yaml
# Purpose: Budget hosting (1GB RAM droplets)
# Usage: docker-compose -f docker-compose.1gb.yml up -d
# Features:
- Ultra-optimized for 1GB RAM
- PostgreSQL with minimal memory (64MB shared_buffers)
- Redis with 50MB limit
- Strict resource limits
- Maximum memory efficiency
```

### **5. `docker-compose.test.yml` (1,877 bytes) - TESTING**
```yaml
# Purpose: Automated testing environment
# Usage: docker-compose -f docker-compose.test.yml up --abort-on-container-exit
# Features:
- Test database (disposable)
- Test runners for backend/frontend
- No persistent volumes
- Fast startup/shutdown
```

---

## 🎯 **When to Use Each Configuration**

### **Local Development** 🖥️
```bash
# Use these files:
.env.development → .env
docker-compose.yml

# Command:
docker-compose up
```

### **Production Server** 🚀
```bash
# Use these files:
.env.production → .env.production (customize)
docker-compose.prod.yml

# Command:
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### **VPS Deployment (2GB RAM)** 🌐
```bash
# Use these files:
.env.vps.example → .env.vps (customize)
docker-compose.vps.yml

# Command:
docker-compose -f docker-compose.vps.yml --env-file .env.vps up -d
```

### **Budget Hosting (1GB RAM)** 💰
```bash
# Use these files:
.env.1gb.example → .env.1gb (customize)
docker-compose.1gb.yml

# Command:
docker-compose -f docker-compose.1gb.yml --env-file .env.1gb up -d
```

### **Testing/CI** 🧪
```bash
# Use these files:
docker-compose.test.yml

# Command:
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

---

## 💡 **Why This Structure?**

### **Memory Optimization**
- **1GB**: Ultra-constrained (PostgreSQL 64MB, Redis 50MB)
- **2GB**: Moderate optimization (PostgreSQL 128MB, Redis 100MB)  
- **Production**: Full resources available

### **Environment Separation**
- **Development**: Debug enabled, hot-reload, relaxed security
- **Production**: Security hardened, SSL, performance optimized
- **Testing**: Isolated, disposable, fast

### **Platform-Specific**
- **VPS**: General VPS providers
- **DigitalOcean**: Specific optimizations for DO droplets
- **Production**: Enterprise/cloud deployments

---

## 🔧 **Quick Setup Commands**

### For Local Development:
```bash
cp .env.development .env
docker-compose up
```

### For Production:
```bash
cp .env.production .env.production
# Edit .env.production with your values
docker-compose -f docker-compose.prod.yml --env-file .env.production up -d
```

### For VPS:
```bash
cp .env.vps.example .env.vps
# Edit .env.vps with your values  
docker-compose -f docker-compose.vps.yml --env-file .env.vps up -d
```

This structure allows you to deploy the same application optimally across different environments without conflicts! 🎯
