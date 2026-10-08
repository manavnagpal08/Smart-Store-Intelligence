"""YOLO Person Detector for CCTV and retail video frames."""

from dataclasses import dataclass
from typing import List, Tuple, Optional, Any
import os
import numpy as np


@dataclass
class Detection:
    """Represents a single person detection."""
    bbox: List[int]  # [x1, y1, x2, y2]
    confidence: float
    class_id: int = 0
    class_name: str = "person"

    @property
    def center(self) -> List[int]:
        """Calculate the center point (cx, cy) of the bounding box."""
        x1, y1, x2, y2 = self.bbox
        return [int((x1 + x2) / 2), int((y1 + y2) / 2)]


class PersonDetector:
    """Detects people in video frames using YOLO."""

    def __init__(
        self,
        model_path: str = "yolov8n.pt",
        confidence_threshold: float = 0.12,
        device: Optional[str] = None
    ):
        self.model_path = model_path
        self.confidence_threshold = float(confidence_threshold)
        self.device = device
        self.model = None
        self._load_model()

    def _load_model(self) -> None:
        """Load the YOLO model safely."""
        try:
            from ultralytics import YOLO
            self.model = YOLO(self.model_path)
            if self.device:
                self.model.to(self.device)
        except Exception as e:
            raise RuntimeError(
                f"Failed to load YOLO model from '{self.model_path}'. Error: {e}"
            ) from e

    def detect(self, frame: np.ndarray) -> List[Detection]:
        """Run YOLO inference on a single frame and return filtered person detections."""
        if self.model is None:
            raise RuntimeError("YOLO model is not initialized.")
        if frame is None or frame.size == 0:
            return []

        import torch
        try:
            torch.set_num_threads(4)
        except Exception:
            pass

        # Remove any leftover tracker callbacks on predictor to avoid ultralytics internal AttributeError
        try:
            if hasattr(self.model, "predictor") and self.model.predictor and hasattr(self.model.predictor, "callbacks"):
                if "on_predict_postprocess_end" in self.model.predictor.callbacks:
                    self.model.predictor.callbacks["on_predict_postprocess_end"] = []
        except Exception:
            pass

        # Run high-speed inference filtering for person class (COCO class 0)
        with torch.inference_mode():
            results = self.model(
                frame,
                conf=self.confidence_threshold,
                iou=0.45,  # Non-maximum suppression
                imgsz=640,
                classes=[0],  # Person class only
                verbose=False
            )

        detections: List[Detection] = []
        if not results:
            return detections

        for r in results:
            boxes = r.boxes
            if boxes is None:
                continue
            for box in boxes:
                xyxy = box.xyxy[0].cpu().numpy().astype(int).tolist()
                conf = float(box.conf[0].cpu().numpy())
                cls_id = int(box.cls[0].cpu().numpy())

                detections.append(
                    Detection(
                        bbox=xyxy,
                        confidence=conf,
                        class_id=cls_id,
                        class_name="person"
                    )
                )

        return detections
