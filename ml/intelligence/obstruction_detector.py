"""Aisle obstruction detection engine (Prototype rule-based inference)."""

from typing import Dict, Any, List, Optional, Tuple
import numpy as np
from .models import EventType, EventSeverity
from .severity_engine import SeverityEngine


class ObstructionDetector:
    """Infers possible aisle obstruction using persistent stationary occupancy heuristics.
    
    NOTE (Phase 2 Prototype Limitation):
    This detector operates on person movement and zone dwell dynamics. It detects situations
    where persistent congestion or stationary groups block passageways. It does NOT detect
    static physical objects (such as unattended boxes or pallets) without an object-level detector.
    """

    def __init__(self, config: Optional[Dict[str, Any]] = None, severity_engine: Optional[SeverityEngine] = None):
        self.config = config or {}
        self.severity_engine = severity_engine or SeverityEngine()

        self.enabled = self.config.get("enabled", True)
        self.persistence_frames = self.config.get("persistence_frames", 15)
        self.min_stationary_count = self.config.get("min_stationary_count", 2)
        self.max_movement_px = self.config.get("max_movement_px", 20.0)

        # Track history: track_id -> [centers]
        self.track_positions: Dict[str, List[List[int]]] = {}
        # Zone stationary state: zone_id -> {"frames_active": int, "count": int}
        self.active_obstructions: Dict[str, Dict[str, Any]] = {}

    def process_frame(
        self,
        tracks: List[Dict[str, Any]],
        zone_metadata: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> Tuple[List[Dict[str, Any]], List[str]]:
        """Process tracks and zone positions for obstruction heuristics.
        
        Returns:
            candidates: List of candidate aisle obstruction events.
            cleared_zones: List of zone_ids where obstruction condition cleared.
        """
        if not self.enabled:
            return [], []

        candidates: List[Dict[str, Any]] = []
        cleared_zones: List[str] = []
        zone_meta = zone_metadata or {}

        # 1. Update position history for active tracks
        current_track_ids = set()
        zone_stationary_counts: Dict[str, int] = {}

        for track in tracks:
            tid = track.get("track_id")
            center = track.get("center")
            zone_id = track.get("zone_id")
            if not tid or not center or not zone_id:
                continue

            current_track_ids.add(tid)
            if tid not in self.track_positions:
                self.track_positions[tid] = [center]
            else:
                self.track_positions[tid].append(center)
                if len(self.track_positions[tid]) > 30:
                    self.track_positions[tid].pop(0)

            # Check if this zone is an aisle
            meta = zone_meta.get(zone_id, {})
            zone_type = meta.get("type", "")
            if zone_type == "AISLE" or "AISLE" in zone_id.upper():
                # Compute displacement over recent history
                history = self.track_positions[tid]
                if len(history) >= 5:
                    recent = np.array(history[-5:])
                    displacement = np.linalg.norm(recent[-1] - recent[0])
                    if displacement <= self.max_movement_px:
                        zone_stationary_counts[zone_id] = zone_stationary_counts.get(zone_id, 0) + 1

        # Purge stale tracks from history
        for tid in list(self.track_positions.keys()):
            if tid not in current_track_ids:
                del self.track_positions[tid]

        # 2. Evaluate obstruction conditions per aisle zone
        for zone_id, stat_count in zone_stationary_counts.items():
            if stat_count >= self.min_stationary_count:
                meta = zone_meta.get(zone_id, {})
                z_name = meta.get("name", zone_id)

                if zone_id not in self.active_obstructions:
                    self.active_obstructions[zone_id] = {
                        "frames_active": 1,
                        "count": stat_count,
                        "zone_name": z_name
                    }
                else:
                    self.active_obstructions[zone_id]["frames_active"] += 1
                    self.active_obstructions[zone_id]["count"] = stat_count

                duration = self.active_obstructions[zone_id]["frames_active"]
                if duration >= self.persistence_frames:
                    sev = self.severity_engine.calculate_obstruction_severity(duration, stat_count)
                    candidates.append({
                        "event_type": EventType.AISLE_OBSTRUCTION.value,
                        "zone_id": zone_id,
                        "people_count": stat_count,
                        "severity": sev,
                        "duration_frames": duration,
                        "description": f"Possible aisle obstruction inferred in {z_name} ({stat_count} stationary persons for {duration} frames)"
                    })
            else:
                if zone_id in self.active_obstructions:
                    del self.active_obstructions[zone_id]
                    cleared_zones.append(zone_id)

        # Also clear any zones where stationary count dropped to 0
        for z_id in list(self.active_obstructions.keys()):
            if z_id not in zone_stationary_counts:
                del self.active_obstructions[z_id]
                cleared_zones.append(z_id)

        return candidates, cleared_zones

    def reset(self) -> None:
        """Reset internal obstruction state."""
        self.track_positions.clear()
        self.active_obstructions.clear()
