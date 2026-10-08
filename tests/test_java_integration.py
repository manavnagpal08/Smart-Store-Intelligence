"""Unit tests for Python <-> Java Validation Service Integration."""

from backend.app.services.java_validation_service import JavaValidationService


def test_java_validation_service_success():
    service = JavaValidationService()
    event_dict = {
        "event_id": "EVT-20260925-0001",
        "event_type": "CROWD_DENSITY",
        "camera_id": "CAM-01",
        "zone_id": "AISLE-A",
        "timestamp": "2026-09-25T10:15:08",
        "severity": "HIGH",
        "status": "ACTIVE",
        "description": "High crowd density",
        "people_count": 10
    }
    result = service.validate_event(event_dict)
    assert result.valid is True
    assert result.event_id == "EVT-20260925-0001"


def test_java_validation_service_rejection():
    service = JavaValidationService()
    # Violates RestrictedAreaBusinessRule (requires HIGH or CRITICAL)
    event_dict = {
        "event_id": "EVT-20260925-0002",
        "event_type": "RESTRICTED_AREA_ENTRY",
        "camera_id": "CAM-01",
        "zone_id": "RESTRICTED",
        "timestamp": "2026-09-25T10:15:08",
        "severity": "LOW",
        "status": "ACTIVE",
        "description": "Unauthorized entry",
        "people_count": 1,
        "track_id": "TRACK-001"
    }
    result = service.validate_event(event_dict)
    assert result.valid is False
    assert result.event_id == "EVT-20260925-0002"
    assert "RestrictedAreaBusinessRule" in str(result.rule_violated)
