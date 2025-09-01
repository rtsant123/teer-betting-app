from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.middleware.base import BaseHTTPMiddleware
import time
import logging
import os
from pathlib import Path
from app.config import settings

# API Information
API_INFO = {
    "title": "Teer Betting Platform API",
    "version": "1.0.0",
    "description": "FastAPI backend for Teer betting platform",
    "features": ["Authentication", "Betting", "Wallet", "Admin"],
    "endpoints": ["/auth", "/bet", "/wallet", "/admin", "/rounds"]
}

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title=API_INFO["title"],
    version=API_INFO["version"],
    description=API_INFO["description"],
    openapi_url=f"{settings.API_V1_STR}/openapi.json" if settings.DEBUG else None,
    docs_url=f"{settings.API_V1_STR}/docs" if settings.DEBUG else None,
    redoc_url=f"{settings.API_V1_STR}/redoc" if settings.DEBUG else None,
    contact={
        "name": "Teer Platform Support",
        "email": "support@teerplatform.com",
    },
    license_info={
        "name": "Private License",
        "url": "https://teerplatform.com/license",
    },
)

# Create uploads directory if it doesn't exist
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)
(uploads_dir / "images").mkdir(exist_ok=True)
(uploads_dir / "banners").mkdir(exist_ok=True)
(uploads_dir / "documents").mkdir(exist_ok=True)
(uploads_dir / "qr_codes").mkdir(exist_ok=True)

# Mount static files for uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Security Middleware
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["*"] if settings.DEBUG else ["teerplatform.com", "*.teerplatform.com"]
)

# CORS Middleware - Permanent solution with fallback
origins = []

# Try to get origins from environment
if hasattr(settings, 'BACKEND_CORS_ORIGINS'):
    if isinstance(settings.BACKEND_CORS_ORIGINS, str):
        origins = [origin.strip() for origin in settings.BACKEND_CORS_ORIGINS.split(",") if origin.strip()]
    else:
        origins = settings.BACKEND_CORS_ORIGINS
        
# Add VPS IP if available
if settings.VPS_IP:
    vps_origins = [
        f"http://{settings.VPS_IP}",
        f"http://{settings.VPS_IP}:80",
        f"http://{settings.VPS_IP}:3000",
        f"https://{settings.VPS_IP}",
        f"https://{settings.VPS_IP}:443"
    ]
    origins.extend(vps_origins)

# Fallback to localhost if no origins defined
if not origins:
    origins = [
        "http://localhost:3000",
        "http://localhost:80",
        "http://localhost",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:80",
        "http://127.0.0.1",
        "http://frontend:80",
        "http://teer_frontend:80"
    ]

# Log the origins for debugging
logger.info(f"CORS Origins: {origins}")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Response-Time"]
)

# Request Timing Middleware
class TimingMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        response = await call_next(request)
        process_time = time.time() - start_time
        response.headers["X-Response-Time"] = str(process_time)
        return response

app.add_middleware(TimingMiddleware)

# Request ID Middleware
class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        import uuid
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response

app.add_middleware(RequestIDMiddleware)

# Error Handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    """Handle HTTP exceptions"""
    logger.error(f"HTTP {exc.status_code}: {exc.detail} - Path: {request.url.path}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": exc.detail,
            "error_code": exc.status_code,
            "path": str(request.url.path),
            "request_id": getattr(request.state, "request_id", None)
        }
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors"""
    logger.error(f"Validation error: {exc.errors()} - Path: {request.url.path}")
    
    return JSONResponse(
        status_code=422,
        content={
            "status": "error",
            "message": "Validation error",
            "details": exc.errors(),
            "path": str(request.url.path),
            "request_id": getattr(request.state, "request_id", None)
        }
    )

@app.exception_handler(StarletteHTTPException)
async def starlette_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle Starlette HTTP exceptions"""
    logger.error(f"Starlette HTTP {exc.status_code}: {exc.detail} - Path: {request.url.path}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error", 
            "message": exc.detail or "Internal server error",
            "error_code": exc.status_code,
            "path": str(request.url.path),
            "request_id": getattr(request.state, "request_id", None)
        }
    )

@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unexpected error: {str(exc)} - Path: {request.url.path}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Internal server error" if not settings.DEBUG else str(exc),
            "error_code": 500,
            "path": str(request.url.path),
            "request_id": getattr(request.state, "request_id", None)
        }
    )

# Include individual routers
try:
    from app.api.auth import router as auth_router
    app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication"])
    logger.info("Auth router included successfully")
except Exception as e:
    logger.warning(f"Could not import auth router: {e}")

try:
    from app.api.admin import router as admin_router
    app.include_router(admin_router, prefix="/api/v1/admin", tags=["Admin"])
    logger.info("Admin router included successfully")
except Exception as e:
    logger.warning(f"Could not import admin router: {e}")

try:
    from app.api.admin_results import router as admin_results_router
    app.include_router(admin_results_router, prefix="/api/v1/admin/results", tags=["Admin Results"])
    logger.info("Admin results router included successfully")
except Exception as e:
    logger.warning(f"Could not import admin results router: {e}")

# Enhanced admin router removed - using original admin.py

try:
    from app.api.bet import router as bet_router
    app.include_router(bet_router, prefix="/api/v1/bet", tags=["Betting"])
    logger.info("Bet router included successfully")
except Exception as e:
    logger.warning(f"Could not import bet router: {e}")

try:
    from app.api.wallet import router as wallet_router
    app.include_router(wallet_router, prefix="/api/v1/wallet", tags=["Wallet"])
    logger.info("Wallet router included successfully")
except Exception as e:
    logger.warning(f"Could not import wallet router: {e}")

try:
    from app.api.rounds import router as rounds_router
    app.include_router(rounds_router, prefix="/api/v1/rounds", tags=["Rounds"])
    logger.info("Rounds router included successfully")
except Exception as e:
    logger.warning(f"Could not import rounds router: {e}")

try:
    from app.api.referral import router as referral_router
    app.include_router(referral_router, prefix="/api/v1/referral", tags=["Referral"])
    logger.info("Referral router included successfully")
except Exception as e:
    logger.warning(f"Could not import referral router: {e}")

try:
    from app.api.admin_referral import router as admin_referral_router
    app.include_router(admin_referral_router, prefix="/api/v1", tags=["Admin Referral"])
    logger.info("Admin referral router included successfully")
except Exception as e:
    logger.warning(f"Could not import admin referral router: {e}")

# Payment methods public endpoint
@app.get("/api/v1/payment-methods")
async def get_public_payment_methods():
    """Get active payment methods for public use"""
    from app.models.payment_method import PaymentMethod, PaymentMethodStatus
    from sqlalchemy.orm import Session
    from app.database import get_db, SessionLocal
    
    db = SessionLocal()
    try:
        payment_methods = db.query(PaymentMethod).filter(
            PaymentMethod.status == PaymentMethodStatus.ACTIVE
        ).order_by(PaymentMethod.display_order).all()
        
        # Return only public information
        return [
            {
                "id": pm.id,
                "name": pm.name,
                "type": pm.type.value,
                "instructions": pm.instructions,
                "supports_deposit": pm.supports_deposit,
                "supports_withdrawal": pm.supports_withdrawal,
                "min_amount": pm.min_amount,
                "max_amount": pm.max_amount,
                "details": pm.details
            }
            for pm in payment_methods
        ]
    finally:
        db.close()

# Banner routes
try:
    from app.api.banners import router as banners_router
    app.include_router(banners_router, prefix="/api/v1/banners", tags=["Banners"])
    logger.info("Banners router included successfully")
except Exception as e:
    logger.warning(f"Could not import banners router: {e}")

try:
    from app.api.upload import router as upload_router
    app.include_router(upload_router, prefix="/api/v1/uploads", tags=["File Upload"])
    logger.info("Upload router included successfully")
except Exception as e:
    logger.warning(f"Could not import upload router: {e}")

# Legacy API routes (without /v1 for frontend compatibility)
try:
    from app.api.auth import router as auth_router_legacy
    app.include_router(auth_router_legacy, prefix="/api/auth", tags=["Authentication (Legacy)"])
    logger.info("Legacy auth router included successfully")
except Exception as e:
    logger.warning(f"Could not import legacy auth router: {e}")

try:
    from app.api.rounds import router as rounds_router_legacy
    app.include_router(rounds_router_legacy, prefix="/api/rounds", tags=["Rounds (Legacy)"])
    logger.info("Legacy rounds router included successfully")
except Exception as e:
    logger.warning(f"Could not import legacy rounds router: {e}")

try:
    from app.api.wallet import router as wallet_router_legacy
    app.include_router(wallet_router_legacy, prefix="/api/wallet", tags=["Wallet (Legacy)"])
    logger.info("Legacy wallet router included successfully")
except Exception as e:
    logger.warning(f"Could not import legacy wallet router: {e}")

try:
    from app.api.bet import router as bet_router_legacy
    app.include_router(bet_router_legacy, prefix="/api/bet", tags=["Betting (Legacy)"])
    logger.info("Legacy bet router included successfully")
except Exception as e:
    logger.warning(f"Could not import legacy bet router: {e}")

try:
    from app.api.admin import router as admin_router_legacy
    app.include_router(admin_router_legacy, prefix="/api/admin", tags=["Admin (Legacy)"])
    logger.info("Legacy admin router included successfully")
except Exception as e:
    logger.warning(f"Could not import legacy admin router: {e}")

# Note: Legacy banners router removed to avoid conflicts - use /api/v1/admin/banners instead

# Root endpoints
@app.get("/", response_model=dict, tags=["Root"])
async def root():
    """Root endpoint - API information"""
    return {
        "message": "Teer Participation Platform API",
        "version": API_INFO["version"],
        "status": "active",
        "api_docs": f"{settings.API_V1_STR}/docs" if settings.DEBUG else None,
        "features": API_INFO["features"],
        "endpoints": API_INFO["endpoints"]
    }

@app.get("/health", response_model=dict, tags=["Health"])
async def health_check():
    """Health check endpoint"""
    from app.database import SessionLocal
    from sqlalchemy import text
    
    # Test database connection
    db_status = "healthy"
    try:
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
    except Exception as e:
        db_status = f"error: {str(e)}"
        logger.error(f"Database health check failed: {e}")
    
    return {
        "status": "healthy" if db_status == "healthy" else "degraded",
        "service": "teer-platform-api",
        "version": API_INFO["version"],
        "database": db_status,
        "timestamp": time.time()
    }

@app.get("/info", response_model=dict, tags=["Info"])
async def api_info():
    """API information endpoint"""
    return {
        "api_info": API_INFO,
        "server_time": time.time(),
        "debug_mode": settings.DEBUG
    }

# Startup and Shutdown Events
@app.on_event("startup")
async def startup_event():
    """Application startup event"""
    logger.info("🚀 Teer Participation Platform API starting up...")
    logger.info(f"🔧 Debug mode: {settings.DEBUG}")
    logger.info(f"📊 API version: {API_INFO['version']}")
    logger.info(f"🌐 CORS origins: {settings.BACKEND_CORS_ORIGINS}")
    
    # Test database connection
    try:
        from app.database import SessionLocal
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        logger.info("✅ Database connection successful")
    except Exception as e:
        logger.error(f"❌ Database connection failed: {e}")
    
    logger.info("🎉 Teer Platform API ready!")
    
    # Start daily scheduler
    from app.services.daily_scheduler import start_daily_scheduler
    import asyncio
    asyncio.create_task(start_daily_scheduler())
    logger.info("📅 Daily scheduler started")

@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown event"""
    logger.info("🛑 Teer Participation Platform API shutting down...")
    
    # Stop daily scheduler
    from app.services.daily_scheduler import stop_daily_scheduler
    stop_daily_scheduler()
    logger.info("📅 Daily scheduler stopped")
    
    logger.info("👋 Goodbye!")

# Development server runner
if __name__ == "__main__":
    import uvicorn
    
    logger.info("🔥 Starting development server...")
    
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        reload_dirs=["app"] if settings.DEBUG else None,
        log_level="info",
        access_log=settings.DEBUG
    )