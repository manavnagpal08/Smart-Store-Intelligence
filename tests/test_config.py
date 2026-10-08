"""Unit tests for Vision and Zone configuration parsing and validation."""

import os
import tempfile
import json
import pytest

from ml.zones.zone_config import Zone, load_zones_from_file
from ml.pipeline.vision_pipeline import VisionPipeline


def test_valid_zone_config_load():
    config_content = {
        "zones": [
            {
                "zone_id": "ENTRANCE",
                "name": "Store Entrance",
                "type": "ENTRANCE",
                "points": [[0, 0], [100, 0], [100, 100], [0, 100]]
            },
            {
                "zone_id": "AISLE-A",
                "name": "Aisle A",
                "type": "AISLE",
                "points": [[200, 0], [300, 0], [300, 100], [200, 100]]
            }
        ]
    }
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".json") as f:
        json.dump(config_content, f)
        temp_path = f.name

    try:
        zones = load_zones_from_file(temp_path)
        assert len(zones) == 2
        assert zones[0].zone_id == "ENTRANCE"
        assert zones[1].zone_id == "AISLE-A"
    finally:
        os.remove(temp_path)


def test_missing_config_file():
    with pytest.raises(FileNotFoundError):
        load_zones_from_file("non_existent_file_path_12345.json")


def test_invalid_json_config():
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".json") as f:
        f.write("{invalid_json: true,")
        temp_path = f.name

    try:
        with pytest.raises(ValueError, match="Invalid JSON"):
            load_zones_from_file(temp_path)
    finally:
        os.remove(temp_path)


def test_duplicate_zone_id():
    config_content = {
        "zones": [
            {"zone_id": "AISLE-A", "points": [[0, 0], [1, 0], [1, 1], [0, 1]]},
            {"zone_id": "AISLE-A", "points": [[2, 2], [3, 2], [3, 3], [2, 3]]}
        ]
    }
    with tempfile.NamedTemporaryFile("w", delete=False, suffix=".json") as f:
        json.dump(config_content, f)
        temp_path = f.name

    try:
        with pytest.raises(ValueError, match="Duplicate zone_id"):
            load_zones_from_file(temp_path)
    finally:
        os.remove(temp_path)
