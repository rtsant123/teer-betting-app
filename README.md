# 🎯 Teer Betting Application

A complete, production-ready Teer betting platform built with **FastAPI**, **PostgreSQL**, **React**, and **Tailwind CSS**. Features comprehensive game logic, admin controls, wallet management, and modular OTP-ready architecture.

## 🌟 Features

### 🎮 Core Gaming Features
- **4 Bet Types**: Direct (00-99), House (0-9), Ending (0-9), Forecast (FR-SR)
- **Customizable Payouts**: Configure payout rates per house
- **Real-time Results**: Live result publishing and bet processing
- **Multiple Houses**: Support for multiple betting houses (Shillong, Khanapara, etc.)
- **Round Management**: FR and SR round scheduling with automatic bet closure

### 👤 User Management
- **JWT Authentication**: Secure login with refresh tokens
- **User Registration**: Username + phone + password registration
- **Wallet System**: Deposit/withdrawal with admin approval
- **Bet History**: Complete betting history and statistics
- **Account Management**: User profile and balance tracking

### 🔧 Admin Dashboard
- **House Management**: Create/edit houses with custom payout rates
- **Round Scheduling**: Schedule FR/SR rounds with betting deadlines
- **Result Publishing**: Publish results and automatically process bets
- **Transaction Management**: Approve/reject deposits and withdrawals
- **User Administration**: Manage user accounts and permissions
- **Analytics Dashboard**: System stats and user metrics

### 🏦 Financial Features
- **Manual Deposits**: User uploads payment proof, admin approves
- **Manual Withdrawals**: User requests withdrawal, admin processes
- **Transaction Logging**: Complete audit trail of all transactions
- **Balance Management**: Real-time wallet balance updates
- **Betting Limits**: Configurable betting limits and validations

### 🔮 Future-Ready Architecture
- **OTP Integration Ready**: Modular SMS OTP system (Twilio/AWS SNS ready)
- **Scalable Design**: Docker containerization with microservices approach
- **Security First**: Input validation, SQL injection protection, rate limiting ready
- **Mobile Responsive**: Tailwind CSS responsive design

## 🏗️ Technology Stack

### Backend
- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Robust relational database
- **SQLAlchemy** - Python ORM with Alembic migrations
- **JWT** - Secure authentication
- **bcrypt** - Password hashing
- **Pydantic** - Data validation

### Frontend
- **React 18** - Modern React with hooks
- **Tailwind CSS** - Utility-first CSS framework
- **Axios** - HTTP client
- **React Router** - Client-side routing
- **React Hot Toast** - Notifications

### Infrastructure
- **Docker** - Containerization
- **nginx** - Web server and reverse proxy
- **Redis** - Caching and sessions (ready)
- **pgAdmin** - Database administration

## 🚀 Quick Start

### Prerequisites
- **Docker** and **Docker Compose**
- **Git**

### 1. Clone Repository
```bash
git clone <your-repo-url>
cd teer-betting-app
```

### 2. Environment Setup
```bash
# Copy environment file
cp .env.example .env

# Edit environment variables
nano .env
```

### 3. Docker Deployment
```bash
# Build and start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

### 4. Initialize Database
```bash
# Run database initialization (creates tables + dummy data)
docker exec -it teer_backend python init_db.py
```

### 5. Access Application
- **Frontend**: http://localhost
- **Backend API**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs
- **pgAdmin**: http://localhost:5050

## 🔑 Demo Credentials

### Admin Account
- **Username**: `admin`
- **Password**: `admin123`
- **Role**: Full admin access

### Test Users
| Username | Password | Balance | Role |
|----------|----------|---------|------|
| testuser1 | test123 | ₹1,000 | User |
| testuser2 | test123 | ₹500 | User |
| testuser3 | test123 | ₹2,000 | User |

### Database Access (pgAdmin)
- **Email**: admin@teer.com
- **Password**: admin

## 🎮 How to Play

### Bet Types & Payouts

1. **Direct Bet (00-99)** - Payout: 80:1
   - Bet on exact 2-digit result
   - Example: Bet ₹10 on "23", if result is 23, win ₹800

2. **House Bet (0-9)** - Payout: 8:1  
   - Bet on first digit of result
   - Example: Result 23 → House is 2

3. **Ending Bet (0-9)** - Payout: 8:1
   - Bet on last digit of result  
   - Example: Result 23 → Ending is 3

4. **Forecast Bet (XX-YY)** - Payout: 8:1
   - Bet on FR-SR combination
   - Example: "23-45" if FR=23 and SR=45

### Game Flow
1. **Houses** schedule FR and SR rounds
2. **Users** place bets before deadline
3. **Results** are published by admin
4. **Winnings** are automatically credited

## 🏃‍♂️ Development Setup

### Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup database
createdb teer_betting
python init_db.py

# Run development server
uvicorn app.main:app --reload
```

### Frontend Setup
```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm start
```

### Database Migrations
```bash
cd backend

# Create migration
alembic revision --autogenerate -m "Description"

# Apply migrations
alembic upgrade head
```

## 📁 Project Structure

```
teer-betting-app/
├── backend/                 # FastAPI backend
│   ├── app/
│   │   ├── api/            # API route handlers
│   │   ├── models/         # SQLAlchemy models
│   │   ├── schemas/        # Pydantic schemas
│   │   ├── services/       # Business logic
│   │   ├── utils/          # Utilities (JWT, password, OTP)
│   │   ├── config.py       # Configuration
│   │   ├── database.py     # Database setup
│   │   └── main.py         # FastAPI app
│   ├── alembic/            # Database migrations
│   ├── init_db.py          # Database initialization
│   ├── requirements.txt    # Python dependencies
│   └── Dockerfile          # Backend container
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   ├── contexts/       # React contexts
│   │   └── App.js          # Main app component
│   ├── package.json        # Node dependencies
│   ├── tailwind.config.js  # Tailwind configuration
│   ├── nginx.conf          # Nginx configuration
│   └── Dockerfile          # Frontend container
├── docker-compose.yml      # Docker orchestration
├── .env.example           # Environment variables template
└── README.md              # This file
```

## 🔒 Security Features

- **Password Hashing**: bcrypt with salt
- **JWT Tokens**: Secure authentication with refresh
- **Input Validation**: Pydantic schema validation
- **SQL Injection Protection**: SQLAlchemy ORM
- **CORS Configuration**: Configurable origins
- **Rate Limiting Ready**: Infrastructure for API limits
- **Admin Authorization**: Role-based access control

## 🔮 OTP Integration Guide

The system is ready for OTP integration. To activate:

### 1. Configure SMS Provider
```python
# app/utils/otp_handler.py
async def send_sms_otp(phone_number: str, otp_code: str) -> bool:
    # Replace with your SMS provider (Twilio, AWS SNS, etc.)
    # Example with Twilio:
    # client = Client(account_sid, auth_token)
    # message = client.messages.create(...)
    return True
```

### 2. Environment Variables
```bash
# Add to .env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=your_twilio_number
```

### 3. Enable OTP Routes
The OTP endpoints are ready at `/api/otp/`:
- `POST /api/otp/generate` - Generate OTP
- `POST /api/otp/verify` - Verify OTP

## 🚀 Production Deployment

### Environment Variables
```bash
# Production settings
DEBUG=False
SECRET_KEY=your-production-secret-key-min-32-characters
DATABASE_URL=postgresql://user:pass@prod-db:5432/teer_betting
ALLOWED_ORIGINS=https://yourdomain.com

# SSL Configuration
FORCE_HTTPS=True
```

### Docker Production
```bash
# Production compose file
docker-compose -f docker-compose.prod.yml up -d

# SSL with Let's Encrypt (recommended)
# Add Certbot container to docker-compose
```

### Manual Deployment
```bash
# Backend
cd backend
pip install -r requirements.txt
alembic upgrade head
gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker

# Frontend
cd frontend
npm run build
# Serve build/ with nginx/Apache
```

## 📊 API Documentation

### Authentication
```bash
# Register
POST /api/auth/register
{
  "username": "testuser",
  "phone": "1234567890", 
  "password": "password123"
}

# Login
POST /api/auth/login
{
  "username": "testuser",
  "password": "password123"
}
```

### Betting
```bash
# Place bet
POST /api/bet/place
{
  "round_id": 1,
  "bet_type": "DIRECT",
  "bet_value": "23", 
  "bet_amount": 100.0
}

# Get active rounds
GET /api/bet/active-rounds
```

### Admin Operations
```bash
# Create house
POST /api/admin/houses
{
  "name": "Shillong",
  "location": "Meghalaya",
  "direct_payout_rate": 80.0
}

# Publish result
POST /api/admin/rounds/{round_id}/result?result=23
```

Full API documentation available at: http://localhost:8000/docs

## 🧪 Testing

```bash
# Backend tests
cd backend
pytest

# Frontend tests  
cd frontend
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

### Common Issues

**Database Connection Error**
```bash
# Ensure PostgreSQL is running
docker-compose up db
# Check connection string in .env
```

**Frontend Build Fails**
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Permission Denied (Docker)**
```bash
# Fix Docker permissions
sudo chown -R $USER:$USER .
```

### Getting Help

- **Issues**: Create GitHub issue with detailed description
- **Documentation**: Check `/docs` endpoint for API reference
- **Database**: Use pgAdmin at http://localhost:5050

## 🔄 Updates & Roadmap

### v1.0 Features ✅
- [x] Complete betting system
- [x] Admin dashboard
- [x] Wallet management
- [x] Docker deployment
- [x] OTP-ready architecture

### v1.1 Planned Features
- [ ] SMS OTP integration
- [ ] Real-time notifications
- [ ] Advanced analytics
- [ ] Mobile app (React Native)
- [ ] API rate limiting
- [ ] Advanced reporting

### v2.0 Vision
- [ ] Multi-language support
- [ ] Advanced gaming features
- [ ] Machine learning predictions
- [ ] Blockchain integration
- [ ] Advanced security features

---

**Built with ❤️ for the Teer betting community**

*For support and feature requests, please create an issue or contact the development team.*