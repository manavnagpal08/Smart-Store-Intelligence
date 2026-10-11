"""Event API endpoints."""

import os
import re
import base64
from datetime import datetime
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from fastapi.responses import FileResponse, Response
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.schemas.event import (
    EventResponse,
    EventCreate,
    EventStatusUpdate
)
from backend.app.models.event import EventDB
from backend.app.services.event_service import EventService
from backend.app.security import require_api_key

router = APIRouter(prefix="/events", tags=["Events"])

SNAPSHOTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../snapshots"))
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)


@router.get("", response_model=List[EventResponse])
def get_events(
    status: Optional[str] = Query(None, description="Filter by status (ACTIVE, ACKNOWLEDGED, RESOLVED)"),
    severity: Optional[str] = Query(None, description="Filter by severity (LOW, MEDIUM, HIGH, CRITICAL)"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    camera_id: Optional[str] = Query(None, description="Filter by camera ID"),
    zone_id: Optional[str] = Query(None, description="Filter by zone ID"),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db)
):
    """Retrieve filtered store operations events."""
    return EventService.get_events(
        db=db,
        status=status,
        severity=severity,
        event_type=event_type,
        camera_id=camera_id,
        zone_id=zone_id,
        limit=limit,
        offset=offset
    )


@router.get("/active", response_model=List[EventResponse])
def get_active_events(
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db)
):
    """Retrieve all currently active / unresolved incidents for the dashboard."""
    return EventService.get_active_events(db=db, limit=limit)


@router.get("/evidence/gallery", response_model=List[EventResponse])
def get_evidence_gallery(
    threat_only: bool = Query(True, description="Filter only events with severe threats / snapshots"),
    limit: int = Query(60, ge=1, le=200),
    db: Session = Depends(get_db)
):
    """Retrieve events with forensic evidence snapshots."""
    query = db.query(EventDB)
    if threat_only:
        query = query.filter(
            (EventDB.severity.in_(["HIGH", "CRITICAL"])) |
            (EventDB.snapshot_url.isnot(None)) |
            (EventDB.event_type.in_(["WEAPON_DETECTED", "PHYSICAL_ALTERCATION", "THEFT_SUSPICIOUS", "SLIP_AND_FALL", "RESTRICTED_ENTRY"]))
        )
    return query.order_by(EventDB.timestamp.desc()).limit(limit).all()


@router.get("/snapshots/{filename}")
def get_snapshot_file(filename: str):
    """Serve saved forensic evidence snapshot image."""
    safe_filename = os.path.basename(filename)
    if not re.match(r'^[A-Za-z0-9_\-\.]+\.(jpg|jpeg|png)$', safe_filename):
        raise HTTPException(status_code=400, detail="Invalid snapshot filename")
    
    file_path = os.path.join(SNAPSHOTS_DIR, safe_filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Snapshot file not found")
    
    return FileResponse(file_path, media_type="image/jpeg", headers={"Cache-Control": "public, max-age=86400"})


@router.post("/upload_snapshot")
def upload_event_snapshot(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Save automatically captured forensic screenshot for an incident.
    """
    image_b64 = payload.get("image", "")
    event_id = payload.get("event_id") or f"SNAP-{int(datetime.now().timestamp()*1000)}"
    camera_id = payload.get("camera_id", "CAM-01")
    event_type = payload.get("event_type", "EVIDENCE_SNAPSHOT")
    severity = payload.get("severity", "HIGH")
    description = payload.get("description", "Auto-captured live threat snapshot")
    
    if not image_b64:
        raise HTTPException(status_code=400, detail="Image data is required")
        
    if "," in image_b64:
        image_b64 = image_b64.split(",")[1]
        
    try:
        img_bytes = base64.b64decode(image_b64)
        filename = f"SNAPSHOT_{event_id}.jpg"
        file_path = os.path.join(SNAPSHOTS_DIR, filename)
        with open(file_path, "wb") as f:
            f.write(img_bytes)
            
        snapshot_url = f"/api/events/snapshots/{filename}"
        
        # Check if event exists to link snapshot
        event = db.query(EventDB).filter(EventDB.event_id == event_id).first()
        if event:
            event.snapshot_url = snapshot_url
            if not event.details:
                event.details = {}
            event.details["snapshot_url"] = snapshot_url
            db.commit()
        else:
            # Create standalone forensic event record
            new_event = EventDB(
                event_id=event_id,
                event_type=event_type,
                camera_id=camera_id,
                timestamp=datetime.now(),
                severity=severity,
                status="ACTIVE",
                description=description,
                snapshot_url=snapshot_url,
                details={"snapshot_url": snapshot_url, "auto_captured": True}
            )
            db.add(new_event)
            db.commit()
            
        return {
            "status": "success",
            "event_id": event_id,
            "snapshot_url": snapshot_url,
            "filename": filename
        }
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save snapshot: {str(e)}")


@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: str, db: Session = Depends(get_db)):
    """Retrieve detailed event by event_id with its lifecycle audit history."""
    event = EventService.get_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail=f"Event '{event_id}' not found.")
    return event


@router.post("", response_model=EventResponse, status_code=201)
def create_event(event: EventCreate, db: Session = Depends(get_db), _: None = Depends(require_api_key)):
    """Ingest a new operational event (runs Java business validation before DB insertion)."""
    return EventService.create_or_update(db, event)


@router.patch("/{event_id}/status", response_model=EventResponse)
def update_event_status(
    event_id: str,
    status_update: EventStatusUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(require_api_key)
):
    """Update event lifecycle status (ACTIVE, ACKNOWLEDGED, RESOLVED)."""
    return EventService.update_status(db, event_id, status_update)

