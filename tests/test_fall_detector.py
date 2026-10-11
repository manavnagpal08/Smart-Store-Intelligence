"""Temporal validation tests for production fall detection."""

from ml.intelligence.abnormal_detector import SlipAndFallDetector


def _track(bbox):
    return [{"track_id": "TRACK-001", "bbox": bbox, "zone_id": "AISLE-A"}]


def test_static_wide_box_is_not_a_fall():
    detector = SlipAndFallDetector(aspect_ratio_threshold=1.25, persistence_frames=3)

    events = []
    for _ in range(8):
        events.extend(detector.detect(_track([20, 100, 180, 200])))

    assert events == []


def test_upright_downward_prone_transition_emits_once():
    detector = SlipAndFallDetector(
        aspect_ratio_threshold=1.25,
        persistence_frames=3,
        cooldown_seconds=0,
    )

    assert detector.detect(_track([80, 20, 120, 180])) == []
    events = []
    for _ in range(4):
        events.extend(detector.detect(_track([35, 155, 195, 235])))

    assert len(events) == 1
    assert events[0].details["transition_verified"] is True
    assert events[0].details["vertical_drop"] > 0
