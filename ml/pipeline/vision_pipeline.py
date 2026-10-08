"""End-to-End Vision Pipeline for Phase 1 Smart Retail Intelligence."""

import os
import time
import json
import logging
from typing import Dict, Any, List, Optional, Tuple, Union
from datetime import datetime

import cv2
import numpy as np

from ml.detection.person_detector import PersonDetector
from ml.tracking.person_tracker import PersonTracker, Track
from ml.zones.zone_config import Zone, load_zones_from_file
from ml.zones.zone_manager import ZoneManager
from ml.output.json_exporter import JSONExporter

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


class VisionPipeline:
    """End-to-end vision processing pipeline connecting detection, tracking, zones, and export."""

    def __init__(
        self,
        config_path: Optional[str] = None,
        config_dict: Optional[Dict[str, Any]] = None,
        camera_id: Optional[str] = None,
        model_path: Optional[str] = None,
        confidence_threshold: Optional[float] = None,
        tracker_type: Optional[str] = None,
        output_json_path: Optional[str] = None,
        output_video_path: Optional[str] = None,
        frame_skip: Optional[int] = None,
        display: Optional[bool] = None,
    ):
        self.config = self._load_config(config_path, config_dict)

        # Apply overrides
        if camera_id is not None:
            self.config["camera_id"] = camera_id
        if model_path is not None:
            self.config["model_path"] = model_path
        if confidence_threshold is not None:
            self.config["confidence_threshold"] = float(confidence_threshold)
        if tracker_type is not None:
            self.config["tracker_type"] = tracker_type
        if output_json_path is not None:
            self.config["output_json_path"] = output_json_path
        if output_video_path is not None:
            self.config["output_video_path"] = output_video_path
        if frame_skip is not None:
            self.config["frame_skip"] = max(1, int(frame_skip))
        if display is not None:
            self.config["display"] = bool(display)

        self.camera_id = self.config.get("camera_id", "CAM-01")
        self.frame_skip = self.config.get("frame_skip", 1)
        self.sample_interval = self.config.get("sample_interval", 1)

        # Initialize detector
        model_p = self.config.get("model_path", "yolov8n.pt")
        conf_t = self.config.get("confidence_threshold", 0.40)
        logger.info(f"Initializing YOLO PersonDetector with model='{model_p}', conf={conf_t}")
        self.detector = PersonDetector(model_path=model_p, confidence_threshold=conf_t)

        # Initialize tracker
        t_type = self.config.get("tracker_type", "bytetrack.yaml")
        logger.info(f"Initializing PersonTracker with tracker='{t_type}'")
        self.tracker = PersonTracker(tracker_type=t_type, confidence_threshold=conf_t)

        # Initialize zone manager
        zones_data = self.config.get("zones", [])
        if zones_data:
            zones = [Zone.from_dict(z) for z in zones_data]
            self.zone_manager = ZoneManager(zones=zones)
        else:
            self.zone_manager = ZoneManager()
        logger.info(f"Configured {len(self.zone_manager.zones)} store zones: {self.zone_manager.get_zone_ids()}")

        # Initialize JSON exporter
        out_json = self.config.get("output_json_path", "outputs/vision_results.json")
        self.exporter = JSONExporter(output_path=out_json, sample_interval=self.sample_interval)

    def _load_config(
        self, config_path: Optional[str], config_dict: Optional[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Load and validate configuration from file or dict."""
        cfg: Dict[str, Any] = {
            "camera_id": "CAM-01",
            "model_path": "yolov8n.pt",
            "confidence_threshold": 0.40,
            "tracker_type": "bytetrack.yaml",
            "video_source": "",
            "output_json_path": "outputs/vision_results.json",
            "output_video_path": None,
            "sample_interval": 1,
            "frame_skip": 1,
            "display": False,
            "zones": []
        }

        if config_path:
            if not os.path.exists(config_path):
                raise FileNotFoundError(f"Configuration file '{config_path}' not found.")
            with open(config_path, "r", encoding="utf-8") as f:
                try:
                    file_cfg = json.load(f)
                    cfg.update(file_cfg)
                except json.JSONDecodeError as e:
                    raise ValueError(f"Invalid JSON in config file '{config_path}': {e}") from e

        if config_dict:
            cfg.update(config_dict)

        return cfg

    def process_frame(
        self,
        frame: np.ndarray,
        frame_number: int,
        timestamp: Optional[str] = None
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """Process a single video frame through detection, tracking, zone assignment, and visual overlay.
        
        Returns:
            annotated_frame (np.ndarray): Frame with visual overlays
            frame_data (Dict[str, Any]): Structured JSON-compatible result
        """
        if frame is None or frame.size == 0:
            raise ValueError(f"Received empty or invalid frame at index {frame_number}.")

        if timestamp is None:
            timestamp = datetime.now().isoformat()

        # 1. Tracking using YOLO model
        tracks: List[Track] = self.tracker.track_with_model(frame, self.detector.model)

        # 2. Convert tracks to dictionaries and assign zones
        track_dicts = [t.to_dict() for t in tracks]
        self.zone_manager.assign_tracks(track_dicts)

        # 3. Calculate zone counts
        zone_counts = self.zone_manager.count_by_zone(track_dicts)

        # 4. Record to JSON exporter
        frame_data = self.exporter.add_frame_result(
            camera_id=self.camera_id,
            frame_number=frame_number,
            tracks=track_dicts,
            zone_counts=zone_counts,
            timestamp=timestamp
        )

        # If skipped from exporter due to sample_interval, build frame_data object
        if frame_data is None:
            frame_data = {
                "timestamp": timestamp,
                "camera_id": self.camera_id,
                "frame_number": frame_number,
                "tracks": track_dicts,
                "zone_counts": zone_counts
            }

        # 5. Visual Overlays
        annotated_frame = self._render_visuals(frame, track_dicts, zone_counts, frame_number, timestamp)

        return annotated_frame, frame_data

    def _render_visuals(
        self,
        frame: np.ndarray,
        tracks: List[Dict[str, Any]],
        zone_counts: Dict[str, int],
        frame_number: int,
        timestamp: str
    ) -> np.ndarray:
        """Render complete visual overlay with HUD, Zones, BBoxes, and Track IDs."""
        display_frame = frame.copy()
        h, w = display_frame.shape[:2]

        # 1. Render Zones
        display_frame = self.zone_manager.draw_zones(display_frame, zone_counts=zone_counts, alpha=0.22)

        # 2. Render Person Track BBoxes and Centers
        for t in tracks:
            bbox = t["bbox"]
            track_id = t["track_id"]
            conf = t["confidence"]
            center = t["center"]
            zone_id = t.get("zone_id") or "UNASSIGNED"

            x1, y1, x2, y2 = bbox
            box_color = (0, 220, 255) if zone_id == "UNASSIGNED" else (50, 255, 50)

            # Draw bounding box
            cv2.rectangle(display_frame, (x1, y1), (x2, y2), box_color, 2, cv2.LINE_AA)

            # Draw center point and crosshair
            cx, cy = center
            cv2.circle(display_frame, (cx, cy), 4, (0, 0, 255), -1, cv2.LINE_AA)
            cv2.line(display_frame, (cx - 7, cy), (cx + 7, cy), (0, 0, 255), 1, cv2.LINE_AA)
            cv2.line(display_frame, (cx, cy - 7), (cx, cy + 7), (0, 0, 255), 1, cv2.LINE_AA)

            # Label badge
            label = f"{track_id} ({conf:.2f})"
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.5
            font_thick = 1
            (tw, th), _ = cv2.getTextSize(label, font, font_scale, font_thick)

            lbl_y1 = max(0, y1 - th - 6)
            lbl_y2 = y1
            cv2.rectangle(display_frame, (x1, lbl_y1), (x1 + tw + 6, lbl_y2), (20, 20, 20), -1)
            cv2.rectangle(display_frame, (x1, lbl_y1), (x1 + tw + 6, lbl_y2), box_color, 1, cv2.LINE_AA)
            cv2.putText(
                display_frame,
                label,
                (x1 + 3, lbl_y2 - 3),
                font,
                font_scale,
                (255, 255, 255),
                font_thick,
                cv2.LINE_AA
            )

        # 3. Top Status HUD Bar
        hud_h = 36
        hud_overlay = display_frame.copy()
        cv2.rectangle(hud_overlay, (0, 0), (w, hud_h), (15, 15, 15), -1)
        cv2.addWeighted(hud_overlay, 0.75, display_frame, 0.25, 0, display_frame)
        cv2.line(display_frame, (0, hud_h), (w, hud_h), (80, 80, 80), 1, cv2.LINE_AA)

        hud_text = f"[{self.camera_id}] FRAME: {frame_number} | TIME: {timestamp[:19]} | PERSONS: {len(tracks)}"
        cv2.putText(
            display_frame,
            hud_text,
            (15, int(hud_h * 0.65)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.55,
            (240, 240, 240),
            1,
            cv2.LINE_AA
        )

        return display_frame

    def process_video(
        self,
        video_source: Optional[Union[str, int]] = None,
        save_video: bool = False,
        output_video_path: Optional[str] = None,
        output_json_path: Optional[str] = None,
        max_frames: Optional[int] = None
    ) -> Dict[str, Any]:
        """Run the full vision pipeline on a video file, stream, or camera device."""
        source = video_source or self.config.get("video_source")
        if source is None or (isinstance(source, str) and not source.strip()):
            raise ValueError("No video source provided to VisionPipeline.")

        # Check file existence if string path
        if isinstance(source, str) and not source.isdigit() and not source.startswith("rtsp://") and not source.startswith("http"):
            if not os.path.exists(source):
                raise FileNotFoundError(f"Video file not found at: '{source}'")

        # Open video capture
        cap_source = int(source) if (isinstance(source, str) and source.isdigit()) else source
        cap = cv2.VideoCapture(cap_source)
        if not cap.isOpened():
            raise RuntimeError(f"Unable to open video source: '{source}'")

        fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        logger.info(
            f"Opened video: source='{source}', resolution={width}x{height}, FPS={fps:.1f}, total_frames={total_frames}"
        )

        # Video writer setup if saving
        out_vid = output_video_path or self.config.get("output_video_path")
        writer = None
        if save_video and out_vid:
            os.makedirs(os.path.dirname(os.path.abspath(out_vid)), exist_ok=True)
            fourcc = cv2.VideoWriter_fourcc(*"mp4v")
            effective_fps = fps / self.frame_skip
            writer = cv2.VideoWriter(out_vid, fourcc, effective_fps, (width, height))
            logger.info(f"Saving annotated video to: '{out_vid}'")

        display_enabled = self.config.get("display", False)
        window_name = f"Smart Store CCTV - {self.camera_id}"

        frame_idx = 0
        processed_count = 0
        start_time = time.time()

        try:
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret or frame is None:
                    break

                frame_idx += 1

                # Frame skipping
                if frame_idx % self.frame_skip != 0:
                    continue

                annotated_frame, frame_data = self.process_frame(
                    frame=frame,
                    frame_number=frame_idx
                )
                processed_count += 1

                if writer is not None:
                    writer.write(annotated_frame)

                if display_enabled:
                    cv2.imshow(window_name, annotated_frame)
                    if cv2.waitKey(1) & 0xFF == ord('q'):
                        logger.info("Video playback interrupted by user.")
                        break

                if max_frames is not None and processed_count >= max_frames:
                    logger.info(f"Reached max_frames limit ({max_frames}). Stopping.")
                    break

        finally:
            cap.release()
            if writer is not None:
                writer.release()
            if display_enabled:
                cv2.destroyAllWindows()

        elapsed_time = max(0.001, time.time() - start_time)
        actual_fps = processed_count / elapsed_time

        # Save JSON output
        target_json = output_json_path or self.config.get("output_json_path")
        saved_json = self.exporter.save(target_json)

        summary = {
            "camera_id": self.camera_id,
            "source": str(source),
            "frames_read": frame_idx,
            "frames_processed": processed_count,
            "elapsed_seconds": round(elapsed_time, 3),
            "processing_fps": round(actual_fps, 2),
            "output_json": saved_json,
            "output_video": out_vid if (save_video and out_vid) else None
        }

        logger.info(
            f"Processing finished. Processed {processed_count} frames in {elapsed_time:.2f}s ({actual_fps:.2f} FPS). Output: {saved_json}"
        )

        return summary
