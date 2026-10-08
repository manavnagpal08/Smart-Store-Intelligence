"""Event Manager for incident lifecycle, deduplication, cooldown, and persistence."""

from typing import Dict, Any, List, Optional, Tuple, Set
import os
import json
import logging
from datetime import datetime

from .models import StoreEvent, EventType, EventStatus, EventSeverity
from .severity_engine import SeverityEngine
from .crowd_detector import CrowdDetector
from .queue_detector import QueueDetector
from .restricted_area_detector import RestrictedAreaDetector
from .obstruction_detector import ObstructionDetector

logger = logging.getLogger(__name__)


class EventManager:
    """Central manager handling event detection, deduplication, lifecycle transitions, and persistence."""

    def __init__(
        self,
        config: Optional[Dict[str, Any]] = None,
        zone_metadata: Optional[Dict[str, Dict[str, Any]]] = None,
        output_path: str = "outputs/events.json"
    ):
        self.config = config or {}
        self.output_path = output_path
        self.zone_metadata = zone_metadata or {}

        # Severity engine
        self.severity_engine = SeverityEngine(self.config.get("severity", {}))

        # Specialized detectors
        self.crowd_detector = CrowdDetector(
            self.config.get("crowd_density", {}), self.severity_engine
        )
        self.queue_detector = QueueDetector(
            self.config.get("queue_congestion", {}), self.severity_engine
        )
        self.restricted_detector = RestrictedAreaDetector(
            self.config.get("restricted_area", {}), self.severity_engine
        )
        self.obstruction_detector = ObstructionDetector(
            self.config.get("aisle_obstruction", {}), self.severity_engine
        )

        # Global cooldown configuration (in frames)
        self.cooldown_frames = self.config.get("cooldown_frames", 15)

        # Event ID sequence generator: EVT-YYYYMMDD-XXXX
        self._counter = 0
        self._date_str = datetime.now().strftime("%Y%m%d")

        # Active events map: event_key -> StoreEvent
        self.active_events: Dict[str, StoreEvent] = {}

        # Cooldown map: event_key -> frame_number_when_cleared
        self.cooldown_tracker: Dict[str, int] = {}

        # Complete history of all events
        self.all_events: List[StoreEvent] = []

    def _generate_event_id(self, timestamp_str: Optional[str] = None) -> str:
        """Generate unique structured event ID (e.g. EVT-20260925-0001)."""
        self._counter += 1
        date_part = self._date_str
        if timestamp_str:
            try:
                dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
                date_part = dt.strftime("%Y%m%d")
            except Exception:
                pass
        return f"EVT-{date_part}-{self._counter:04d}"

    @staticmethod
    def build_event_key(
        event_type: str,
        camera_id: str,
        zone_id: str,
        track_id: Optional[str] = None
    ) -> str:
        """Create a composite unique key for event deduplication."""
        if track_id:
            return f"{event_type}:{camera_id}:{zone_id}:{track_id}"
        return f"{event_type}:{camera_id}:{zone_id}"

    def update_zone_metadata(self, zones: List[Any]) -> None:
        """Update zone metadata dictionary from Zone objects or dicts."""
        self.zone_metadata = {}
        for z in zones:
            if hasattr(z, "zone_id"):
                self.zone_metadata[z.zone_id] = {
                    "name": z.name,
                    "type": z.type,
                    "color": getattr(z, "color", None)
                }
            elif isinstance(z, dict):
                zid = z.get("zone_id", "")
                self.zone_metadata[zid] = {
                    "name": z.get("name", zid),
                    "type": z.get("type", "AISLE"),
                    "color": z.get("color")
                }

    def process_telemetry(self, telemetry: Dict[str, Any]) -> List[StoreEvent]:
        """Ingest single frame telemetry from Phase 1 vision pipeline and process events.
        
        Args:
            telemetry: Dict with keys: timestamp, camera_id, frame_number, tracks, zone_counts
            
        Returns:
            List of currently active StoreEvent objects.
        """
        timestamp = telemetry.get("timestamp", datetime.now().isoformat())
        camera_id = telemetry.get("camera_id", "CAM-01")
        frame_number = telemetry.get("frame_number", 0)
        tracks = telemetry.get("tracks", [])
        zone_counts = telemetry.get("zone_counts", {})

        # 1. Run detectors
        crowd_candidates, crowd_cleared = self.crowd_detector.process_frame(
            zone_counts, self.zone_metadata
        )
        queue_candidates, queue_cleared = self.queue_detector.process_frame(
            zone_counts, self.zone_metadata
        )
        restr_candidates, restr_cleared = self.restricted_detector.process_frame(
            tracks, self.zone_metadata
        )
        obstr_candidates, obstr_cleared = self.obstruction_detector.process_frame(
            tracks, self.zone_metadata
        )

        all_candidates = crowd_candidates + queue_candidates + restr_candidates + obstr_candidates

        # 2. Process Candidates (Create or Update)
        seen_keys_in_frame: Set[str] = set()

        for cand in all_candidates:
            evt_type = cand["event_type"]
            zone_id = cand["zone_id"]
            track_id = cand.get("track_id")
            key = self.build_event_key(evt_type, camera_id, zone_id, track_id)
            seen_keys_in_frame.add(key)

            # Check if event is currently active
            if key in self.active_events:
                # Update existing active event
                existing_evt = self.active_events[key]
                existing_evt.people_count = cand.get("people_count", existing_evt.people_count)
                existing_evt.severity = cand.get("severity", existing_evt.severity)
                existing_evt.description = cand.get("description", existing_evt.description)
                existing_evt.details["last_frame"] = frame_number
                existing_evt.details["duration_frames"] = cand.get("duration_frames", 1)
            else:
                # Check cooldown to prevent flapping
                last_cleared_frame = self.cooldown_tracker.get(key, -9999)
                if frame_number - last_cleared_frame < self.cooldown_frames:
                    continue  # In cooldown window, suppress new alert creation

                # Create new event
                evt_id = self._generate_event_id(timestamp)
                new_evt = StoreEvent(
                    event_id=evt_id,
                    event_type=evt_type,
                    camera_id=camera_id,
                    zone_id=zone_id,
                    timestamp=timestamp,
                    severity=cand["severity"],
                    status=EventStatus.ACTIVE.value,
                    description=cand.get("description", ""),
                    people_count=cand.get("people_count"),
                    track_id=track_id,
                    details={
                        "start_frame": frame_number,
                        "last_frame": frame_number,
                        "duration_frames": cand.get("duration_frames", 1)
                    }
                )
                self.active_events[key] = new_evt
                self.all_events.append(new_evt)
                logger.info(f"Created Event {evt_id}: {evt_type} at {zone_id} (Severity: {new_evt.severity})")

        # 3. Process Cleared Conditions (Lifecycle Transition: ACTIVE -> RESOLVED)
        # Handle explicitly cleared zone/track events
        cleared_keys: List[str] = []

        for z_id in crowd_cleared:
            cleared_keys.append(self.build_event_key(EventType.CROWD_DENSITY.value, camera_id, z_id))
        for z_id in queue_cleared:
            cleared_keys.append(self.build_event_key(EventType.QUEUE_CONGESTION.value, camera_id, z_id))
        for z_id, t_id in restr_cleared:
            cleared_keys.append(self.build_event_key(EventType.RESTRICTED_AREA_ENTRY.value, camera_id, z_id, t_id))
        for z_id in obstr_cleared:
            cleared_keys.append(self.build_event_key(EventType.AISLE_OBSTRUCTION.value, camera_id, z_id))

        for key in cleared_keys:
            if key in self.active_events:
                evt = self.active_events.pop(key)
                evt.status = EventStatus.RESOLVED.value
                evt.resolved_at = timestamp
                self.cooldown_tracker[key] = frame_number
                logger.info(f"Resolved Event {evt.event_id}: {evt.event_type} at {evt.zone_id}")

        return list(self.active_events.values())

    def get_active_events(self) -> List[StoreEvent]:
        """Return all currently active events."""
        return list(self.active_events.values())

    def get_all_events(self) -> List[StoreEvent]:
        """Return all events (active, acknowledged, and resolved)."""
        return self.all_events

    def save_events(self, filepath: Optional[str] = None) -> str:
        """Export all recorded events to a structured JSON file."""
        target_path = filepath or self.output_path
        if not target_path:
            raise ValueError("No output path specified for events JSON export.")

        os.makedirs(os.path.dirname(os.path.abspath(target_path)), exist_ok=True)
        events_data = [evt.to_dict() for evt in self.all_events]

        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(events_data, f, indent=2)

        logger.info(f"Saved {len(events_data)} events to '{target_path}'")
        return target_path

    def reset(self) -> None:
        """Reset all internal detector and lifecycle states."""
        self.crowd_detector.reset()
        self.queue_detector.reset()
        self.restricted_detector.reset()
        self.obstruction_detector.reset()
        self.active_events.clear()
        self.cooldown_tracker.clear()
        self.all_events.clear()
        self._counter = 0
