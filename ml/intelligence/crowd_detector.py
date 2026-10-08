"""Crowd density detection engine."""

from typing import Dict, Any, List, Optional, Tuple
from .models import EventType
from .severity_engine import SeverityEngine


class CrowdDetector:
    """Detects persistent crowd density conditions in store aisles and common zones."""

    def __init__(self, config: Optional[Dict[str, Any]] = None, severity_engine: Optional[SeverityEngine] = None):
        self.config = config or {}
        self.severity_engine = severity_engine or SeverityEngine()
        
        self.enabled = self.config.get("enabled", True)
        self.persistence_frames = self.config.get("persistence_frames", 5)
        self.thresholds_by_zone = self.config.get("thresholds", {})
        self.default_thresholds = self.config.get("default_thresholds", {
            "low": 5,
            "medium": 8,
            "high": 12,
            "critical": 18
        })

        # State tracking: zone_id -> {"frames_active": int, "last_count": int, "severity": str}
        self.active_conditions: Dict[str, Dict[str, Any]] = {}

    def get_zone_thresholds(self, zone_id: str, zone_type: Optional[str] = None) -> Dict[str, int]:
        """Fetch configured thresholds for a specific zone_id or zone_type."""
        if zone_id in self.thresholds_by_zone:
            return self.thresholds_by_zone[zone_id]
        if zone_type and zone_type in self.thresholds_by_zone:
            return self.thresholds_by_zone[zone_type]
        return self.default_thresholds

    def process_frame(
        self,
        zone_counts: Dict[str, int],
        zone_metadata: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Process zone counts for the current frame.
        
        Returns:
            candidates: List of candidate crowd events meeting persistence requirements.
            cleared_zones: List of zone_ids where crowd conditions have resolved.
        """
        if not self.enabled:
            return [], []

        candidates: List[Dict[str, Any]] = []
        cleared_zones: List[str] = []
        zone_meta = zone_metadata or {}

        for zone_id, count in zone_counts.items():
            meta = zone_meta.get(zone_id, {})
            zone_type = meta.get("type", "AISLE")

            # Exclude checkout and restricted zones from crowd detector (handled by their dedicated detectors)
            if zone_type in ("CHECKOUT", "RESTRICTED"):
                continue

            thresholds = self.get_zone_thresholds(zone_id, zone_type)
            severity = self.severity_engine.calculate_crowd_severity(count, thresholds)

            if severity is not None:
                # Crowd threshold exceeded
                if zone_id not in self.active_conditions:
                    self.active_conditions[zone_id] = {
                        "frames_active": 1,
                        "last_count": count,
                        "severity": severity,
                        "zone_name": meta.get("name", zone_id)
                    }
                else:
                    self.active_conditions[zone_id]["frames_active"] += 1
                    self.active_conditions[zone_id]["last_count"] = count
                    self.active_conditions[zone_id]["severity"] = severity

                # Check persistence
                if self.active_conditions[zone_id]["frames_active"] >= self.persistence_frames:
                    z_name = self.active_conditions[zone_id]["zone_name"]
                    candidates.append({
                        "event_type": EventType.CROWD_DENSITY.value,
                        "zone_id": zone_id,
                        "people_count": count,
                        "severity": severity,
                        "duration_frames": self.active_conditions[zone_id]["frames_active"],
                        "description": f"High crowd density ({count} people, {severity} severity) detected in {z_name}"
                    })
            else:
                # Count is below threshold
                if zone_id in self.active_conditions:
                    # Condition cleared
                    del self.active_conditions[zone_id]
                    cleared_zones.append(zone_id)

        return candidates, cleared_zones

    def reset(self) -> None:
        """Reset internal frame state."""
        self.active_conditions.clear()
