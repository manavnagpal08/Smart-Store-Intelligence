"""Unit tests for Zone and ZoneManager containment algorithms."""

import pytest
from ml.zones.zone_config import Zone
from ml.zones.zone_manager import ZoneManager


def test_zone_creation_and_validation():
    zone = Zone(
        zone_id="AISLE-A",
        name="Aisle A",
        type="AISLE",
        points=[[100, 100], [300, 100], [300, 300], [100, 300]]
    )
    assert zone.zone_id == "AISLE-A"
    assert len(zone.points) == 4


def test_zone_invalid_points():
    with pytest.raises(ValueError, match="at least 3 polygon points"):
        Zone.from_dict({
            "zone_id": "INVALID",
            "name": "Invalid",
            "type": "AISLE",
            "points": [[100, 100], [200, 200]]  # Only 2 points
        })


def test_point_in_zone_containment():
    zone = Zone(
        zone_id="CHECKOUT",
        name="Checkout Lane",
        type="CHECKOUT",
        points=[[200, 200], [500, 200], [500, 500], [200, 500]]
    )
    zm = ZoneManager(zones=[zone])

    # Inside point
    assert zm.is_point_inside([350, 350], zone) is True

    # Boundary point
    assert zm.is_point_inside([200, 200], zone) is True

    # Outside points
    assert zm.is_point_inside([100, 100], zone) is False
    assert zm.is_point_inside([550, 350], zone) is False
    assert zm.is_point_inside([350, 600], zone) is False


def test_zone_assignment():
    zone1 = Zone(
        zone_id="AISLE-A",
        name="Aisle A",
        type="AISLE",
        points=[[0, 0], [200, 0], [200, 200], [0, 200]]
    )
    zone2 = Zone(
        zone_id="AISLE-B",
        name="Aisle B",
        type="AISLE",
        points=[[300, 0], [500, 0], [500, 200], [300, 200]]
    )
    zm = ZoneManager(zones=[zone1, zone2])

    assert zm.assign_zone([100, 100]) == "AISLE-A"
    assert zm.assign_zone([400, 100]) == "AISLE-B"
    # Point in between
    assert zm.assign_zone([250, 100]) is None
