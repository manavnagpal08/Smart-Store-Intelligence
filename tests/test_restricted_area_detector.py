"""Unit tests for RestrictedAreaDetector."""

from ml.intelligence.restricted_area_detector import RestrictedAreaDetector
from ml.intelligence.models import EventType, EventSeverity


def test_restricted_area_no_person():
    detector = RestrictedAreaDetector()
    tracks = [{"track_id": "TRACK-001", "zone_id": "AISLE-A"}]
    zone_meta = {"RESTRICTED": {"name": "Backroom", "type": "RESTRICTED"}}

    candidates, cleared = detector.process_frame(tracks, zone_meta)
    assert len(candidates) == 0
    assert len(cleared) == 0


def test_restricted_area_entry_and_exit():
    detector = RestrictedAreaDetector()
    tracks_in = [{"track_id": "TRACK-002", "zone_id": "RESTRICTED"}]
    tracks_out = [{"track_id": "TRACK-002", "zone_id": "AISLE-A"}]
    zone_meta = {"RESTRICTED": {"name": "Backroom", "type": "RESTRICTED"}}

    # Frame 1: Person enters restricted zone
    cand1, _ = detector.process_frame(tracks_in, zone_meta)
    assert len(cand1) == 1
    assert cand1[0]["event_type"] == EventType.RESTRICTED_AREA_ENTRY.value
    assert cand1[0]["track_id"] == "TRACK-002"
    assert cand1[0]["severity"] == EventSeverity.HIGH.value

    # Frame 2: Person remains in restricted zone
    cand2, _ = detector.process_frame(tracks_in, zone_meta)
    assert len(cand2) == 1
    assert cand2[0]["duration_frames"] == 2

    # Frame 3: Person exits restricted zone
    cand3, cleared = detector.process_frame(tracks_out, zone_meta)
    assert len(cand3) == 0
    assert ("RESTRICTED", "TRACK-002") in cleared
