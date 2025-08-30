#!/usr/bin/env python3
"""
Script to fix tickets that are stuck in pending status
"""
import sys
import os

# Add the parent directory to the path so we can import app modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import SessionLocal
from app.services.bet_service import EnhancedBetService

def fix_pending_tickets():
    """Fix all tickets that are stuck in pending status"""
    db = SessionLocal()
    
    try:
        bet_service = EnhancedBetService(db)
        updated_count = bet_service.fix_pending_ticket_statuses()
        print(f"✅ Updated {updated_count} tickets from pending to final status")
        
        if updated_count > 0:
            print("🎉 Ticket statuses have been fixed! Check your My Plays page.")
        else:
            print("ℹ️  No tickets needed status updates.")
            
    except Exception as e:
        print(f"❌ Error fixing tickets: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    fix_pending_tickets()
