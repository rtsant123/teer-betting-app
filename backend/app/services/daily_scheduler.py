import asyncio
import logging
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.services.scheduling_service import SchedulingService
from app.models.house import House

logger = logging.getLogger(__name__)

class DailyScheduler:
    def __init__(self):
        self.is_running = False
    
    async def start_scheduler(self):
        """Start the daily scheduling task"""
        if self.is_running:
            logger.warning("Scheduler is already running")
            return
        
        self.is_running = True
        logger.info("Starting daily scheduler...")
        
        while self.is_running:
            try:
                await self.run_daily_scheduling()
                # Sleep for 24 hours (run once per day)
                await asyncio.sleep(24 * 60 * 60)
            except Exception as e:
                logger.error(f"Error in daily scheduler: {e}")
                # On error, wait 1 hour before retrying
                await asyncio.sleep(60 * 60)
    
    async def run_daily_scheduling(self):
        """Run the daily scheduling process"""
        logger.info("Running daily auto-scheduling...")
        
        db = SessionLocal()
        try:
            scheduling_service = SchedulingService(db)
            
            # Get all active houses
            houses = db.query(House).filter(House.is_active == True).all()
            
            total_rounds_created = 0
            for house in houses:
                try:
                    # Auto-schedule rounds for the next 30 days
                    rounds_created = scheduling_service.auto_schedule_house_rounds(
                        house.id, 
                        days_ahead=30
                    )
                    total_rounds_created += rounds_created
                    
                    if rounds_created > 0:
                        logger.info(f"Created {rounds_created} rounds for house '{house.name}'")
                        
                except Exception as e:
                    logger.error(f"Error scheduling rounds for house '{house.name}': {e}")
                    continue
            
            logger.info(f"Daily scheduling completed. Total rounds created: {total_rounds_created}")
            
        except Exception as e:
            logger.error(f"Error in daily scheduling process: {e}")
        finally:
            db.close()
    
    def stop_scheduler(self):
        """Stop the daily scheduler"""
        self.is_running = False
        logger.info("Daily scheduler stopped")

# Global scheduler instance
daily_scheduler = DailyScheduler()

async def start_daily_scheduler():
    """Start the daily scheduler as a background task"""
    await daily_scheduler.start_scheduler()

def stop_daily_scheduler():
    """Stop the daily scheduler"""
    daily_scheduler.stop_scheduler()
