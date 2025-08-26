# 🚀 Deploy to Render.com - Step by Step Guide

## 📋 **What You Need to Do:**

### **1. Go to Render.com**
- Open your browser
- Go to: https://render.com
- Click **"Get Started for Free"**

### **2. Sign Up with GitHub**
- Click **"GitHub"** to sign up
- Authorize Render to access your repositories
- This connects your GitHub account

### **3. Create New Web Service**
- Click **"New +"** button
- Select **"Web Service"**
- Choose **"Build and deploy from a Git repository"**

### **4. Connect Your Repository**
- Find and select: **`rtsant123/teer-betting-app`**
- Click **"Connect"**

### **5. Configure the Service**

**Basic Settings:**
- **Name:** `teer-betting-backend`
- **Region:** Choose closest to your users
- **Branch:** `main`
- **Root Directory:** `backend`

**Build & Deploy:**
- **Runtime:** `Docker`
- **Dockerfile Path:** `./Dockerfile`

**Service Details:**
- **Plan:** `Free` (to start)
- **Environment:** `Docker`

### **6. Environment Variables**
Add these environment variables:

```
DATABASE_URL=postgresql://user:pass@host:port/db
SECRET_KEY=your-super-secret-key-here
DEBUG=False
ALLOWED_ORIGINS=*
```

### **7. Deploy!**
- Click **"Create Web Service"**
- Wait 5-10 minutes for deployment
- Get your live URL!

## 🎯 **After Deployment:**

Your app will be available at:
`https://your-app-name.onrender.com`

## 💡 **Pro Tips:**

1. **Free tier limitations:**
   - App sleeps after 15 minutes of inactivity
   - 750 hours/month (enough for testing)
   - Upgrade to paid for 24/7 availability

2. **Custom Domain:**
   - You can add your own domain later
   - Just point DNS to Render's servers

3. **Automatic Deployments:**
   - Every push to GitHub triggers new deployment
   - No manual work needed

## 🚀 **Ready? Let's do it!**

Open https://render.com and let's get your Teer Betting App live!
