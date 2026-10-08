"""Unit tests for Database ORM Models and Relationships."""

import pytest
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app.database.connection import Base
from backend.app.models.camera import CameraDB
from backend.app.models.zone import ZoneDB
from backend.app.models.event import EventDB, EventHistoryDB


@pytest.fixture
def db_session():
    engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()
    Base.metadata.drop_all(bind=engine)


def test_camera_zone_relationships(db_session):
    cam = CameraDB(camera_id="CAM-01", camera_name="Overhead Camera", status="ACTIVE")
    zone = ZoneDB(zone_id="AISLE-A", zone_name="Aisle A", zone_type="AISLE", camera_id="CAM-01")

    db_session.add(cam)
    db_session.add(zone)
    db_session.commit()

    saved_cam = db_session.query(CameraDB).filter(CameraDB.camera_id == "CAM-01").first()
    assert saved_cam is not None
    assert len(saved_cam.zones) == 1
    assert saved_cam.zones[0].zone_id == "AISLE-A"


def test_event_and_history_cascade(db_session):
    cam = CameraDB(camera_id="CAM-01", camera_name="Overhead Camera", status="ACTIVE")
    db_session.add(cam)
    db_session.commit()

    evt = EventDB(
        event_id="EVT-20260925-0001",
        event_type="RESTRICTED_AREA_ENTRY",
        camera_id="CAM-01",
        zone_id="RESTRICTED",
        track_id="TRACK-001",
        timestamp=datetime.utcnow(),
        severity="HIGH",
        status="ACTIVE",
        description="Restricted entry",
        people_count=1
    )
    db_session.add(evt)
    db_session.commit()

    h1 = EventHistoryDB(event_id=evt.event_id, old_status=None, new_status="ACTIVE")
    h2 = EventHistoryDB(event_id=evt.event_id, old_status="ACTIVE", new_status="RESOLVED")
    db_session.add_all([h1, h2])
    db_session.commit()

    fetched = db_session.query(EventDB).filter(EventDB.event_id == "EVT-20260925-0001").first()
    assert len(fetched.history) == 2
