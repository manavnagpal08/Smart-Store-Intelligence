"""Zone configuration models and validation."""

from dataclasses import dataclass, field
from typing import List, Tuple, Dict, Any, Optional
import json
import os


@dataclass
class Zone:
    """Represents a store zone defined by a polygon."""
    zone_id: str
    name: str
    type: str
    points: List[List[float]]
    color: Tuple[int, int, int] = field(default=(0, 255, 0))  # BGR

    def to_dict(self) -> Dict[str, Any]:
        return {
            "zone_id": self.zone_id,
            "name": self.name,
            "type": self.type,
            "points": self.points,
            "color": list(self.color)
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Zone":
        if "zone_id" not in data or not data["zone_id"]:
            raise ValueError("Zone definition missing 'zone_id'")
        if "points" not in data or not isinstance(data["points"], list) or len(data["points"]) < 3:
            raise ValueError(f"Zone '{data.get('zone_id')}' must have at least 3 polygon points")
        
        # Color mapping by zone type default
        default_colors = {
            "ENTRANCE": (255, 200, 0),     # Cyan-ish / Yellow
            "EXIT": (200, 200, 0),
            "AISLE": (0, 255, 128),       # Green
            "CHECKOUT": (255, 128, 0),    # Blue-ish
            "RESTRICTED": (0, 0, 255),    # Red
        }
        zone_type = str(data.get("type", "AISLE")).upper()
        color = data.get("color")
        if color and isinstance(color, (list, tuple)) and len(color) == 3:
            zone_color = (int(color[0]), int(color[1]), int(color[2]))
        else:
            zone_color = default_colors.get(zone_type, (0, 255, 0))

        return cls(
            zone_id=str(data["zone_id"]),
            name=str(data.get("name", data["zone_id"])),
            type=zone_type,
            points=[[float(p[0]), float(p[1])] for p in data["points"]],
            color=zone_color
        )


def load_zones_from_file(file_path: str) -> List[Zone]:
    """Load zones list from a JSON configuration file."""
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Zone config file not found: {file_path}")
    
    with open(file_path, "r", encoding="utf-8") as f:
        try:
            data = json.load(f)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON in zone config file '{file_path}': {e}") from e

    zones_data = data.get("zones", data if isinstance(data, list) else [])
    if not isinstance(zones_data, list):
        raise ValueError("Zone config must contain a 'zones' array or a top-level list of zones.")

    zones: List[Zone] = []
    seen_ids = set()
    for item in zones_data:
        zone = Zone.from_dict(item)
        if zone.zone_id in seen_ids:
            raise ValueError(f"Duplicate zone_id found: '{zone.zone_id}'")
        seen_ids.add(zone.zone_id)
        zones.append(zone)

    return zones
