"""Camera Service for database operations."""

from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.camera import CameraDB
from backend.app.schemas.camera import CameraCreate


class CameraService:
    @staticmethod
    def get_all(db: Session, status: Optional[str] = None) -> List[CameraDB]:
        query = db.query(CameraDB)
        if status:
            query = query.filter(CameraDB.status == status.upper())
        return query.all()

    @staticmethod
    def get_by_id(db: Session, camera_id: str) -> Optional[CameraDB]:
        return db.query(CameraDB).filter(CameraDB.camera_id == camera_id).first()

    @staticmethod
    def create_or_update(db: Session, camera: CameraCreate) -> CameraDB:
        existing = db.query(CameraDB).filter(CameraDB.camera_id == camera.camera_id).first()
        if existing:
            existing.camera_name = camera.camera_name
            existing.location = camera.location
            existing.stream_source = camera.stream_source
            existing.status = camera.status or existing.status
            db.commit()
            db.refresh(existing)
            return existing

        new_cam = CameraDB(
            camera_id=camera.camera_id,
            camera_name=camera.camera_name,
            location=camera.location,
            stream_source=camera.stream_source,
            status=camera.status or "ACTIVE"
        )
        db.add(new_cam)
        db.commit()
        db.refresh(new_cam)
        return new_cam
