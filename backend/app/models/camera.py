"""SQLAlchemy ORM Model for Cameras."""

from datetime import datetime
from sqlalchemy import Column, String, DateTime
from sqlalchemy.orm import relationship
from backend.app.database.connection import Base


class CameraDB(Base):
    __tablename__ = "cameras"

    camera_id = Column(String(50), primary_key=True, index=True)
    camera_name = Column(String(100), nullable=False)
    location = Column(String(255), nullable=True)
    stream_source = Column(String(500), nullable=True)
    status = Column(String(30), default="ACTIVE")
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    zones = relationship("ZoneDB", back_populates="camera", cascade="all, delete-orphan")
    events = relationship("EventDB", back_populates="camera", cascade="all, delete-orphan")
