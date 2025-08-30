from fastapi import APIRouter, Depends, File, UploadFile, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
import os
import uuid
import shutil
from pathlib import Path
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User

router = APIRouter()
security = HTTPBearer()

# Configuration
UPLOAD_DIR = Path("uploads")
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB (reduced for better performance)
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif", "image/webp"}
ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}

# Ensure upload directories exist
(UPLOAD_DIR / "images").mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "banners").mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "documents").mkdir(parents=True, exist_ok=True)
(UPLOAD_DIR / "qr_codes").mkdir(parents=True, exist_ok=True)


def validate_image_file(file: UploadFile) -> bool:
    """Validate uploaded image file"""
    # Check file extension
    file_extension = Path(file.filename).suffix.lower()
    if file_extension not in ALLOWED_EXTENSIONS:
        return False
    
    # Check file content type
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        return False
    
    return True


@router.post("/image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload an image file"""
    
    # Validate file
    if not validate_image_file(file):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
        )
    
    # Read file content
    file_content = await file.read()
    
    # Check file size
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File size too large. Maximum allowed size is {MAX_FILE_SIZE // (1024 * 1024)}MB."
        )
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    
    # Save file
    file_path = UPLOAD_DIR / "images" / unique_filename
    
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        # Return the URL path
        return {
            "url": f"/uploads/images/{unique_filename}",
            "filename": unique_filename,
            "original_filename": file.filename,
            "size": len(file_content)
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )


@router.post("/banner")
async def upload_banner(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a banner image"""
    
    # Validate file
    if not validate_image_file(file):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
        )
    
    # Read file content
    file_content = await file.read()
    
    # Check file size
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File size too large. Maximum allowed size is {MAX_FILE_SIZE // (1024 * 1024)}MB."
        )
    
    try:
        # Generate unique filename
        file_extension = Path(file.filename).suffix.lower()
        unique_filename = f"banner_{uuid.uuid4()}{file_extension}"
        file_path = UPLOAD_DIR / "banners" / unique_filename
        
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        return {
            "url": f"/uploads/banners/{unique_filename}",
            "filename": unique_filename,
            "original_filename": file.filename,
            "size": len(file_content)
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process banner image: {str(e)}"
        )


@router.post("/document")
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a document file"""
    
    # Check file size
    file_content = await file.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File size too large. Maximum allowed size is {MAX_FILE_SIZE // (1024 * 1024)}MB."
        )
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix.lower()
    unique_filename = f"{uuid.uuid4()}{file_extension}"
    file_path = UPLOAD_DIR / "documents" / unique_filename
    
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        return {
            "url": f"/uploads/documents/{unique_filename}",
            "filename": unique_filename,
            "original_filename": file.filename,
            "size": len(file_content)
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save document: {str(e)}"
        )


@router.delete("/file/{filename}")
async def delete_file(
    filename: str,
    file_type: str = "images",  # images, banners, documents
    current_user: User = Depends(get_current_user)
):
    """Delete an uploaded file"""
    
    # Validate file type
    if file_type not in ["images", "banners", "documents", "qr_codes"]:
        raise HTTPException(status_code=400, detail="Invalid file type")
    
    file_path = UPLOAD_DIR / file_type / filename
    
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        file_path.unlink()
        return {"message": "File deleted successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete file: {str(e)}"
        )


@router.post("/qr-code")
async def upload_qr_code(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload a QR code image for payment methods"""
    
    # Validate file
    if not validate_image_file(file):
        raise HTTPException(
            status_code=400,
            detail="Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed."
        )
    
    # Read file content
    file_content = await file.read()
    
    # Check file size
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail=f"File size too large. Maximum allowed size is {MAX_FILE_SIZE // (1024 * 1024)}MB."
        )
    
    # Generate unique filename
    file_extension = Path(file.filename).suffix.lower()
    unique_filename = f"qr_{uuid.uuid4()}{file_extension}"
    
    # Save file
    file_path = UPLOAD_DIR / "qr_codes" / unique_filename
    
    try:
        with open(file_path, "wb") as buffer:
            buffer.write(file_content)
        
        # Return the URL path
        return {
            "url": f"/uploads/qr_codes/{unique_filename}",
            "filename": unique_filename,
            "original_filename": file.filename,
            "size": len(file_content)
        }
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save QR code: {str(e)}"
        )
