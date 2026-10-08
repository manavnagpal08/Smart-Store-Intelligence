"""Camera API endpoints."""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.schemas.camera import CameraResponse, CameraCreate
from backend.app.services.camera_service import CameraService

router = APIRouter(prefix="/cameras", tags=["Cameras"])


@router.get("", response_model=List[CameraResponse])
def get_cameras(status: Optional[str] = None, db: Session = Depends(get_db)):
    """List all registered cameras."""
    return CameraService.get_all(db, status=status)


@router.get("/{camera_id}", response_model=CameraResponse)
def get_camera(camera_id: str, db: Session = Depends(get_db)):
    """Retrieve camera metadata by camera_id."""
    camera = CameraService.get_by_id(db, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail=f"Camera '{camera_id}' not found.")
    return camera


@router.post("", response_model=CameraResponse, status_code=201)
def create_camera(camera: CameraCreate, db: Session = Depends(get_db)):
    """Register or update a CCTV camera."""
    return CameraService.create_or_update(db, camera)
