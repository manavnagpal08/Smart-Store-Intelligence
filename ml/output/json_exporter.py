"""Structured JSON Exporter for Vision Pipeline results."""

from typing import List, Dict, Any, Optional
import os
import json
from datetime import datetime


class JSONExporter:
    """Exports structured frame vision data compatible with Phase 2 Alert Engine."""

    def __init__(self, output_path: Optional[str] = "outputs/vision_results.json", sample_interval: int = 1):
        self.output_path = output_path
        self.sample_interval = max(1, sample_interval)
        self.records: List[Dict[str, Any]] = []

        if self.output_path:
            os.makedirs(os.path.dirname(os.path.abspath(self.output_path)), exist_ok=True)

    def add_frame_result(
        self,
        camera_id: str,
        frame_number: int,
        tracks: List[Dict[str, Any]],
        zone_counts: Dict[str, int],
        timestamp: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """Record structured frame result if it matches sample interval."""
        if frame_number % self.sample_interval != 0:
            return None

        if timestamp is None:
            timestamp = datetime.now().isoformat()

        # Format clean track items
        cleaned_tracks = []
        for t in tracks:
            track_item = {
                "track_id": t.get("track_id"),
                "bbox": t.get("bbox"),
                "confidence": round(float(t.get("confidence", 0.0)), 3),
                "center": t.get("center"),
                "zone_id": t.get("zone_id")
            }
            cleaned_tracks.append(track_item)

        record = {
            "timestamp": timestamp,
            "camera_id": camera_id,
            "frame_number": frame_number,
            "tracks": cleaned_tracks,
            "zone_counts": zone_counts
        }
        self.records.append(record)
        return record

    def save(self, filepath: Optional[str] = None) -> str:
        """Save accumulated records to JSON file."""
        target_path = filepath or self.output_path
        if not target_path:
            raise ValueError("No output path specified for JSON export.")

        os.makedirs(os.path.dirname(os.path.abspath(target_path)), exist_ok=True)
        with open(target_path, "w", encoding="utf-8") as f:
            json.dump(self.records, f, indent=2)

        return target_path

    def clear(self) -> None:
        """Clear buffered records."""
        self.records.clear()
