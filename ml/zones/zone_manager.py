"""Zone Manager for zone containment, counting, and visual rendering."""

from typing import List, Dict, Any, Optional, Tuple, Union
import numpy as np
import cv2

from .zone_config import Zone, load_zones_from_file


class ZoneManager:
    """Manages zone definitions, point-in-zone assignment, and visual overlay."""

    def __init__(self, zones: Optional[List[Zone]] = None, config_path: Optional[str] = None):
        self.zones: List[Zone] = []
        self._zone_polygons_np: Dict[str, np.ndarray] = {}

        if config_path:
            self.load_from_file(config_path)
        elif zones:
            self.set_zones(zones)

    def load_from_file(self, config_path: str) -> None:
        """Load and initialize zones from a configuration file."""
        loaded_zones = load_zones_from_file(config_path)
        self.set_zones(loaded_zones)

    def set_zones(self, zones: List[Zone]) -> None:
        """Set active zones and precompute numpy polygon arrays."""
        self.zones = zones
        self._zone_polygons_np = {
            zone.zone_id: np.array(zone.points, dtype=np.int32).reshape((-1, 1, 2))
            for zone in self.zones
        }

    def get_zone_ids(self) -> List[str]:
        """Return list of all configured zone IDs."""
        return [zone.zone_id for zone in self.zones]

    def is_point_inside(self, point: Union[Tuple[float, float], List[float]], zone: Zone) -> bool:
        """Check if a 2D point (x, y) lies inside or on the boundary of a zone polygon."""
        if not zone.points or len(zone.points) < 3:
            return False

        poly_np = self._zone_polygons_np.get(zone.zone_id)
        if poly_np is None:
            poly_np = np.array(zone.points, dtype=np.int32).reshape((-1, 1, 2))

        pt = (float(point[0]), float(point[1]))
        res = cv2.pointPolygonTest(poly_np, pt, measureDist=False)
        return res >= 0

    def assign_zone(self, point: Union[Tuple[float, float], List[float]]) -> Optional[str]:
        """Find the zone_id containing the point. Returns None if unassigned."""
        for zone in self.zones:
            if self.is_point_inside(point, zone):
                return zone.zone_id
        return None

    def assign_tracks(self, tracks: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Assign zone_id to each track based on its center point [cx, cy]."""
        for track in tracks:
            center = track.get("center")
            if center is not None and len(center) == 2:
                track["zone_id"] = self.assign_zone(center)
            else:
                track["zone_id"] = None
        return tracks

    def count_by_zone(self, tracks: List[Dict[str, Any]]) -> Dict[str, int]:
        """Count unique active track IDs in each zone.
        
        Guarantees all configured zone_ids are present in the returned dictionary.
        """
        counts: Dict[str, int] = {zone.zone_id: 0 for zone in self.zones}
        seen_tracks_by_zone: Dict[str, set] = {zone.zone_id: set() for zone in self.zones}

        for track in tracks:
            zone_id = track.get("zone_id")
            track_id = track.get("track_id")
            if zone_id and zone_id in counts:
                # Count unique tracks per zone
                if track_id is not None:
                    seen_tracks_by_zone[zone_id].add(track_id)
                else:
                    counts[zone_id] += 1

        for zone_id, seen_set in seen_tracks_by_zone.items():
            if seen_set:
                counts[zone_id] = len(seen_set)

        return counts

    def draw_zones(
        self,
        frame: np.ndarray,
        zone_counts: Optional[Dict[str, int]] = None,
        alpha: float = 0.25,
        thickness: int = 2,
    ) -> np.ndarray:
        """Draw semi-transparent zone polygons, borders, and count badges on the frame."""
        if not self.zones or frame is None or frame.size == 0:
            return frame

        overlay = frame.copy()
        h, w = frame.shape[:2]

        for zone in self.zones:
            poly_np = self._zone_polygons_np.get(zone.zone_id)
            if poly_np is None:
                continue

            color = zone.color  # BGR tuple

            # 1. Fill polygon on overlay
            cv2.fillPoly(overlay, [poly_np], color)

        # Blend filled overlay with original frame
        cv2.addWeighted(overlay, alpha, frame, 1.0 - alpha, 0, frame)

        # 2. Draw crisp borders and text badges on top of blended frame
        for zone in self.zones:
            poly_np = self._zone_polygons_np.get(zone.zone_id)
            if poly_np is None:
                continue

            color = zone.color
            # Border
            cv2.polylines(frame, [poly_np], isClosed=True, color=color, thickness=thickness, lineType=cv2.LINE_AA)

            # Calculate label anchor (centroid or top-left bounding box of polygon)
            pts = np.array(zone.points, dtype=np.int32)
            min_x, min_y = np.min(pts[:, 0]), np.min(pts[:, 1])
            max_x, max_y = np.max(pts[:, 0]), np.max(pts[:, 1])
            cx, cy = int((min_x + max_x) / 2), int((min_y + max_y) / 2)

            count = zone_counts.get(zone.zone_id, 0) if zone_counts else 0
            label = f"{zone.name}: {count}"

            # Text rendering
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.55
            font_thick = 1
            (text_w, text_h), baseline = cv2.getTextSize(label, font, font_scale, font_thick)

            # Badge location: inside zone near top/center
            badge_x1 = max(0, min_x + 6)
            badge_y1 = max(0, min_y + 6)
            badge_x2 = min(w - 1, badge_x1 + text_w + 10)
            badge_y2 = min(h - 1, badge_y1 + text_h + 10)

            # Draw badge background pill
            cv2.rectangle(frame, (badge_x1, badge_y1), (badge_x2, badge_y2), (25, 25, 25), -1)
            cv2.rectangle(frame, (badge_x1, badge_y1), (badge_x2, badge_y2), color, 1, cv2.LINE_AA)
            cv2.putText(
                frame,
                label,
                (badge_x1 + 5, badge_y1 + text_h + 3),
                font,
                font_scale,
                (255, 255, 255),
                font_thick,
                cv2.LINE_AA
            )

        return frame
