"""Checkout queue congestion monitoring engine."""

from typing import Dict, Any, List, Optional, Tuple
from .models import EventType
from .severity_engine import SeverityEngine


class QueueDetector:
    """Monitors checkout lanes for queue congestion and delays."""

    def __init__(self, config: Optional[Dict[str, Any]] = None, severity_engine: Optional[SeverityEngine] = None):
        self.config = config or {}
        self.severity_engine = severity_engine or SeverityEngine()

        self.enabled = self.config.get("enabled", True)
        self.persistence_frames = self.config.get("persistence_frames", 5)
        self.thresholds_by_zone = self.config.get("thresholds", {})
        self.default_thresholds = self.config.get("default_thresholds", {
            "low": 3,
            "medium": 5,
            "high": 8,
            "critical": 12
        })

        # State tracking: zone_id -> {"frames_active": int, "last_count": int, "severity": str}
        self.active_conditions: Dict[str, Dict[str, Any]] = {}

    def get_zone_thresholds(self, zone_id: str) -> Dict[str, int]:
        """Fetch configured thresholds for a checkout zone."""
        return self.thresholds_by_zone.get(zone_id, self.default_thresholds)

    def process_frame(
        self,
        zone_counts: Dict[str, int],
        zone_metadata: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Process checkout zone counts for queue congestion.
        
        Returns:
            candidates: List of candidate queue congestion events.
            cleared_zones: List of checkout zone_ids where congestion cleared.
        """
        if not self.enabled:
            return [], []

        candidates: List[Dict[str, Any]] = []
        cleared_zones: List[str] = []
        zone_meta = zone_metadata or {}

        for zone_id, count in zone_counts.items():
            meta = zone_meta.get(zone_id, {})
            zone_type = meta.get("type", "")

            # Check if this zone is a checkout zone
            is_checkout = (zone_type == "CHECKOUT") or ("CHECKOUT" in zone_id.upper()) or (zone_id in self.thresholds_by_zone)
            if not is_checkout:
                continue

            thresholds = self.get_zone_thresholds(zone_id)
            severity = self.severity_engine.calculate_queue_severity(count, thresholds)

            if severity is not None:
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

                if self.active_conditions[zone_id]["frames_active"] >= self.persistence_frames:
                    z_name = self.active_conditions[zone_id]["zone_name"]
                    candidates.append({
                        "event_type": EventType.QUEUE_CONGESTION.value,
                        "zone_id": zone_id,
                        "people_count": count,
                        "severity": severity,
                        "duration_frames": self.active_conditions[zone_id]["frames_active"],
                        "description": f"Queue congestion ({count} customers waiting, {severity} severity) at {z_name}"
                    })
            else:
                if zone_id in self.active_conditions:
                    del self.active_conditions[zone_id]
                    cleared_zones.append(zone_id)

        return candidates, cleared_zones

    def reset(self) -> None:
        """Reset internal frame state."""
        self.active_conditions.clear()
