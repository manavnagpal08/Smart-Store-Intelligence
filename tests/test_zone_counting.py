"""Unit tests for zone assignment and counting of anonymous tracks."""

from ml.zones.zone_config import Zone
from ml.zones.zone_manager import ZoneManager


def test_zone_counting_standard():
    zone_a = Zone(
        zone_id="AISLE-A",
        name="Aisle A",
        type="AISLE",
        points=[[0, 0], [200, 0], [200, 200], [0, 200]]
    )
    zone_b = Zone(
        zone_id="CHECKOUT",
        name="Checkout",
        type="CHECKOUT",
        points=[[300, 0], [500, 0], [500, 200], [300, 200]]
    )
    zm = ZoneManager(zones=[zone_a, zone_b])

    tracks = [
        {"track_id": "TRACK-001", "center": [50, 50]},    # AISLE-A
        {"track_id": "TRACK-002", "center": [150, 150]},  # AISLE-A
        {"track_id": "TRACK-003", "center": [350, 50]},   # CHECKOUT
        {"track_id": "TRACK-004", "center": [800, 800]}   # UNASSIGNED
    ]

    assigned = zm.assign_tracks(tracks)
    assert assigned[0]["zone_id"] == "AISLE-A"
    assert assigned[1]["zone_id"] == "AISLE-A"
    assert assigned[2]["zone_id"] == "CHECKOUT"
    assert assigned[3]["zone_id"] is None

    counts = zm.count_by_zone(assigned)
    assert counts["AISLE-A"] == 2
    assert counts["CHECKOUT"] == 1


def test_zone_counting_empty():
    zone_a = Zone(
        zone_id="AISLE-A",
        name="Aisle A",
        type="AISLE",
        points=[[0, 0], [200, 0], [200, 200], [0, 200]]
    )
    zm = ZoneManager(zones=[zone_a])

    counts = zm.count_by_zone([])
    assert counts == {"AISLE-A": 0}


def test_zone_counting_duplicate_tracks():
    # Verify counting counts unique track IDs per zone
    zone_a = Zone(
        zone_id="AISLE-A",
        name="Aisle A",
        type="AISLE",
        points=[[0, 0], [200, 0], [200, 200], [0, 200]]
    )
    zm = ZoneManager(zones=[zone_a])

    tracks = [
        {"track_id": "TRACK-001", "center": [50, 50], "zone_id": "AISLE-A"},
        {"track_id": "TRACK-001", "center": [60, 60], "zone_id": "AISLE-A"},  # same track ID
        {"track_id": "TRACK-002", "center": [100, 100], "zone_id": "AISLE-A"}
    ]

    counts = zm.count_by_zone(tracks)
    assert counts["AISLE-A"] == 2
