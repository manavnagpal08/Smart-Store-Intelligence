"""Unit tests for ObstructionDetector (Prototype inference)."""

from ml.intelligence.obstruction_detector import ObstructionDetector
from ml.intelligence.models import EventType, EventSeverity


def test_obstruction_stationary_group():
    detector = ObstructionDetector(config={"persistence_frames": 3, "min_stationary_count": 2, "max_movement_px": 15.0})
    zone_meta = {"AISLE-A": {"name": "Aisle A", "type": "AISLE"}}

    # Stationary tracks staying near (100, 100) and (105, 105)
    stationary_tracks = [
        {"track_id": "TRACK-001", "center": [100, 100], "zone_id": "AISLE-A"},
        {"track_id": "TRACK-002", "center": [105, 105], "zone_id": "AISLE-A"}
    ]

    # Feed 4 frames to build history
    detector.process_frame(stationary_tracks, zone_meta)
    detector.process_frame(stationary_tracks, zone_meta)
    detector.process_frame(stationary_tracks, zone_meta)
    detector.process_frame(stationary_tracks, zone_meta)

    # Frame 5: History >= 5, stationary count = 2 -> duration = 1
    cand5, _ = detector.process_frame(stationary_tracks, zone_meta)
    # Frame 6: duration = 2
    cand6, _ = detector.process_frame(stationary_tracks, zone_meta)
    # Frame 7: duration = 3 -> meets persistence
    cand7, _ = detector.process_frame(stationary_tracks, zone_meta)

    assert len(cand7) == 1
    assert cand7[0]["event_type"] == EventType.AISLE_OBSTRUCTION.value
    assert cand7[0]["zone_id"] == "AISLE-A"
    assert cand7[0]["people_count"] == 2


def test_moving_people_no_obstruction():
    detector = ObstructionDetector(config={"persistence_frames": 3, "min_stationary_count": 2, "max_movement_px": 15.0})
    zone_meta = {"AISLE-A": {"name": "Aisle A", "type": "AISLE"}}

    for i in range(10):
        moving_tracks = [
            {"track_id": "TRACK-001", "center": [100 + i * 20, 100], "zone_id": "AISLE-A"},
            {"track_id": "TRACK-002", "center": [105 + i * 20, 105], "zone_id": "AISLE-A"}
        ]
        candidates, _ = detector.process_frame(moving_tracks, zone_meta)
        assert len(candidates) == 0
