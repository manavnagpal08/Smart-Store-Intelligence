"""Zone Service for database operations."""

from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.zone import ZoneDB
from backend.app.schemas.zone import ZoneCreate


class ZoneService:
    @staticmethod
    def get_all(
        db: Session, camera_id: Optional[str] = None, zone_type: Optional[str] = None
    ) -> List[ZoneDB]:
        query = db.query(ZoneDB)
        if camera_id:
            query = query.filter(ZoneDB.camera_id == camera_id)
        if zone_type:
            query = query.filter(ZoneDB.zone_type == zone_type.upper())
        return query.all()

    @staticmethod
    def get_by_id(db: Session, zone_id: str) -> Optional[ZoneDB]:
        return db.query(ZoneDB).filter(ZoneDB.zone_id == zone_id).first()

    @staticmethod
    def create_or_update(db: Session, zone: ZoneCreate) -> ZoneDB:
        existing = db.query(ZoneDB).filter(ZoneDB.zone_id == zone.zone_id).first()
        if existing:
            existing.zone_name = zone.zone_name
            existing.zone_type = zone.zone_type
            existing.camera_id = zone.camera_id
            existing.description = zone.description
            db.commit()
            db.refresh(existing)
            return existing

        new_zone = ZoneDB(
            zone_id=zone.zone_id,
            zone_name=zone.zone_name,
            zone_type=zone.zone_type,
            camera_id=zone.camera_id,
            description=zone.description
        )
        db.add(new_zone)
        db.commit()
        db.refresh(new_zone)
        return new_zone
