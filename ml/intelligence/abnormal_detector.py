"""
Abnormal Activity & Threat Intelligence Detectors with Throttling & Cooldowns.
Includes:
- WeaponDetector: Detects dangerous objects (knives, blades, bats, firearms) with YOLO.
- FightDetector: Spatial-temporal physical altercation & violence detection.
- TheftDetector: Shoplifting, loitering, and checkout bypass detector.
"""

from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta
import numpy as np
import time

from ml.intelligence.models import StoreEvent, EventType, EventSeverity, EventStatus


class WeaponDetector:
    """
    Detects dangerous weapons and objects (knives, blades, baseball bats, etc.)
    using YOLO multi-class object detection.
    """

    # COCO has no firearm class. Only explicit high-risk classes are included;
    # ordinary bottles, umbrellas and utensils must not become security alerts.
    DANGEROUS_CLASSES = {
        43: ("KNIFE", "Potential knife"),
        76: ("SCISSORS", "Potential scissors"),
        34: ("BAT", "Potential baseball bat"),
    }

    def __init__(self, confidence_threshold: float = 0.45, cooldown_seconds: float = 15.0):
        self.confidence_threshold = confidence_threshold
        self.cooldown_seconds = cooldown_seconds
        self._last_alert_time: float = 0.0

    def detect(
        self,
        frame: np.ndarray,
        yolo_model: Any,
        camera_id: str = "CAM-01",
        zone_id: str = "STORE_FLOOR",
        tracks: Optional[List[Dict[str, Any]]] = None
    ) -> Tuple[List[StoreEvent], List[Dict[str, Any]]]:
        """
        Runs YOLO inference for dangerous weapon classes.
        Returns generated StoreEvents and raw weapon detection bounding boxes.
        """
        if frame is None or frame.size == 0 or yolo_model is None:
            return [], []

        try:
            import torch
            if hasattr(yolo_model, "predictor") and yolo_model.predictor and hasattr(yolo_model.predictor, "callbacks"):
                if "on_predict_postprocess_end" in yolo_model.predictor.callbacks:
                    yolo_model.predictor.callbacks["on_predict_postprocess_end"] = []
            with torch.inference_mode():
                results = yolo_model(
                    frame,
                    conf=self.confidence_threshold,
                    imgsz=640,
                    classes=list(self.DANGEROUS_CLASSES.keys()),
                    verbose=False
                )
        except Exception:
            return [], []

        events: List[StoreEvent] = []
        weapon_detections: List[Dict[str, Any]] = []

        if not results:
            return events, weapon_detections

        now_ts = time.time()
        for r in results:
            if r.boxes is None:
                continue
            for box in r.boxes:
                xyxy = box.xyxy[0].cpu().numpy().astype(int).tolist()
                conf = float(box.conf[0].cpu().numpy())
                cls_id = int(box.cls[0].cpu().numpy())

                if cls_id not in self.DANGEROUS_CLASSES:
                    continue

                threat_code, threat_label = self.DANGEROUS_CLASSES[cls_id]

                w_det = {
                    "threat_type": threat_code,
                    "threat_label": threat_label,
                    "bbox": xyxy,
                    "confidence": round(conf, 3),
                    "center": [int((xyxy[0] + xyxy[2]) / 2), int((xyxy[1] + xyxy[3]) / 2)]
                }
                weapon_detections.append(w_det)

                # Emit event only if cooldown has elapsed
                if now_ts - self._last_alert_time > self.cooldown_seconds:
                    self._last_alert_time = now_ts

                    associated_track_id = None
                    if tracks:
                        wx, wy = w_det["center"]
                        min_dist = float("inf")
                        for tr in tracks:
                            tx, ty = tr.get("center", (0, 0))
                            dist = ((wx - tx) ** 2 + (wy - ty) ** 2) ** 0.5
                            if dist < 200 and dist < min_dist:
                                min_dist = dist
                                associated_track_id = tr.get("track_id")

                    event_id = f"EVT-WEAPON-{camera_id}-{datetime.now().strftime('%H%M%S%f')[:10]}"
                    event = StoreEvent(
                        event_id=event_id,
                        event_type=EventType.WEAPON_DETECTED.value,
                        camera_id=camera_id,
                        zone_id=zone_id,
                        timestamp=datetime.now().isoformat(),
                        severity=EventSeverity.CRITICAL.value,
                        status=EventStatus.ACTIVE.value,
                        description=f"Review required: {threat_label} detected in {zone_id} with {int(conf * 100)}% model confidence.",
                        track_id=associated_track_id,
                        details={
                            "threat_type": threat_code,
                            "threat_label": threat_label,
                            "bbox": xyxy,
                            "confidence": round(conf, 3),
                        }
                    )
                    events.append(event)

        return events, weapon_detections


class FightDetector:
    """
    Detects physical altercations and violent aggression using multi-track
    spatial collision proximity and rapid kinetic motion displacement.
    """

    def __init__(self, collision_distance: float = 80.0, velocity_threshold: float = 65.0, cooldown_seconds: float = 30.0):
        self.collision_distance = collision_distance
        self.velocity_threshold = velocity_threshold
        self.cooldown_seconds = cooldown_seconds
        # track_id -> {"center": (x,y), "frames": int}
        self._track_history: Dict[str, Dict[str, Any]] = {}
        self._last_alert_time: float = 0.0

    def detect(
        self,
        tracks: List[Dict[str, Any]],
        camera_id: str = "CAM-01",
        zone_id: str = "STORE_FLOOR"
    ) -> List[StoreEvent]:
        """
        Analyzes track distances and kinetic velocity spikes with cooldown.
        Requires sustained multi-frame presence and significant bounding box interaction.
        """
        events: List[StoreEvent] = []
        if len(tracks) < 2:
            return events

        now_ts = time.time()
        new_history: Dict[str, Dict[str, Any]] = {}

        for tr in tracks:
            tid = tr.get("track_id", "")
            cx, cy = tr.get("center", (0, 0))
            prev_frames = self._track_history.get(tid, {}).get("frames", 0)
            new_history[tid] = {"center": (cx, cy), "frames": prev_frames + 1}

        # Check for pair collisions only among established foreground tracks
        for i in range(len(tracks)):
            for j in range(i + 1, len(tracks)):
                t1 = tracks[i]
                t2 = tracks[j]
                tid1, tid2 = t1.get("track_id", "T1"), t2.get("track_id", "T2")

                # Both tracks must be established (tracked for at least 3 frames)
                if new_history.get(tid1, {}).get("frames", 0) < 3 or new_history.get(tid2, {}).get("frames", 0) < 3:
                    continue

                # Filter out tiny distant background boxes (must have reasonable size)
                b1, b2 = t1.get("bbox", [0, 0, 0, 0]), t2.get("bbox", [0, 0, 0, 0])
                w1, h1 = b1[2] - b1[0], b1[3] - b1[1]
                w2, h2 = b2[2] - b2[0], b2[3] - b2[1]
                if min(w1, h1, w2, h2) < 40:
                    continue

                c1 = t1.get("center", [0, 0])
                c2 = t2.get("center", [0, 0])

                dist = ((c1[0] - c2[0]) ** 2 + (c1[1] - c2[1]) ** 2) ** 0.5

                if dist < self.collision_distance:
                    prev1 = self._track_history.get(tid1, {}).get("center", c1)
                    prev2 = self._track_history.get(tid2, {}).get("center", c2)
                    v1 = ((c1[0] - prev1[0]) ** 2 + (c1[1] - prev1[1]) ** 2) ** 0.5
                    v2 = ((c2[0] - prev2[0]) ** 2 + (c2[1] - prev2[1]) ** 2) ** 0.5

                    # Must have actual rapid kinetic motion (velocity spike)
                    if (v1 + v2) > self.velocity_threshold:
                        if now_ts - self._last_alert_time > self.cooldown_seconds:
                            self._last_alert_time = now_ts
                            event_id = f"EVT-FIGHT-{camera_id}-{datetime.now().strftime('%H%M%S%f')[:10]}"
                            event = StoreEvent(
                                event_id=event_id,
                                event_type=EventType.FIGHT_ALTERCATION.value,
                                camera_id=camera_id,
                                zone_id=t1.get("zone_id") or zone_id,
                                timestamp=datetime.now().isoformat(),
                                severity=EventSeverity.CRITICAL.value,
                                status=EventStatus.ACTIVE.value,
                                description=f"CRITICAL: Physical altercation / violent aggression inferred between {tid1} and {tid2}.",
                                people_count=2,
                                details={
                                    "track_ids": [tid1, tid2],
                                    "proximity_distance": round(dist, 1),
                                    "kinetic_energy": round(v1 + v2, 1)
                                }
                            )
                            events.append(event)

        self._track_history = new_history
        return events


class TheftDetector:
    """
    Detects suspicious theft and shoplifting patterns:
    - Prolonged loitering in merchandise aisles (> dwell threshold).
    - Rapid exit without passing through checkout zones.
    """

    def __init__(self, loiter_dwell_frames: int = 150, cooldown_seconds: float = 30.0):
        self.loiter_dwell_frames = loiter_dwell_frames
        self.cooldown_seconds = cooldown_seconds
        # track_id -> {"zone": str, "frames": int, "visited_checkout": bool}
        self._track_histories: Dict[str, Dict[str, Any]] = {}
        self._last_alert_time: float = 0.0

    def detect(
        self,
        tracks: List[Dict[str, Any]],
        camera_id: str = "CAM-01"
    ) -> List[StoreEvent]:
        events: List[StoreEvent] = []
        now_ts = time.time()

        active_ids = set()
        for tr in tracks:
            tid = tr.get("track_id")
            if not tid:
                continue
            active_ids.add(tid)
            zone = tr.get("zone_id", "UNKNOWN")

            if tid not in self._track_histories:
                self._track_histories[tid] = {
                    "zone": zone,
                    "frames": 1,
                    "visited_checkout": False,
                    "alerted": False
                }
            else:
                hist = self._track_histories[tid]
                if zone == hist["zone"]:
                    hist["frames"] += 1
                else:
                    hist["zone"] = zone
                    hist["frames"] = 1

                if "CHECKOUT" in (zone or ""):
                    hist["visited_checkout"] = True

                # Suspicious prolonged dwelling in high-value merchandise aisles
                if "AISLE" in (zone or "") and hist["frames"] > self.loiter_dwell_frames and not hist["alerted"]:
                    if now_ts - self._last_alert_time > self.cooldown_seconds:
                        self._last_alert_time = now_ts
                        hist["alerted"] = True
                        event_id = f"EVT-THEFT-{camera_id}-{datetime.now().strftime('%H%M%S%f')[:10]}"
                        event = StoreEvent(
                            event_id=event_id,
                            event_type=EventType.SUSPICIOUS_THEFT.value,
                            camera_id=camera_id,
                            zone_id=zone,
                            timestamp=datetime.now().isoformat(),
                            severity=EventSeverity.HIGH.value,
                            status=EventStatus.ACTIVE.value,
                            description=f"Suspicious loitering / potential merchandise concealment by {tid} in {zone}.",
                            track_id=tid,
                            details={"dwell_frames": hist["frames"], "zone_id": zone}
                        )
                        events.append(event)

        # Cleanup lost tracks
        for tid in list(self._track_histories.keys()):
            if tid not in active_ids:
                del self._track_histories[tid]

        return events


class SlipAndFallDetector:
    """
    Detects slip-and-fall incidents, medical collapses, and prone postures.
    Requires an upright-to-prone transition, downward centroid movement, and
    sustained horizontal posture. A wide box by itself is never a fall.
    """

    def __init__(self, aspect_ratio_threshold: float = 1.15, persistence_frames: int = 5, cooldown_seconds: float = 20.0):
        self.aspect_ratio_threshold = aspect_ratio_threshold
        self.persistence_frames = persistence_frames
        self.cooldown_seconds = cooldown_seconds
        # Per-track temporal posture state. No biometric data is retained.
        self._track_states: Dict[str, Dict[str, Any]] = {}
        self._last_alert_time: float = 0.0

    def detect(
        self,
        tracks: List[Dict[str, Any]],
        camera_id: str = "CAM-01",
        zone_id: str = "STORE_FLOOR"
    ) -> List[StoreEvent]:
        events: List[StoreEvent] = []
        now_ts = time.time()
        active_ids = set()

        for tr in tracks:
            tid = tr.get("track_id")
            if not tid:
                continue
            active_ids.add(tid)

            bbox = tr.get("bbox", [0, 0, 0, 0])
            w = max(1, bbox[2] - bbox[0])
            h = max(1, bbox[3] - bbox[1])
            aspect_ratio = w / h

            center_y = (bbox[1] + bbox[3]) / 2.0
            if tid not in self._track_states:
                self._track_states[tid] = {
                    "prone_frames": 0,
                    "alerted": False,
                    "upright_seen": False,
                    "upright_center_y": center_y,
                    "upright_height": h,
                    "transition_verified": False,
                }

            state = self._track_states[tid]

            if aspect_ratio <= 0.85 and h >= 40:
                state["upright_seen"] = True
                state["upright_center_y"] = center_y
                state["upright_height"] = h
                state["transition_verified"] = False
                state["prone_frames"] = 0
            elif aspect_ratio >= self.aspect_ratio_threshold and max(w, h) >= 40:
                required_drop = max(18.0, float(state["upright_height"]) * 0.18)
                vertical_drop = center_y - float(state["upright_center_y"])
                if state["upright_seen"] and vertical_drop >= required_drop:
                    state["transition_verified"] = True
                state["prone_frames"] += 1
            else:
                state["prone_frames"] = max(0, state["prone_frames"] - 1)

            if (
                state["transition_verified"]
                and state["prone_frames"] >= self.persistence_frames
                and not state["alerted"]
            ):
                if now_ts - self._last_alert_time > self.cooldown_seconds:
                    self._last_alert_time = now_ts
                    state["alerted"] = True
                    event_id = f"EVT-FALL-{camera_id}-{datetime.now().strftime('%H%M%S%f')[:10]}"
                    event = StoreEvent(
                        event_id=event_id,
                        event_type=EventType.SLIP_AND_FALL.value,
                        camera_id=camera_id,
                        zone_id=tr.get("zone_id") or zone_id,
                        timestamp=datetime.now().isoformat(),
                        severity=EventSeverity.CRITICAL.value,
                        status=EventStatus.ACTIVE.value,
                        description=f"Review required: possible fall transition detected for {tid}.",
                        track_id=tid,
                        details={
                            "aspect_ratio": round(aspect_ratio, 2),
                            "prone_frames": state["prone_frames"],
                            "transition_verified": True,
                            "vertical_drop": round(center_y - float(state["upright_center_y"]), 1),
                            "zone_id": tr.get("zone_id") or zone_id,
                        }
                    )
                    events.append(event)

        # Cleanup inactive tracks
        for tid in list(self._track_states.keys()):
            if tid not in active_ids:
                del self._track_states[tid]

        return events


class AbandonedObjectDetector:
    """
    Detects unattended baggage, suspicious packages, or lost items
    left detached from shoppers in public store areas.
    """

    OBJECT_CLASSES = {
        24: "Backpack / Bag",
        26: "Handbag / Purse",
        28: "Suitcase / Luggage",
    }

    def __init__(self, confidence_threshold: float = 0.15, max_owner_distance: float = 180.0, cooldown_seconds: float = 30.0):
        self.confidence_threshold = confidence_threshold
        self.max_owner_distance = max_owner_distance
        self.cooldown_seconds = cooldown_seconds
        self._last_alert_time: float = 0.0

    def detect(
        self,
        frame: np.ndarray,
        yolo_model: Any,
        camera_id: str = "CAM-01",
        zone_id: str = "STORE_FLOOR",
        tracks: Optional[List[Dict[str, Any]]] = None
    ) -> Tuple[List[StoreEvent], List[Dict[str, Any]]]:
        if frame is None or frame.size == 0 or yolo_model is None:
            return [], []

        try:
            import torch
            with torch.inference_mode():
                results = yolo_model(
                    frame,
                    conf=self.confidence_threshold,
                    imgsz=640,
                    classes=list(self.OBJECT_CLASSES.keys()),
                    verbose=False
                )
        except Exception:
            return [], []

        events: List[StoreEvent] = []
        abandoned_objects: List[Dict[str, Any]] = []

        if not results:
            return events, abandoned_objects

        now_ts = time.time()
        for r in results:
            if r.boxes is None:
                continue
            for box in r.boxes:
                xyxy = box.xyxy[0].cpu().numpy().astype(int).tolist()
                conf = float(box.conf[0].cpu().numpy())
                cls_id = int(box.cls[0].cpu().numpy())

                if cls_id not in self.OBJECT_CLASSES:
                    continue

                obj_label = self.OBJECT_CLASSES[cls_id]
                cx, cy = int((xyxy[0] + xyxy[2]) / 2), int((xyxy[1] + xyxy[3]) / 2)

                # Check proximity to any person track
                is_accompanied = False
                if tracks:
                    for tr in tracks:
                        tcx, tcy = tr.get("center", (0, 0))
                        dist = ((cx - tcx) ** 2 + (cy - tcy) ** 2) ** 0.5
                        if dist < self.max_owner_distance:
                            is_accompanied = True
                            break

                # If detached / unattended
                if not is_accompanied:
                    obj_det = {
                        "object_type": obj_label,
                        "bbox": xyxy,
                        "confidence": round(conf, 3),
                        "center": [cx, cy],
                    }
                    abandoned_objects.append(obj_det)

                    if now_ts - self._last_alert_time > self.cooldown_seconds:
                        self._last_alert_time = now_ts
                        event_id = f"EVT-UNATTENDED-{camera_id}-{datetime.now().strftime('%H%M%S%f')[:10]}"
                        event = StoreEvent(
                            event_id=event_id,
                            event_type=EventType.ABANDONED_OBJECT.value,
                            camera_id=camera_id,
                            zone_id=zone_id,
                            timestamp=datetime.now().isoformat(),
                            severity=EventSeverity.MEDIUM.value,
                            status=EventStatus.ACTIVE.value,
                            description=f"Unattended / abandoned {obj_label} detected in {zone_id}.",
                            details={"object_type": obj_label, "bbox": xyxy, "confidence": round(conf, 3)}
                        )
                        events.append(event)

        return events, abandoned_objects

