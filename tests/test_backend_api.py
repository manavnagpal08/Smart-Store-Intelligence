"""Unit and Integration tests for FastAPI Backend Endpoints."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from datetime import datetime

from backend.app.main import app
from backend.app.database.connection import Base
from backend.app.database.session import get_db
from backend.app.models.camera import CameraDB
from backend.app.models.zone import ZoneDB

# Setup isolated in-memory SQLite database with StaticPool for API testing
TEST_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    TEST_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=test_engine)
    db = TestingSessionLocal()
    # Seed camera and zones for test
    cam = CameraDB(camera_id="CAM-01", camera_name="Test Camera", location="Lobby", status="ACTIVE")
    zone1 = ZoneDB(zone_id="AISLE-A", zone_name="Aisle A", zone_type="AISLE", camera_id="CAM-01")
    zone2 = ZoneDB(zone_id="RESTRICTED", zone_name="Backroom", zone_type="RESTRICTED", camera_id="CAM-01")
    db.add_all([cam, zone1, zone2])
    db.commit()
    db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=test_engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


def test_health_endpoint(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ("healthy", "degraded")
    assert data["service"] == "smart-store-backend"


def test_cameras_endpoints(client):
    # GET list
    resp = client.get("/api/cameras")
    assert resp.status_code == 200
    cameras = resp.json()
    assert len(cameras) >= 1
    assert any(c["camera_id"] == "CAM-01" for c in cameras)

    # GET single
    resp_single = client.get("/api/cameras/CAM-01")
    assert resp_single.status_code == 200
    assert resp_single.json()["camera_id"] == "CAM-01"

    # GET 404
    resp_404 = client.get("/api/cameras/CAM-NONEXISTENT")
    assert resp_404.status_code == 404


def test_zones_endpoints(client):
    resp = client.get("/api/zones")
    assert resp.status_code == 200
    zones = resp.json()
    assert len(zones) >= 2

    # GET with filter
    resp_filter = client.get("/api/zones?zone_type=RESTRICTED")
    assert resp_filter.status_code == 200
    assert all(z["zone_type"] == "RESTRICTED" for z in resp_filter.json())


def test_create_and_query_event(client):
    event_payload = {
        "event_id": "EVT-20260925-0101",
        "event_type": "CROWD_DENSITY",
        "camera_id": "CAM-01",
        "zone_id": "AISLE-A",
        "timestamp": "2026-09-25T10:15:00",
        "severity": "HIGH",
        "status": "ACTIVE",
        "description": "Crowd congestion detected",
        "people_count": 12,
        "details": {"duration_frames": 10}
    }

    # POST create event (runs Java validation)
    resp = client.post("/api/events", json=event_payload)
    assert resp.status_code == 201
    created = resp.json()
    assert created["event_id"] == "EVT-20260925-0101"
    assert created["status"] == "ACTIVE"

    # GET events list
    resp_list = client.get("/api/events?event_type=CROWD_DENSITY")
    assert resp_list.status_code == 200
    assert len(resp_list.json()) >= 1

    # GET active events
    resp_active = client.get("/api/events/active")
    assert resp_active.status_code == 200
    assert any(e["event_id"] == "EVT-20260925-0101" for e in resp_active.json())

    # GET single event with history
    resp_get = client.get("/api/events/EVT-20260925-0101")
    assert resp_get.status_code == 200
    evt_data = resp_get.json()
    assert len(evt_data["history"]) >= 1
    assert evt_data["history"][0]["new_status"] == "ACTIVE"


def test_event_status_lifecycle_patch(client):
    # Update to ACKNOWLEDGED
    patch_resp = client.patch(
        "/api/events/EVT-20260925-0101/status",
        json={"status": "ACKNOWLEDGED", "changed_by": "OPERATOR_JANE"}
    )
    assert patch_resp.status_code == 200
    assert patch_resp.json()["status"] == "ACKNOWLEDGED"

    # Update to RESOLVED
    patch_resolved = client.patch(
        "/api/events/EVT-20260925-0101/status",
        json={"status": "RESOLVED", "changed_by": "SYSTEM"}
    )
    assert patch_resolved.status_code == 200
    assert patch_resolved.json()["status"] == "RESOLVED"
    assert patch_resolved.json()["resolved_at"] is not None

    # Verify event history audit trail
    get_resp = client.get("/api/events/EVT-20260925-0101")
    history = get_resp.json()["history"]
    assert len(history) == 3
    statuses = [h["new_status"] for h in history]
    assert statuses == ["ACTIVE", "ACKNOWLEDGED", "RESOLVED"]


def test_event_java_validation_rejection(client):
    # Attempt inserting an event that violates Java business rules:
    # 20 people with LOW severity -> CrowdBusinessRule should reject with 422
    invalid_event = {
        "event_id": "EVT-20260925-0999",
        "event_type": "CROWD_DENSITY",
        "camera_id": "CAM-01",
        "zone_id": "AISLE-A",
        "timestamp": "2026-09-25T10:15:00",
        "severity": "LOW",
        "status": "ACTIVE",
        "description": "Invalid crowd severity",
        "people_count": 20
    }
    resp = client.post("/api/events", json=invalid_event)
    assert resp.status_code == 422
    assert "Business Validation Failed" in resp.json()["detail"]
    assert "CrowdBusinessRule" in resp.json()["detail"]


def test_invalid_status_transition_error(client):
    resp = client.patch(
        "/api/events/EVT-20260925-0101/status",
        json={"status": "INVALID_STATUS_NAME"}
    )
    assert resp.status_code == 400
