"""SQLAlchemy ORM Model for Store Zones."""

from sqlalchemy import Column, String, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.database.connection import Base


class ZoneDB(Base):
    __tablename__ = "zones"

    zone_id = Column(String(50), primary_key=True, index=True)
    zone_name = Column(String(100), nullable=False)
    zone_type = Column(String(50), nullable=False)
    camera_id = Column(String(50), ForeignKey("cameras.camera_id", ondelete="SET NULL"), nullable=True)
    description = Column(String(255), nullable=True)

    # Relationships
    camera = relationship("CameraDB", back_populates="zones")
    events = relationship("EventDB", back_populates="zone")
