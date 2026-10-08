"""Integration test for Phase 2 Intelligence pipeline with Phase 1 telemetry."""

import os
import json
import pytest
from ml.intelligence.event_manager import EventManager
from ml.intelligence.models import EventType, EventStatus


def test_intelligence_pipeline_with_phase1_telemetry():
    telemetry_file = "outputs/vision_results.json"
    if not os.path.exists(telemetry_file):
        pytest.skip("Phase 1 vision telemetry not generated yet.")

    with open(telemetry_file, "r", encoding="utf-8") as f:
        records = json.load(f)

    em = EventManager(
        config={
            "crowd_density": {"persistence_frames": 2, "default_thresholds": {"low": 1}},
            "queue_congestion": {"persistence_frames": 2, "default_thresholds": {"low": 1}},
            "restricted_area": {"default_severity": "HIGH"}
        },
        zone_metadata={
            "ENTRANCE": {"name": "Store Entrance", "type": "ENTRANCE"},
            "AISLE-A": {"name": "Aisle A", "type": "AISLE"},
            "CHECKOUT-01": {"name": "Checkout Counter", "type": "CHECKOUT"},
            "RESTRICTED": {"name": "Backroom", "type": "RESTRICTED"}
        }
    )

    for rec in records:
        em.process_telemetry(rec)

    all_events = em.get_all_events()
    assert len(all_events) > 0

    for evt in all_events:
        d = evt.to_dict()
        assert d["event_id"].startswith("EVT-")
        assert d["event_type"] in [
            EventType.CROWD_DENSITY.value,
            EventType.QUEUE_CONGESTION.value,
            EventType.RESTRICTED_AREA_ENTRY.value,
            EventType.AISLE_OBSTRUCTION.value
        ]
        assert d["status"] in [EventStatus.ACTIVE.value, EventStatus.RESOLVED.value]
        assert d["severity"] in ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
