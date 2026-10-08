"""Unit tests for EventManager lifecycle and deduplication."""

import os
import tempfile
import json
from ml.intelligence.event_manager import EventManager
from ml.intelligence.models import EventType, EventStatus, EventSeverity


def test_event_manager_deduplication():
    cfg = {
        "crowd_density": {
            "persistence_frames": 2,
            "default_thresholds": {"low": 5, "medium": 8, "high": 12, "critical": 18}
        }
    }
    em = EventManager(
        config=cfg,
        zone_metadata={"AISLE-A": {"name": "Aisle A", "type": "AISLE"}}
    )

    # Telemetry with persistent crowd in Aisle A
    for f in range(1, 10):
        telemetry = {
            "timestamp": f"2026-09-25T10:00:{f:02d}",
            "camera_id": "CAM-01",
            "frame_number": f,
            "tracks": [],
            "zone_counts": {"AISLE-A": 10}
        }
        em.process_telemetry(telemetry)

    # Frame 1: count=10 (frames_active=1)
    # Frame 2: count=10 (frames_active=2 >= persistence) -> Event created!
    # Frame 3-9: count=10 -> Event updated, NOT duplicated!
    active_events = em.get_active_events()
    all_events = em.get_all_events()

    assert len(active_events) == 1
    assert len(all_events) == 1
    assert active_events[0].event_id.startswith("EVT-")
    assert active_events[0].event_type == EventType.CROWD_DENSITY.value
    assert active_events[0].status == EventStatus.ACTIVE.value
    assert active_events[0].people_count == 10


def test_event_manager_lifecycle_resolution_and_cooldown():
    cfg = {
        "cooldown_frames": 10,
        "crowd_density": {
            "persistence_frames": 2,
            "default_thresholds": {"low": 5, "medium": 8, "high": 12, "critical": 18}
        }
    }
    em = EventManager(
        config=cfg,
        zone_metadata={"AISLE-A": {"name": "Aisle A", "type": "AISLE"}}
    )

    # 1. Trigger crowd event (frames 1-3)
    for f in range(1, 4):
        em.process_telemetry({
            "timestamp": f"2026-09-25T10:00:{f:02d}",
            "camera_id": "CAM-01",
            "frame_number": f,
            "tracks": [],
            "zone_counts": {"AISLE-A": 12}
        })

    assert len(em.get_active_events()) == 1
    evt_id = em.get_active_events()[0].event_id

    # 2. Crowd dissipates (frame 4) -> Event resolves
    em.process_telemetry({
        "timestamp": "2026-09-25T10:00:04",
        "camera_id": "CAM-01",
        "frame_number": 4,
        "tracks": [],
        "zone_counts": {"AISLE-A": 2}
    })

    assert len(em.get_active_events()) == 0
    all_evts = em.get_all_events()
    assert len(all_evts) == 1
    assert all_evts[0].event_id == evt_id
    assert all_evts[0].status == EventStatus.RESOLVED.value
    assert all_evts[0].resolved_at is not None

    # 3. Flapping right inside cooldown window (frame 6, cooldown is 10 frames)
    # Even though count rises, cooldown suppresses flapping event creation
    for f in range(5, 7):
        em.process_telemetry({
            "timestamp": f"2026-09-25T10:00:{f:02d}",
            "camera_id": "CAM-01",
            "frame_number": f,
            "tracks": [],
            "zone_counts": {"AISLE-A": 12}
        })
    assert len(em.get_active_events()) == 0

    # 4. After cooldown passes (frame 20 > 4 + 10) -> New event can be created
    for f in range(19, 22):
        em.process_telemetry({
            "timestamp": f"2026-09-25T10:00:{f:02d}",
            "camera_id": "CAM-01",
            "frame_number": f,
            "tracks": [],
            "zone_counts": {"AISLE-A": 12}
        })
    assert len(em.get_active_events()) == 1
    assert em.get_active_events()[0].event_id != evt_id


def test_event_manager_save_and_load():
    with tempfile.TemporaryDirectory() as tmpdir:
        out_file = os.path.join(tmpdir, "test_events.json")
        em = EventManager(
            config={"crowd_density": {"persistence_frames": 1, "default_thresholds": {"low": 2}}},
            zone_metadata={"AISLE-A": {"name": "Aisle A", "type": "AISLE"}},
            output_path=out_file
        )

        em.process_telemetry({
            "timestamp": "2026-09-25T10:00:00",
            "camera_id": "CAM-01",
            "frame_number": 1,
            "tracks": [],
            "zone_counts": {"AISLE-A": 4}
        })

        saved_path = em.save_events()
        assert os.path.exists(saved_path)

        with open(saved_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            assert len(data) == 1
            assert data[0]["event_type"] == EventType.CROWD_DENSITY.value
            assert data[0]["people_count"] == 4
