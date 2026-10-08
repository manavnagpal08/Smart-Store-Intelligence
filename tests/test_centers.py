"""Unit tests for detection and tracking bounding box center calculations."""

import pytest
from ml.detection.person_detector import Detection
from ml.tracking.person_tracker import Track, FallbackIoUTracker


def test_detection_center_calculation():
    # Box [x1, y1, x2, y2]
    det = Detection(bbox=[100, 200, 300, 400], confidence=0.92)
    # cx = (100 + 300) / 2 = 200, cy = (200 + 400) / 2 = 300
    assert det.center == [200, 300]


def test_detection_center_odd_dimensions():
    det = Detection(bbox=[101, 205, 300, 400], confidence=0.85)
    # cx = int(401/2) = 200, cy = int(605/2) = 302
    assert det.center == [200, 302]


def test_track_center_and_dict():
    track = Track(
        track_id="TRACK-001",
        bbox=[50, 60, 150, 180],
        confidence=0.884,
        center=[100, 120],
        zone_id="AISLE-A"
    )
    t_dict = track.to_dict()
    assert t_dict["track_id"] == "TRACK-001"
    assert t_dict["center"] == [100, 120]
    assert t_dict["confidence"] == 0.884
    assert t_dict["zone_id"] == "AISLE-A"
    assert t_dict["bbox"] == [50, 60, 150, 180]


def test_fallback_tracker_iou():
    boxA = [100, 100, 200, 200]  # area 10000
    boxB = [100, 100, 200, 200]  # exact overlap
    assert pytest.approx(FallbackIoUTracker.calculate_iou(boxA, boxB)) == 1.0

    boxC = [300, 300, 400, 400]  # no overlap
    assert FallbackIoUTracker.calculate_iou(boxA, boxC) == 0.0

    boxD = [150, 100, 250, 200]  # partial overlap: inter=50*100=5000, union=15000 -> 1/3
    assert pytest.approx(FallbackIoUTracker.calculate_iou(boxA, boxD), 0.01) == 0.333
