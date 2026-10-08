"""Event API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.schemas.event import (
    EventResponse,
    EventCreate,
    EventStatusUpdate
)
from backend.app.services.event_service import EventService

router = APIRouter(prefix="/events", tags=["Events"])


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


@router.get("/{event_id}", response_model=EventResponse)
def get_event(event_id: str, db: Session = Depends(get_db)):
    """Retrieve detailed event by event_id with its lifecycle audit history."""
    event = EventService.get_by_id(db, event_id)
    if not event:
        raise HTTPException(status_code=404, detail=f"Event '{event_id}' not found.")
    return event


@router.post("", response_model=EventResponse, status_code=201)
def create_event(event: EventCreate, db: Session = Depends(get_db)):
    """Ingest a new operational event (runs Java business validation before DB insertion)."""
    return EventService.create_or_update(db, event)


@router.patch("/{event_id}/status", response_model=EventResponse)
def update_event_status(
    event_id: str,
    status_update: EventStatusUpdate,
    db: Session = Depends(get_db)
):
    """Update event lifecycle status (ACTIVE, ACKNOWLEDGED, RESOLVED)."""
    return EventService.update_status(db, event_id, status_update)
