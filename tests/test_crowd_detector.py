"""Unit tests for CrowdDetector."""

from ml.intelligence.crowd_detector import CrowdDetector
from ml.intelligence.models import EventType, EventSeverity


def test_crowd_detector_below_threshold():
    detector = CrowdDetector(config={"persistence_frames": 3, "default_thresholds": {"low": 5, "medium": 8, "high": 12, "critical": 18}})
    counts = {"AISLE-A": 3}
    zone_meta = {"AISLE-A": {"name": "Aisle A", "type": "AISLE"}}

    candidates, cleared = detector.process_frame(counts, zone_meta)
    assert len(candidates) == 0
    assert len(cleared) == 0


def test_crowd_detector_persistence():
    detector = CrowdDetector(config={"persistence_frames": 3, "default_thresholds": {"low": 5, "medium": 8, "high": 12, "critical": 18}})
    counts = {"AISLE-A": 10}
    zone_meta = {"AISLE-A": {"name": "Aisle A", "type": "AISLE"}}

    # Frame 1: Count = 10, below persistence of 3
    cand1, _ = detector.process_frame(counts, zone_meta)
    assert len(cand1) == 0

    # Frame 2: Count = 10
    cand2, _ = detector.process_frame(counts, zone_meta)
    assert len(cand2) == 0

    # Frame 3: Count = 10 -> Meets persistence of 3
    cand3, _ = detector.process_frame(counts, zone_meta)
    assert len(cand3) == 1
    assert cand3[0]["event_type"] == EventType.CROWD_DENSITY.value
    assert cand3[0]["zone_id"] == "AISLE-A"
    assert cand3[0]["people_count"] == 10
    assert cand3[0]["severity"] == EventSeverity.MEDIUM.value


def test_crowd_detector_resolution():
    detector = CrowdDetector(config={"persistence_frames": 2, "default_thresholds": {"low": 5, "medium": 8, "high": 12, "critical": 18}})
    counts_high = {"AISLE-A": 12}
    counts_low = {"AISLE-A": 2}
    zone_meta = {"AISLE-A": {"name": "Aisle A", "type": "AISLE"}}

    detector.process_frame(counts_high, zone_meta)
    cand, _ = detector.process_frame(counts_high, zone_meta)
    assert len(cand) == 1

    # Now crowd drops below threshold
    cand_after, cleared = detector.process_frame(counts_low, zone_meta)
    assert len(cand_after) == 0
    assert "AISLE-A" in cleared
