"""Pydantic schemas for Store Zones."""

from typing import Optional
from pydantic import BaseModel, ConfigDict


class ZoneBase(BaseModel):
    zone_id: str
    zone_name: str
    zone_type: str
    camera_id: Optional[str] = None
    description: Optional[str] = None


class ZoneCreate(ZoneBase):
    pass


class ZoneResponse(ZoneBase):
    model_config = ConfigDict(from_attributes=True)
