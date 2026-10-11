"""Health check endpoint."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from pathlib import Path
from backend.app.config import settings
from backend.app.database.session import get_db

router = APIRouter(tags=["Health"])


@router.get("/health")
def get_health(db: Session = Depends(get_db)):
    """Health check endpoint reporting service and database status."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "degraded"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "service": "smart-store-backend",
        "database": db_status,
        "java_module": "available" if Path(settings.JAVA_BIN_DIR, "com", "smartstore", "Main.class").is_file() else "unavailable"
    }
