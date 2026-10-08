"""Zone API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.schemas.zone import ZoneResponse, ZoneCreate
from backend.app.services.zone_service import ZoneService

router = APIRouter(prefix="/zones", tags=["Zones"])


@router.get("", response_model=List[ZoneResponse])
def get_zones(
    camera_id: Optional[str] = None,
    zone_type: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """List all store zones with optional camera or zone type filtering."""
    return ZoneService.get_all(db, camera_id=camera_id, zone_type=zone_type)


@router.get("/{zone_id}", response_model=ZoneResponse)
def get_zone(zone_id: str, db: Session = Depends(get_db)):
    """Retrieve zone details by zone_id."""
    zone = ZoneService.get_by_id(db, zone_id)
    if not zone:
        raise HTTPException(status_code=404, detail=f"Zone '{zone_id}' not found.")
    return zone


@router.post("", response_model=ZoneResponse, status_code=201)
def create_zone(zone: ZoneCreate, db: Session = Depends(get_db)):
    """Register or update a store zone."""
    return ZoneService.create_or_update(db, zone)
