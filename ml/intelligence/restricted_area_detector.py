"""Restricted area intrusion and unauthorized entry detection engine."""

from typing import Dict, Any, List, Optional, Tuple, Set
from .models import EventType, EventSeverity
from .severity_engine import SeverityEngine


class RestrictedAreaDetector:
    """Detects unauthorized access and presence in restricted store zones."""

    def __init__(self, config: Optional[Dict[str, Any]] = None, severity_engine: Optional[SeverityEngine] = None):
        self.config = config or {}
        self.severity_engine = severity_engine or SeverityEngine()

        self.enabled = self.config.get("enabled", True)
        self.default_severity = self.config.get("default_severity", EventSeverity.HIGH.value)

        # State tracking: (zone_id, track_id) -> {"duration_frames": int, "severity": str}
        self.active_intrusions: Dict[Tuple[str, str], Dict[str, Any]] = {}

    def process_frame(
        self,
        tracks: List[Dict[str, Any]],
        zone_metadata: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> Tuple[List[Dict[str, Any]], List[Tuple[str, str]]]:
        """Process active tracks for restricted zone entries.
        
        Returns:
            candidates: List of candidate restricted area entry events.
            cleared_entries: List of (zone_id, track_id) pairs where intrusion ended.
        """
        if not self.enabled:
            return [], []

        candidates: List[Dict[str, Any]] = []
        cleared_entries: List[Tuple[str, str]] = []
        zone_meta = zone_metadata or {}

        current_restricted_tracks: Set[Tuple[str, str]] = set()

        for track in tracks:
            zone_id = track.get("zone_id")
            track_id = track.get("track_id")
            if not zone_id or not track_id:
                continue

            meta = zone_meta.get(zone_id, {})
            zone_type = meta.get("type", "")

            is_restricted = (zone_type == "RESTRICTED") or ("RESTRICTED" in zone_id.upper())
            if is_restricted:
                key = (zone_id, track_id)
                current_restricted_tracks.add(key)

                if key not in self.active_intrusions:
                    self.active_intrusions[key] = {
                        "duration_frames": 1,
                        "zone_name": meta.get("name", zone_id)
                    }
                else:
                    self.active_intrusions[key]["duration_frames"] += 1

                duration = self.active_intrusions[key]["duration_frames"]
                sev = self.severity_engine.calculate_restricted_severity(duration, self.default_severity)
                z_name = self.active_intrusions[key]["zone_name"]

                candidates.append({
                    "event_type": EventType.RESTRICTED_AREA_ENTRY.value,
                    "zone_id": zone_id,
                    "track_id": track_id,
                    "people_count": 1,
                    "severity": sev,
                    "duration_frames": duration,
                    "description": f"Unauthorized entry: Anonymous {track_id} detected in {z_name}"
                })

        # Check for tracks that have exited the restricted area
        for key in list(self.active_intrusions.keys()):
            if key not in current_restricted_tracks:
                del self.active_intrusions[key]
                cleared_entries.append(key)

        return candidates, cleared_entries

    def reset(self) -> None:
        """Reset internal intrusion state."""
        self.active_intrusions.clear()
