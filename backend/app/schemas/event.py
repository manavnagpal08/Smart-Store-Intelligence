"""Pydantic schemas for Events and Event History."""

from datetime import datetime
from typing import Optional, Dict, Any, List
from pydantic import BaseModel, ConfigDict, Field


class EventBase(BaseModel):
    event_id: str
    event_type: str
    camera_id: str
    zone_id: Optional[str] = None
    track_id: Optional[str] = None
    timestamp: datetime
    severity: str
    status: Optional[str] = "ACTIVE"
    description: Optional[str] = None
    people_count: Optional[int] = None
    details: Optional[Dict[str, Any]] = Field(default_factory=dict)
    resolved_at: Optional[datetime] = None


class EventCreate(EventBase):
    pass


class EventStatusUpdate(BaseModel):
    status: str
    changed_by: Optional[str] = "OPERATOR"


class EventHistoryResponse(BaseModel):
    history_id: int
    event_id: str
    old_status: Optional[str] = None
    new_status: str
    changed_at: Optional[datetime] = None
    changed_by: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class EventResponse(EventBase):
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    history: Optional[List[EventHistoryResponse]] = []

    model_config = ConfigDict(from_attributes=True)


class ValidationResultSchema(BaseModel):
    valid: bool
    event_id: str
    message: str
    rule_violated: Optional[str] = None
