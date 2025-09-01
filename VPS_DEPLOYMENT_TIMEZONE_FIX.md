# 🚀 DEPLOY TIMEZONE FIX TO VPS - MANUAL STEPS

## Quick Commands to Run on Your VPS

### Option 1: Quick Git Update (Recommended)
```bash
# Set your VPS IP and run the quick update script
VPS_HOST=your.vps.ip.address ./quick-vps-update.sh
```

### Option 2: Manual Deployment Steps

#### 1. First, commit and push changes from local workspace:
```bash
git add .
git commit -m "Fix timezone and deadline issues permanently"
git push origin main
```

#### 2. SSH to your VPS and update the code:
```bash
ssh deploy@your.vps.ip.address
cd /home/deploy/teer-betting-app
git pull origin main
```

#### 3. Install new Python dependency:
```bash
docker-compose run --rm backend pip install pytz
```

#### 4. Run database migration:
```bash
docker-compose run --rm backend alembic upgrade head
```

#### 5. Apply timezone fixes to existing data:
```bash
docker-compose run --rm backend python fix_timezone_permanently.py
```

#### 6. Rebuild and restart services:
```bash
docker-compose build backend
docker-compose up -d
```

#### 7. Check if everything is running:
```bash
docker-compose ps
docker-compose logs backend --tail=20
```

## What This Fix Does:

✅ **Proper Timezone Handling**: All times now use Asia/Kolkata timezone consistently
✅ **Fixed Deadline Calculation**: Betting deadlines are calculated correctly based on round start time
✅ **Daily Recurring Times**: House FR/SR times are now daily recurring until you change them
✅ **Automatic Scheduling**: New rounds are automatically scheduled with correct times
✅ **Database Standardization**: All existing data is converted to proper timezone format

## Testing the Fix:

1. Go to Admin panel: `http://your.vps.ip:3000/admin`
2. Navigate to Houses section
3. Edit a house and change the FR time or SR time
4. Save and check that future rounds show correct times
5. Verify that betting deadline is calculated properly

## Troubleshooting:

If you encounter any issues:

```bash
# Check backend logs
docker-compose logs backend

# Restart all services
docker-compose down && docker-compose up -d

# Check database connection
docker-compose exec backend python -c "from app.database import engine; print('DB connected:', engine)"
```

## File Changes Made:

- ✅ `backend/app/models/house.py` - Added timezone support
- ✅ `backend/app/services/scheduler.py` - Fixed time calculations
- ✅ `backend/app/api/admin.py` - Improved house update handling
- ✅ `backend/app/schemas/admin.py` - Better time validation
- ✅ `backend/requirements.txt` - Added pytz dependency
- ✅ Database migration for timezone support
- ✅ Data fix script for existing records
