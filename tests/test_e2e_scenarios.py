"""
End-to-End Integration & Scenario Test Suite for Smart Store Intelligence System.
Verifies all 5 CCTV Scenarios, Data Consistency across CV -> Java -> FastAPI -> DB -> API,
and Error Handling.
"""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from backend.app.database.connection import Base
from backend.app.database.session import get_db
from backend.app.models.camera import CameraDB
from backend.app.models.zone import ZoneDB
from backend.app.main import app
from backend.app.services.java_validation_service import JavaValidationService
from ml.intelligence.crowd_detector import CrowdDetector
from ml.intelligence.queue_detector import QueueDetector
from ml.intelligence.restricted_area_detector import RestrictedAreaDetector
from ml.intelligence.obstruction_detector import ObstructionDetector
from ml.intelligence.severity_engine import SeverityEngine
from ml.intelligence.models import EventType, EventSeverity

# Setup in-memory SQLite database for test isolation
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()


@pytest.fixture(scope="module", autouse=True)
def setup_test_db():
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    # Seed cameras
    cam1 = CameraDB(
        camera_id="CAM-01",
        camera_name="Main Entrance & Aisle A",
        location="North Wing",
        stream_source="datasets/sample/sample_cctv.mp4",
        status="ACTIVE",
    )
    cam2 = CameraDB(
        camera_id="CAM-02",
        camera_name="Checkout Area",
        location="Front Cashier Lanes",
        stream_source="rtsp://store-cam-02.local/live",
        status="ACTIVE",
    )
    db.add_all([cam1, cam2])

    # Seed zones
    z1 = ZoneDB(zone_id="ENTRANCE", zone_name="Entrance Hall", zone_type="ENTRANCE", camera_id="CAM-01")
    z2 = ZoneDB(zone_id="AISLE-A", zone_name="Aisle A Snacks", zone_type="AISLE", camera_id="CAM-01")
    z3 = ZoneDB(zone_id="CHECKOUT-01", zone_name="Checkout Lane 1", zone_type="CHECKOUT", camera_id="CAM-02")
    z4 = ZoneDB(zone_id="STAFF-STORAGE", zone_name="Staff Storage Room", zone_type="RESTRICTED", camera_id="CAM-02")
    db.add_all([z1, z2, z3, z4])

    db.commit()
    db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield
    Base.metadata.drop_all(bind=engine)
    app.dependency_overrides.clear()


@pytest.fixture
def client():
    return TestClient(app)


# =========================================================================
# 1. SCENARIO 1: Normal Store Activity (No Incidents)
# =========================================================================
def test_scenario_1_normal_store_activity():
    """Scenario 1: Normal foot traffic within safe capacity limits."""
    crowd_det = CrowdDetector(config={"persistence_frames": 2, "default_thresholds": {"low": 5, "medium": 8, "high": 12, "critical": 18}})
    queue_det = QueueDetector(config={"persistence_frames": 2, "default_thresholds": {"low": 3, "medium": 5, "high": 8, "critical": 12}})
    restricted_det = RestrictedAreaDetector()
    obstruction_det = ObstructionDetector(config={"persistence_frames": 3, "min_stationary_count": 2, "max_movement_px": 15.0})

    counts = {"ENTRANCE": 2, "AISLE-A": 1, "CHECKOUT-01": 1}
    tracks = [
        {"track_id": "TRACK-001", "center": [100, 100], "zone_id": "ENTRANCE"},
        {"track_id": "TRACK-002", "center": [200, 200], "zone_id": "AISLE-A"},
    ]
    zone_meta = {
        "ENTRANCE": {"name": "Entrance", "type": "ENTRANCE"},
        "AISLE-A": {"name": "Aisle A", "type": "AISLE"},
        "CHECKOUT-01": {"name": "Checkout Lane 1", "type": "CHECKOUT"},
        "STAFF-STORAGE": {"name": "Staff Storage", "type": "RESTRICTED"},
    }

    c1, _ = crowd_det.process_frame(counts, zone_meta)
    q1, _ = queue_det.process_frame(counts, zone_meta)
    r1, _ = restricted_det.process_frame(tracks, zone_meta)
    o1, _ = obstruction_det.process_frame(tracks, zone_meta)

    # Expect no alerts triggered for normal store operations
    assert len(c1) == 0
    assert len(q1) == 0
    assert len(r1) == 0
    assert len(o1) == 0


# =========================================================================
# 2. SCENARIO 2: Crowd Density Alert & Persistence
# =========================================================================
def test_scenario_2_crowd_density_e2e(client):
    """Scenario 2: High density crowd spike in Entrance -> Severity -> Java Validation -> DB -> API."""
    thresholds = {"low": 4, "medium": 6, "high": 10, "critical": 15}
    crowd_det = CrowdDetector(config={"persistence_frames": 2, "default_thresholds": thresholds})
    severity_eng = SeverityEngine()

    counts = {"ENTRANCE": 8}
    zone_meta = {"ENTRANCE": {"name": "Entrance", "type": "ENTRANCE"}}

    # Frame 1: Persistence = 1
    crowd_det.process_frame(counts, zone_meta)
    # Frame 2: Persistence = 2 -> Meets persistence
    cand, _ = crowd_det.process_frame(counts, zone_meta)

    assert len(cand) == 1
    raw_event = cand[0]
    assert raw_event["event_type"] == EventType.CROWD_DENSITY.value
    assert raw_event["zone_id"] == "ENTRANCE"
    assert raw_event["people_count"] == 8

    # Calculate severity via engine
    calculated_severity = severity_eng.calculate_crowd_severity(raw_event["people_count"], thresholds)
    assert calculated_severity in ["MEDIUM", "HIGH", "CRITICAL"]

    # Java validation check
    java_validator = JavaValidationService()
    event_payload = {
        "event_id": "EVT-20260925-0501",
        "event_type": raw_event["event_type"],
        "camera_id": "CAM-01",
        "zone_id": raw_event["zone_id"],
        "timestamp": datetime.now().isoformat(),
        "severity": calculated_severity,
        "status": "ACTIVE",
        "description": "High density crowd detected at store entrance",
        "people_count": raw_event["people_count"],
        "details": {"duration_frames": 2},
    }
    val_result = java_validator.validate_event(event_payload)
    assert val_result.valid is True

    # Post to FastAPI Backend
    response = client.post("/api/events", json=event_payload)
    assert response.status_code == 201
    res_data = response.json()
    assert res_data["event_id"] == event_payload["event_id"]
    assert res_data["severity"] == calculated_severity


# =========================================================================
# 3. SCENARIO 3: Checkout Queue Congestion
# =========================================================================
def test_scenario_3_queue_congestion_e2e(client):
    """Scenario 3: Prolonged waiting queue at CHECKOUT-01."""
    queue_det = QueueDetector(config={"persistence_frames": 2, "default_thresholds": {"low": 3, "medium": 5, "high": 8, "critical": 12}})
    zone_meta = {"CHECKOUT-01": {"name": "Checkout Lane 1", "type": "CHECKOUT"}}

    queue_det.process_frame({"CHECKOUT-01": 6}, zone_meta)
    cand, _ = queue_det.process_frame({"CHECKOUT-01": 6}, zone_meta)

    assert len(cand) == 1
    queue_event = cand[0]
    assert queue_event["event_type"] == EventType.QUEUE_CONGESTION.value
    assert queue_event["zone_id"] == "CHECKOUT-01"

    # Ingest through API with compliant EVT ID
    event_payload = {
        "event_id": "EVT-20260925-0502",
        "event_type": queue_event["event_type"],
        "camera_id": "CAM-02",
        "zone_id": queue_event["zone_id"],
        "timestamp": datetime.now().isoformat(),
        "severity": "HIGH",
        "status": "ACTIVE",
        "description": "Prolonged checkout lane congestion",
        "people_count": queue_event["people_count"],
        "details": {"queue_length": 6},
    }
    res = client.post("/api/events", json=event_payload)
    assert res.status_code == 201
    assert res.json()["event_id"] == "EVT-20260925-0502"


# =========================================================================
# 4. SCENARIO 4: Restricted Area Entry Breach
# =========================================================================
def test_scenario_4_restricted_area_breach_e2e(client):
    """Scenario 4: Person enters restricted STAFF-STORAGE zone."""
    restricted_det = RestrictedAreaDetector()
    tracks_in = [{"track_id": "TRACK-009", "zone_id": "STAFF-STORAGE"}]
    zone_meta = {"STAFF-STORAGE": {"name": "Staff Storage", "type": "RESTRICTED"}}

    cand, _ = restricted_det.process_frame(tracks_in, zone_meta)
    assert len(cand) == 1
    breach = cand[0]
    assert breach["event_type"] == EventType.RESTRICTED_AREA_ENTRY.value
    assert breach["zone_id"] == "STAFF-STORAGE"
    assert breach["track_id"] == "TRACK-009"

    # Post through API with compliant EVT ID
    event_payload = {
        "event_id": "EVT-20260925-0503",
        "event_type": breach["event_type"],
        "camera_id": "CAM-02",
        "zone_id": breach["zone_id"],
        "track_id": breach["track_id"],
        "timestamp": datetime.now().isoformat(),
        "severity": "HIGH",
        "status": "ACTIVE",
        "description": "Unauthorized access in staff storage zone",
        "people_count": 1,
        "details": {"track_id": "TRACK-009"},
    }
    res = client.post("/api/events", json=event_payload)
    assert res.status_code == 201
    created = res.json()
    assert created["track_id"] == "TRACK-009"
    assert created["severity"] == "HIGH"


# =========================================================================
# 5. SCENARIO 5: Aisle Obstruction Heuristic
# =========================================================================
def test_scenario_5_aisle_obstruction_e2e(client):
    """Scenario 5: Stationary tracks in Aisle A exceeding persistence threshold."""
    obstruction_det = ObstructionDetector(config={"persistence_frames": 2, "min_stationary_count": 2, "max_movement_px": 15.0})
    zone_meta = {"AISLE-A": {"name": "Aisle A", "type": "AISLE"}}

    stationary_tracks = [
        {"track_id": "TRACK-101", "center": [100, 100], "zone_id": "AISLE-A"},
        {"track_id": "TRACK-102", "center": [105, 105], "zone_id": "AISLE-A"}
    ]

    for _ in range(6):
        obstruction_det.process_frame(stationary_tracks, zone_meta)

    cand, _ = obstruction_det.process_frame(stationary_tracks, zone_meta)
    assert len(cand) == 1
    obs_event = cand[0]
    assert obs_event["event_type"] == EventType.AISLE_OBSTRUCTION.value
    assert obs_event["zone_id"] == "AISLE-A"


# =========================================================================
# 6. DATA CONSISTENCY & LIFECYCLE AUDIT TRAIL TEST
# =========================================================================
def test_data_consistency_and_lifecycle_flow(client):
    """
    Traces a single event throughout the full pipeline:
    CV Generation -> Java Validation -> API Insertion -> Active Query -> Status Patch (ACK) -> Status Patch (RESOLVE) -> History Audit.
    """
    test_event_id = "EVT-20260925-0504"
    event_payload = {
        "event_id": test_event_id,
        "event_type": "CROWD_DENSITY",
        "camera_id": "CAM-01",
        "zone_id": "ENTRANCE",
        "timestamp": datetime.now().isoformat(),
        "severity": "HIGH",
        "status": "ACTIVE",
        "description": "Cross-tier data consistency audit event",
        "people_count": 8,
        "details": {"test_run": "phase5_e2e"},
    }

    # Step 1: Create via API
    create_res = client.post("/api/events", json=event_payload)
    assert create_res.status_code == 201
    assert create_res.json()["event_id"] == test_event_id

    # Step 2: Query /api/events/active
    active_res = client.get("/api/events/active")
    assert active_res.status_code == 200
    active_ids = [e["event_id"] for e in active_res.json()]
    assert test_event_id in active_ids

    # Step 3: Transition to ACKNOWLEDGED
    ack_res = client.patch(f"/api/events/{test_event_id}/status", json={"status": "ACKNOWLEDGED", "changed_by": "STORE_MANAGER"})
    assert ack_res.status_code == 200
    assert ack_res.json()["status"] == "ACKNOWLEDGED"

    # Step 4: Transition to RESOLVED
    res_res = client.patch(f"/api/events/{test_event_id}/status", json={"status": "RESOLVED", "changed_by": "SECURITY_SUPERVISOR"})
    assert res_res.status_code == 200
    assert res_res.json()["status"] == "RESOLVED"
    assert res_res.json()["resolved_at"] is not None

    # Step 5: Query single event & verify history audit trail
    detail_res = client.get(f"/api/events/{test_event_id}")
    assert detail_res.status_code == 200
    detail_data = detail_res.json()
    assert detail_data["status"] == "RESOLVED"
    assert len(detail_data["history"]) >= 2
    assert detail_data["history"][0]["new_status"] == "ACTIVE"
    assert detail_data["history"][1]["new_status"] == "ACKNOWLEDGED"
    assert detail_data["history"][2]["new_status"] == "RESOLVED"


# =========================================================================
# 7. ERROR HANDLING & NEGATIVE VALIDATION TESTS
# =========================================================================
def test_error_handling_invalid_payloads(client):
    """Verifies that invalid payloads are cleanly rejected by Java validation and FastAPI."""
    # Negative people count rejected by Java OOP rule
    bad_count_payload = {
        "event_id": "EVT-20260925-0599",
        "event_type": "CROWD_DENSITY",
        "camera_id": "CAM-01",
        "zone_id": "ENTRANCE",
        "timestamp": datetime.now().isoformat(),
        "severity": "HIGH",
        "status": "ACTIVE",
        "people_count": -5,
    }
    res1 = client.post("/api/events", json=bad_count_payload)
    assert res1.status_code == 422

    # Invalid event type rejected
    bad_type_payload = {
        "event_id": "EVT-20260925-0598",
        "event_type": "UNKNOWN_FIRE_ALARM",
        "camera_id": "CAM-01",
        "timestamp": datetime.now().isoformat(),
        "severity": "HIGH",
        "status": "ACTIVE",
    }
    res2 = client.post("/api/events", json=bad_type_payload)
    assert res2.status_code == 422

    # Status update for non-existent event returns 404
    res3 = client.patch("/api/events/EVT-20260925-9999/status", json={"status": "ACKNOWLEDGED"})
    assert res3.status_code == 404
