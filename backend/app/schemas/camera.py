"""Pydantic schemas for Cameras."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class CameraBase(BaseModel):
    camera_id: str
    camera_name: str
    location: Optional[str] = None
    stream_source: Optional[str] = None
    status: Optional[str] = "ACTIVE"


class CameraCreate(CameraBase):
    pass


class CameraResponse(CameraBase):
    created_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)
