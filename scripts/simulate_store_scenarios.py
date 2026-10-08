import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import json
from datetime import datetime, timedelta
from ml.intelligence.event_manager import EventManager
from ml.intelligence.models import EventType, EventStatus


def run_simulation(output_events_path: str = "outputs/events.json"):
    em = EventManager(
        config={
            "cooldown_frames": 10,
            "crowd_density": {
                "persistence_frames": 3,
                "default_thresholds": {"low": 4, "medium": 7, "high": 10, "critical": 15}
            },
            "queue_congestion": {
                "persistence_frames": 3,
                "default_thresholds": {"low": 3, "medium": 5, "high": 8, "critical": 12}
            },
            "restricted_area": {
                "default_severity": "HIGH"
            },
            "aisle_obstruction": {
                "persistence_frames": 5,
                "min_stationary_count": 2,
                "max_movement_px": 15.0
            }
        },
        zone_metadata={
            "ENTRANCE": {"name": "Store Entrance", "type": "ENTRANCE"},
            "AISLE-A": {"name": "Aisle A (Groceries)", "type": "AISLE"},
            "AISLE-B": {"name": "Aisle B (Beverages)", "type": "AISLE"},
            "CHECKOUT-01": {"name": "Checkout Lane 1", "type": "CHECKOUT"},
            "RESTRICTED": {"name": "Backroom Storage", "type": "RESTRICTED"}
        },
        output_path=output_events_path
    )

    base_time = datetime(2026, 9, 25, 10, 15, 0)
    print("Running Multi-Incident Operational Scenario Simulation...")

    # Scenario 1: Normal Traffic (Frames 1-5)
    for f in range(1, 6):
        t_str = (base_time + timedelta(seconds=f)).isoformat()
        em.process_telemetry({
            "timestamp": t_str,
            "camera_id": "CAM-01",
            "frame_number": f,
            "tracks": [
                {"track_id": "TRACK-001", "center": [100, 100], "zone_id": "ENTRANCE"},
                {"track_id": "TRACK-002", "center": [250, 250], "zone_id": "AISLE-A"}
            ],
            "zone_counts": {"ENTRANCE": 1, "AISLE-A": 1, "AISLE-B": 0, "CHECKOUT-01": 0, "RESTRICTED": 0}
        })

    # Scenario 2: Crowd Surge in Aisle A (Frames 6-15) -> 11 people (High Severity)
    for f in range(6, 16):
        t_str = (base_time + timedelta(seconds=f)).isoformat()
        em.process_telemetry({
            "timestamp": t_str,
            "camera_id": "CAM-01",
            "frame_number": f,
            "tracks": [{"track_id": f"TRACK-{i:03d}", "center": [250, 250], "zone_id": "AISLE-A"} for i in range(1, 12)],
            "zone_counts": {"ENTRANCE": 1, "AISLE-A": 11, "AISLE-B": 0, "CHECKOUT-01": 0, "RESTRICTED": 0}
        })

    # Scenario 3: Restricted Area Intrusion by TRACK-099 (Frames 12-20)
    for f in range(12, 21):
        t_str = (base_time + timedelta(seconds=f)).isoformat()
        em.process_telemetry({
            "timestamp": t_str,
            "camera_id": "CAM-01",
            "frame_number": f,
            "tracks": [
                {"track_id": "TRACK-099", "center": [500, 100], "zone_id": "RESTRICTED"},
                {"track_id": "TRACK-001", "center": [250, 250], "zone_id": "AISLE-A"}
            ],
            "zone_counts": {"ENTRANCE": 0, "AISLE-A": 1, "AISLE-B": 0, "CHECKOUT-01": 0, "RESTRICTED": 1}
        })

    # Scenario 4: Queue Congestion at Checkout 01 (Frames 22-30) -> 6 people (Medium Severity)
    for f in range(22, 31):
        t_str = (base_time + timedelta(seconds=f)).isoformat()
        em.process_telemetry({
            "timestamp": t_str,
            "camera_id": "CAM-01",
            "frame_number": f,
            "tracks": [{"track_id": f"TRACK-{i:03d}", "center": [650, 500], "zone_id": "CHECKOUT-01"} for i in range(1, 7)],
            "zone_counts": {"ENTRANCE": 0, "AISLE-A": 1, "AISLE-B": 0, "CHECKOUT-01": 6, "RESTRICTED": 0}
        })

    # Scenario 5: Stationary Group Obstruction in Aisle B (Frames 32-45)
    for f in range(32, 46):
        t_str = (base_time + timedelta(seconds=f)).isoformat()
        em.process_telemetry({
            "timestamp": t_str,
            "camera_id": "CAM-01",
            "frame_number": f,
            "tracks": [
                {"track_id": "TRACK-020", "center": [850, 300], "zone_id": "AISLE-B"},
                {"track_id": "TRACK-021", "center": [855, 305], "zone_id": "AISLE-B"}
            ],
            "zone_counts": {"ENTRANCE": 0, "AISLE-A": 0, "AISLE-B": 2, "CHECKOUT-01": 0, "RESTRICTED": 0}
        })

    # Scenario 6: Resolution of all conditions (Frames 46-50)
    for f in range(46, 51):
        t_str = (base_time + timedelta(seconds=f)).isoformat()
        em.process_telemetry({
            "timestamp": t_str,
            "camera_id": "CAM-01",
            "frame_number": f,
            "tracks": [],
            "zone_counts": {"ENTRANCE": 0, "AISLE-A": 0, "AISLE-B": 0, "CHECKOUT-01": 0, "RESTRICTED": 0}
        })

    saved = em.save_events()
    print(f"Simulation completed. Generated {len(em.all_events)} structured events in '{saved}'")
    for evt in em.all_events:
        print(f"  - [{evt.severity}] {evt.event_id}: {evt.event_type} @ {evt.zone_id} | Status: {evt.status}")


if __name__ == "__main__":
    run_simulation()
