"""Unit tests for QueueDetector."""

from ml.intelligence.queue_detector import QueueDetector
from ml.intelligence.models import EventType, EventSeverity


def test_queue_detector_normal():
    detector = QueueDetector(config={"persistence_frames": 2, "default_thresholds": {"low": 3, "medium": 5, "high": 8, "critical": 12}})
    counts = {"CHECKOUT-01": 1}
    zone_meta = {"CHECKOUT-01": {"name": "Checkout Lane 1", "type": "CHECKOUT"}}

    candidates, cleared = detector.process_frame(counts, zone_meta)
    assert len(candidates) == 0
    assert len(cleared) == 0


def test_queue_detector_congestion():
    detector = QueueDetector(config={"persistence_frames": 2, "default_thresholds": {"low": 3, "medium": 5, "high": 8, "critical": 12}})
    counts = {"CHECKOUT-01": 6}
    zone_meta = {"CHECKOUT-01": {"name": "Checkout Lane 1", "type": "CHECKOUT"}}

    # Frame 1
    cand1, _ = detector.process_frame(counts, zone_meta)
    assert len(cand1) == 0

    # Frame 2 -> meets persistence
    cand2, _ = detector.process_frame(counts, zone_meta)
    assert len(cand2) == 1
    assert cand2[0]["event_type"] == EventType.QUEUE_CONGESTION.value
    assert cand2[0]["zone_id"] == "CHECKOUT-01"
    assert cand2[0]["people_count"] == 6
    assert cand2[0]["severity"] == EventSeverity.MEDIUM.value


def test_queue_detector_resolution():
    detector = QueueDetector(config={"persistence_frames": 1, "default_thresholds": {"low": 3, "medium": 5, "high": 8, "critical": 12}})
    zone_meta = {"CHECKOUT-01": {"name": "Checkout Lane 1", "type": "CHECKOUT"}}

    detector.process_frame({"CHECKOUT-01": 5}, zone_meta)
    _, cleared = detector.process_frame({"CHECKOUT-01": 0}, zone_meta)
    assert "CHECKOUT-01" in cleared
