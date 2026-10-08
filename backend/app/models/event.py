"""SQLAlchemy ORM Models for Store Events and Lifecycle History."""

from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, Text, JSON, ForeignKey, BigInteger
from sqlalchemy.orm import relationship
from backend.app.database.connection import Base


class EventDB(Base):
    __tablename__ = "events"

    event_id = Column(String(50), primary_key=True, index=True)
    event_type = Column(String(50), nullable=False, index=True)
    camera_id = Column(String(50), ForeignKey("cameras.camera_id", ondelete="CASCADE"), nullable=False, index=True)
    zone_id = Column(String(50), ForeignKey("zones.zone_id", ondelete="SET NULL"), nullable=True, index=True)
    track_id = Column(String(50), nullable=True)
    timestamp = Column(DateTime, nullable=False, index=True)
    severity = Column(String(20), nullable=False, index=True)
    status = Column(String(20), nullable=False, default="ACTIVE", index=True)
    description = Column(Text, nullable=True)
    people_count = Column(Integer, nullable=True)
    details = Column(JSON, nullable=True)
    resolved_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    camera = relationship("CameraDB", back_populates="events")
    zone = relationship("ZoneDB", back_populates="events")
    history = relationship("EventHistoryDB", back_populates="event", cascade="all, delete-orphan")


class EventHistoryDB(Base):
    __tablename__ = "event_history"

    history_id = Column(BigInteger().with_variant(Integer, "sqlite"), primary_key=True, autoincrement=True)
    event_id = Column(String(50), ForeignKey("events.event_id", ondelete="CASCADE"), nullable=False, index=True)
    old_status = Column(String(20), nullable=True)
    new_status = Column(String(20), nullable=False)
    changed_at = Column(DateTime, default=datetime.utcnow)
    changed_by = Column(String(100), default="SYSTEM")

    # Relationship
    event = relationship("EventDB", back_populates="history")
