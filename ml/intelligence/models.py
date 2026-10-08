"""Domain models for Phase 2 Store Intelligence & Alert Engine."""

from dataclasses import dataclass, field
from enum import Enum
from typing import Optional, Dict, Any
from datetime import datetime


class EventType(str, Enum):
    """Controlled set of store operational event types."""
    CROWD_DENSITY = "CROWD_DENSITY"
    QUEUE_CONGESTION = "QUEUE_CONGESTION"
    RESTRICTED_AREA_ENTRY = "RESTRICTED_AREA_ENTRY"
    AISLE_OBSTRUCTION = "AISLE_OBSTRUCTION"
    WEAPON_DETECTED = "WEAPON_DETECTED"
    FIGHT_ALTERCATION = "FIGHT_ALTERCATION"
    SUSPICIOUS_THEFT = "SUSPICIOUS_THEFT"
    SLIP_AND_FALL = "SLIP_AND_FALL"
    ABANDONED_OBJECT = "ABANDONED_OBJECT"


class EventStatus(str, Enum):
    """Incident lifecycle status."""
    DETECTED = "DETECTED"
    ACTIVE = "ACTIVE"
    ACKNOWLEDGED = "ACKNOWLEDGED"
    RESOLVED = "RESOLVED"


class EventSeverity(str, Enum):
    """Event severity levels."""
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


@dataclass
class StoreEvent:
    """Represents a structured retail operational incident or alert."""
    event_id: str
    event_type: str
    camera_id: str
    zone_id: str
    timestamp: str
    severity: str
    status: str = EventStatus.ACTIVE.value
    description: str = ""
    people_count: Optional[int] = None
    track_id: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)
    resolved_at: Optional[str] = None
    acknowledged_at: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert event to clean JSON-serializable dictionary."""
        data: Dict[str, Any] = {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "camera_id": self.camera_id,
            "zone_id": self.zone_id,
            "timestamp": self.timestamp,
            "severity": self.severity,
            "status": self.status,
            "description": self.description,
        }
        if self.people_count is not None:
            data["people_count"] = self.people_count
        if self.track_id is not None:
            data["track_id"] = self.track_id
        if self.details:
            data["details"] = self.details
        if self.resolved_at is not None:
            data["resolved_at"] = self.resolved_at
        if self.acknowledged_at is not None:
            data["acknowledged_at"] = self.acknowledged_at
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "StoreEvent":
        """Reconstruct event from dictionary."""
        return cls(
            event_id=data["event_id"],
            event_type=data["event_type"],
            camera_id=data["camera_id"],
            zone_id=data["zone_id"],
            timestamp=data["timestamp"],
            severity=data["severity"],
            status=data.get("status", EventStatus.ACTIVE.value),
            description=data.get("description", ""),
            people_count=data.get("people_count"),
            track_id=data.get("track_id"),
            details=data.get("details", {}),
            resolved_at=data.get("resolved_at"),
            acknowledged_at=data.get("acknowledged_at")
        )
