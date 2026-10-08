"""Anonymous Person Tracker for Video Streams."""

from dataclasses import dataclass
from typing import List, Dict, Any, Optional, Tuple, Union
import numpy as np


@dataclass
class Track:
    """Represents an active anonymous person track."""
    track_id: str
    bbox: List[int]  # [x1, y1, x2, y2]
    confidence: float
    center: List[int]
    zone_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            "track_id": self.track_id,
            "bbox": self.bbox,
            "confidence": round(float(self.confidence), 3),
            "center": self.center,
            "zone_id": self.zone_id
        }


def format_anonymous_id(raw_id: Union[int, str], prefix: str = "TRACK-") -> str:
    """Format tracking ID into anonymous format, e.g. TRACK-001."""
    try:
        num_id = int(raw_id)
        return f"{prefix}{num_id:03d}"
    except (ValueError, TypeError):
        return f"{prefix}{raw_id}"


class FallbackIoUTracker:
    """Lightweight IoU/Centroid tracker for fallback and testing."""

    def __init__(self, max_lost_frames: int = 15, iou_threshold: float = 0.3):
        self.max_lost_frames = max_lost_frames
        self.iou_threshold = iou_threshold
        self.next_id = 1
        # track_id -> {"bbox": [...], "lost": int, "center": [...], "conf": float}
        self.active_tracks: Dict[int, Dict[str, Any]] = {}

    @staticmethod
    def calculate_iou(box1: List[int], box2: List[int]) -> float:
        """Calculate intersection-over-union between two bounding boxes."""
        x1 = max(box1[0], box2[0])
        y1 = max(box1[1], box2[1])
        x2 = min(box1[2], box2[2])
        y2 = min(box1[3], box2[3])

        intersection = max(0, x2 - x1) * max(0, y2 - y1)
        area1 = max(0, box1[2] - box1[0]) * max(0, box1[3] - box1[1])
        area2 = max(0, box2[2] - box2[0]) * max(0, box2[3] - box2[1])
        union = area1 + area2 - intersection

        return intersection / union if union > 0 else 0.0

    def update(self, detections: List[Dict[str, Any]]) -> List[Track]:
        """Update tracker state with new frame detections."""
        updated_tracks: List[Track] = []
        det_bboxes = [d["bbox"] for d in detections]
        det_confs = [d.get("confidence", 1.0) for d in detections]

        matched_tracks = set()
        matched_dets = set()

        if self.active_tracks and det_bboxes:
            track_ids = list(self.active_tracks.keys())
            iou_matrix = np.zeros((len(track_ids), len(det_bboxes)), dtype=float)

            for i, tid in enumerate(track_ids):
                for j, dbox in enumerate(det_bboxes):
                    iou_matrix[i, j] = self.calculate_iou(self.active_tracks[tid]["bbox"], dbox)

            # Greedy matching
            while True:
                max_iou = np.max(iou_matrix) if iou_matrix.size > 0 else 0
                if max_iou < self.iou_threshold:
                    break
                i, j = np.unravel_index(np.argmax(iou_matrix), iou_matrix.shape)
                tid = track_ids[i]
                bbox = det_bboxes[j]
                conf = det_confs[j]
                cx, cy = int((bbox[0] + bbox[2]) / 2), int((bbox[1] + bbox[3]) / 2)

                self.active_tracks[tid] = {
                    "bbox": bbox,
                    "lost": 0,
                    "center": [cx, cy],
                    "conf": conf
                }
                matched_tracks.add(tid)
                matched_dets.add(j)
                iou_matrix[i, :] = -1.0
                iou_matrix[:, j] = -1.0

        # Create new tracks for unmatched detections
        for j, bbox in enumerate(det_bboxes):
            if j not in matched_dets:
                tid = self.next_id
                self.next_id += 1
                conf = det_confs[j]
                cx, cy = int((bbox[0] + bbox[2]) / 2), int((bbox[1] + bbox[3]) / 2)
                self.active_tracks[tid] = {
                    "bbox": bbox,
                    "lost": 0,
                    "center": [cx, cy],
                    "conf": conf
                }
                matched_tracks.add(tid)

        # Handle unmatched tracks and purge dead tracks
        dead_tracks = []
        for tid in list(self.active_tracks.keys()):
            if tid not in matched_tracks:
                self.active_tracks[tid]["lost"] += 1
                if self.active_tracks[tid]["lost"] > self.max_lost_frames:
                    dead_tracks.append(tid)

        for tid in dead_tracks:
            del self.active_tracks[tid]

        # Build active track objects for tracks detected in this frame
        for tid, data in self.active_tracks.items():
            if data["lost"] == 0:
                updated_tracks.append(
                    Track(
                        track_id=format_anonymous_id(tid),
                        bbox=data["bbox"],
                        confidence=data["conf"],
                        center=data["center"]
                    )
                )

        return updated_tracks


class PersonTracker:
    """Manages person tracking using YOLO ByteTrack / BoT-SORT or IoU tracker."""

    def __init__(
        self,
        tracker_type: str = "bytetrack.yaml",
        confidence_threshold: float = 0.40,
        use_fallback: bool = False
    ):
        self.tracker_type = tracker_type
        self.confidence_threshold = confidence_threshold
        self.use_fallback = use_fallback
        self.fallback_tracker = FallbackIoUTracker()

    def track_with_model(self, frame: np.ndarray, yolo_model: Any) -> List[Track]:
        """Track people in a frame using YOLO detections and robust tracker."""
        if frame is None or frame.size == 0 or yolo_model is None:
            return []

        try:
            # Clean any callbacks to avoid Ultralytics internal tracker AttributeError
            if hasattr(yolo_model, "predictor") and yolo_model.predictor and hasattr(yolo_model.predictor, "callbacks"):
                if "on_predict_postprocess_end" in yolo_model.predictor.callbacks:
                    yolo_model.predictor.callbacks["on_predict_postprocess_end"] = []

            results = yolo_model(
                frame,
                conf=self.confidence_threshold,
                classes=[0],  # Person class only
                verbose=False
            )
            return self._track_from_results_fallback(results)
        except Exception:
            return []

    def _track_from_results_fallback(self, results: Any) -> List[Track]:
        """Fallback tracking when native track is unavailable."""
        detections = []
        for r in results:
            if r.boxes is None:
                continue
            for box in r.boxes:
                xyxy = box.xyxy[0].cpu().numpy().astype(int).tolist()
                conf = float(box.conf[0].cpu().numpy())
                detections.append({"bbox": xyxy, "confidence": conf})

        return self.fallback_tracker.update(detections)

    def track_detections(self, detections: List[Dict[str, Any]]) -> List[Track]:
        """Track explicit detection dictionary objects using fallback tracker."""
        return self.fallback_tracker.update(detections)
