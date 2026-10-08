"""Event Service for database operations, validation, and lifecycle transitions."""

from datetime import datetime
from typing import List, Optional, Tuple, Dict, Any
from sqlalchemy.orm import Session
from fastapi import HTTPException

from backend.app.models.event import EventDB, EventHistoryDB
from backend.app.models.camera import CameraDB
from backend.app.schemas.event import EventCreate, EventStatusUpdate
from backend.app.services.java_validation_service import java_validator


class EventService:
    @staticmethod
    def get_events(
        db: Session,
        status: Optional[str] = None,
        severity: Optional[str] = None,
        event_type: Optional[str] = None,
        camera_id: Optional[str] = None,
        zone_id: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[EventDB]:
        query = db.query(EventDB)
        if status:
            query = query.filter(EventDB.status == status.upper())
        if severity:
            query = query.filter(EventDB.severity == severity.upper())
        if event_type:
            query = query.filter(EventDB.event_type == event_type.upper())
        if camera_id:
            query = query.filter(EventDB.camera_id == camera_id)
        if zone_id:
            query = query.filter(EventDB.zone_id == zone_id)

        return query.order_by(EventDB.timestamp.desc()).offset(offset).limit(limit).all()

    @staticmethod
    def get_active_events(db: Session, limit: int = 100) -> List[EventDB]:
        return (
            db.query(EventDB)
            .filter(EventDB.status == "ACTIVE")
            .order_by(EventDB.timestamp.desc())
            .limit(limit)
            .all()
        )

    @staticmethod
    def get_by_id(db: Session, event_id: str) -> Optional[EventDB]:
        return db.query(EventDB).filter(EventDB.event_id == event_id).first()

    @staticmethod
    def create_or_update(db: Session, event: EventCreate) -> EventDB:
        # 1. Java OOP Business Validation
        val_res = java_validator.validate_event(event.model_dump())
        if not val_res.valid:
            raise HTTPException(
                status_code=422,
                detail=f"Business Validation Failed [{val_res.rule_violated}]: {val_res.message}"
            )

        # 2. Ensure camera exists for foreign key constraint
        cam = db.query(CameraDB).filter(CameraDB.camera_id == event.camera_id).first()
        if not cam:
            cam = CameraDB(
                camera_id=event.camera_id,
                camera_name=f"Camera {event.camera_id}",
                status="ACTIVE"
            )
            db.add(cam)
            db.commit()

        # 3. Check for existing event ID (deduplicate / update)
        existing = db.query(EventDB).filter(EventDB.event_id == event.event_id).first()
        target_status = event.status.upper() if event.status else "ACTIVE"

        if existing:
            old_status = existing.status
            existing.event_type = event.event_type
            existing.zone_id = event.zone_id
            existing.track_id = event.track_id
            existing.timestamp = event.timestamp
            existing.severity = event.severity
            existing.status = target_status
            existing.description = event.description
            existing.people_count = event.people_count
            existing.details = event.details
            existing.resolved_at = event.resolved_at

            if old_status != target_status:
                history = EventHistoryDB(
                    event_id=existing.event_id,
                    old_status=old_status,
                    new_status=target_status,
                    changed_by="INGESTION"
                )
                db.add(history)

            db.commit()
            db.refresh(existing)
            return existing

        # Create New Event
        new_event = EventDB(
            event_id=event.event_id,
            event_type=event.event_type,
            camera_id=event.camera_id,
            zone_id=event.zone_id,
            track_id=event.track_id,
            timestamp=event.timestamp,
            severity=event.severity,
            status=target_status,
            description=event.description,
            people_count=event.people_count,
            details=event.details,
            resolved_at=event.resolved_at
        )
        db.add(new_event)

        # Initial history record
        history = EventHistoryDB(
            event_id=new_event.event_id,
            old_status=None,
            new_status=target_status,
            changed_by="SYSTEM"
        )
        db.add(history)

        db.commit()
        db.refresh(new_event)
        return new_event

    @staticmethod
    def update_status(db: Session, event_id: str, update_data: EventStatusUpdate) -> EventDB:
        event = db.query(EventDB).filter(EventDB.event_id == event_id).first()
        if not event:
            raise HTTPException(status_code=404, detail=f"Event '{event_id}' not found.")

        new_status = update_data.status.upper()
        if new_status not in ("DETECTED", "ACTIVE", "ACKNOWLEDGED", "RESOLVED"):
            raise HTTPException(
                status_code=400,
                detail=f"Invalid status '{new_status}'. Expected ACTIVE, ACKNOWLEDGED, or RESOLVED."
            )

        old_status = event.status
        if old_status != new_status:
            event.status = new_status
            if new_status == "RESOLVED":
                event.resolved_at = datetime.utcnow()

            history = EventHistoryDB(
                event_id=event.event_id,
                old_status=old_status,
                new_status=new_status,
                changed_by=update_data.changed_by or "OPERATOR"
            )
            db.add(history)
            db.commit()
            db.refresh(event)

        return event
