from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.schemas.banner import Banner as BannerResponse, BannerCreate, BannerUpdate
from app.models.banner import Banner

router = APIRouter(tags=["banners"])

@router.get("/active", response_model=List[BannerResponse])
async def get_active_banners(db: Session = Depends(get_db)):
    """Get all active banners ordered by position"""
    banners = db.query(Banner).filter(
        Banner.is_active == True
    ).order_by(
        Banner.order_position.asc(), 
        Banner.id.desc()
    ).all()
    return banners

@router.get("/", response_model=List[BannerResponse])
async def get_all_banners(db: Session = Depends(get_db)):
    """Get all banners (admin endpoint via include)"""
    banners = db.query(Banner).order_by(
        Banner.order_position.asc(), 
        Banner.id.desc()
    ).all()
    return banners

@router.post("/", response_model=BannerResponse)
async def create_banner(banner_data: BannerCreate, db: Session = Depends(get_db)):
    """Create a new banner"""
    try:
        new_banner = Banner(**banner_data.model_dump())
        db.add(new_banner)
        db.commit()
        db.refresh(new_banner)
        return new_banner
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error creating banner: {str(e)}")

@router.put("/{banner_id}", response_model=BannerResponse)
async def update_banner(banner_id: int, banner_data: BannerUpdate, db: Session = Depends(get_db)):
    """Update a banner"""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    try:
        update_data = banner_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(banner, field, value)
        
        db.commit()
        db.refresh(banner)
        return banner
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error updating banner: {str(e)}")

@router.delete("/{banner_id}")
async def delete_banner(banner_id: int, db: Session = Depends(get_db)):
    """Delete a banner"""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    try:
        db.delete(banner)
        db.commit()
        return {"message": "Banner deleted successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error deleting banner: {str(e)}")

@router.patch("/{banner_id}/toggle")
async def toggle_banner_status(banner_id: int, db: Session = Depends(get_db)):
    """Toggle banner active status"""
    banner = db.query(Banner).filter(Banner.id == banner_id).first()
    if not banner:
        raise HTTPException(status_code=404, detail="Banner not found")
    
    try:
        banner.is_active = not banner.is_active
        db.commit()
        db.refresh(banner)
        return banner
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"Error toggling banner: {str(e)}")
