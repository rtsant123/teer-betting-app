# Render.com Deployment Guide for Teer Betting App

## Overview
This guide walks you through deploying your Teer Betting App to Render.com, a modern cloud platform that automatically builds and deploys your applications.

## Prerequisites
- ✅ Render.com account created
- ✅ GitHub repository: https://github.com/rtsant123/teer-betting-app
- ✅ `render.yaml` configuration file in your repository

## Step-by-Step Deployment

### 1. Connect GitHub Repository
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click **"New"** → **"Blueprint"**
3. Connect your GitHub account if not already connected
4. Select your repository: `rtsant123/teer-betting-app`
5. Choose the `main` branch

### 2. Blueprint Configuration
Render will automatically detect the `render.yaml` file and create:
- **PostgreSQL Database** (`teer-betting-db`)
- **Backend Service** (`teer-betting-backend`) - FastAPI Python app
- **Frontend Service** (`teer-betting-frontend`) - React static site
- **Redis Instance** (`teer-betting-redis`) - For caching

### 3. Environment Variables Setup
The following environment variables will be automatically configured:

**Backend Service:**
- `DATABASE_URL` - Auto-generated from PostgreSQL service
- `REDIS_URL` - Auto-generated from Redis service
- `SECRET_KEY` - Auto-generated secure key
- `ALGORITHM` - Set to "HS256"
- `ACCESS_TOKEN_EXPIRE_MINUTES` - Set to 30
- `ENVIRONMENT` - Set to "production"

**Frontend Service:**
- `REACT_APP_API_URL` - Points to your backend service

### 4. Deployment Process
1. Click **"Apply"** to start the deployment
2. Render will:
   - Create the database and Redis instance
   - Build your backend (install Python dependencies)
   - Build your frontend (install npm dependencies and create build)
   - Deploy all services

### 5. Monitor Deployment
- Watch the build logs for each service
- Backend build: Installing Python packages, starting FastAPI
- Frontend build: npm install, npm run build, deploying static files
- Database: PostgreSQL instance creation

### 6. Access Your Application
Once deployed, you'll get URLs like:
- **Frontend**: `https://teer-betting-frontend.onrender.com`
- **Backend API**: `https://teer-betting-backend.onrender.com`
- **Database**: Internal connection (not publicly accessible)

### 7. Post-Deployment Setup
1. **Initialize Database**: The backend will automatically run database migrations
2. **Test API**: Visit `https://teer-betting-backend.onrender.com/docs` for API documentation
3. **Test Frontend**: Open your frontend URL to use the application

## Important Notes

### Free Tier Limitations
- Services sleep after 15 minutes of inactivity
- First request after sleep takes 30-60 seconds to wake up
- Database has connection limits

### Custom Domain (Optional)
- Go to service settings to add your custom domain
- Configure DNS to point to Render's servers

### Environment Updates
- Edit environment variables in service settings
- Changes trigger automatic redeployment

## Troubleshooting

### Common Issues:
1. **Build Failures**: Check build logs for missing dependencies
2. **Database Connection**: Ensure DATABASE_URL is properly set
3. **Frontend API Calls**: Verify REACT_APP_API_URL points to backend

### Getting Help:
- Check service logs in Render dashboard
- Review build and deploy logs
- Contact Render support if needed

## Next Steps After Deployment
1. Test all application features
2. Set up monitoring and alerts
3. Configure backup strategies
4. Consider upgrading to paid plans for production use

---

**Your app will be live at**: `https://teer-betting-frontend.onrender.com`
**API documentation**: `https://teer-betting-backend.onrender.com/docs`
