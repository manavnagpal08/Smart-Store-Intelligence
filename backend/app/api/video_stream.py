"""
Live Video Streaming & Real-Time Computer Vision Inference Router.
Provides real-time MJPEG live stream with YOLOv8 Person Detection, ByteTrack, Zone Mapping,
Abnormal Activity Detection (Weapons, Violence/Fighting, Suspicious Theft),
and Laptop Webcam / CCTV / RTSP feed support.
"""

import os
import cv2
import time
import json
import base64
import logging
import numpy as np
from datetime import datetime
from typing import Optional, Dict, Any, Generator, List
from fastapi import APIRouter, Query, Body, HTTPException, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from backend.app.database.session import get_db
from backend.app.models.event import EventDB
from ml.detection.person_detector import PersonDetector
from ml.tracking.person_tracker import PersonTracker
from ml.zones.zone_manager import ZoneManager
from ml.zones.zone_config import load_zones_from_file
from ml.intelligence.abnormal_detector import (
    WeaponDetector,
    FightDetector,
    TheftDetector,
    SlipAndFallDetector,
    AbandonedObjectDetector
)

router = APIRouter(prefix="/video", tags=["Video Stream & Webcam"])
logger = logging.getLogger("backend.video_stream")

# Shared singleton components to conserve memory and avoid reload lag
_detector = None
_tracker = None
_zone_manager = None
_weapon_detector = None
_fight_detector = None
_theft_detector = None
_fall_detector = None
_abandoned_detector = None


def get_cv_components():
    global _detector, _tracker, _zone_manager, _weapon_detector, _fight_detector, _theft_detector, _fall_detector, _abandoned_detector
    if _detector is None:
        model_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../yolov8n.pt"))
        _detector = PersonDetector(model_path=model_path, confidence_threshold=0.12)
        _tracker = PersonTracker(confidence_threshold=0.12)
        _weapon_detector = WeaponDetector(confidence_threshold=0.08, cooldown_seconds=5.0)
        _fight_detector = FightDetector(cooldown_seconds=10.0)
        _theft_detector = TheftDetector(cooldown_seconds=15.0)
        _fall_detector = SlipAndFallDetector(aspect_ratio_threshold=1.15, persistence_frames=4, cooldown_seconds=15.0)
        _abandoned_detector = AbandonedObjectDetector(confidence_threshold=0.15, cooldown_seconds=20.0)

        zone_config_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../ml/config/zones.json"))
        if os.path.exists(zone_config_path):
            _zone_manager = ZoneManager(config_path=zone_config_path)
        else:
            _zone_manager = ZoneManager()

    return _detector, _tracker, _zone_manager, _weapon_detector, _fight_detector, _theft_detector, _fall_detector, _abandoned_detector


def draw_hud(
    frame: np.ndarray,
    camera_id: str,
    source_name: str,
    fps: float,
    track_count: int,
    threat_count: int = 0
) -> np.ndarray:
    """Draw clean enterprise CCTV HUD on frame with threat status."""
    h, w = frame.shape[:2]

    # Top HUD Bar
    cv2.rectangle(frame, (0, 0), (w, 36), (15, 23, 42), -1)

    # Red REC dot
    cv2.circle(frame, (18, 18), 6, (0, 0, 240), -1)
    cv2.putText(frame, "LIVE", (32, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 255), 2, cv2.LINE_AA)

    # Camera name & Source
    cam_text = f"CAM: {camera_id} | {source_name}"
    cv2.putText(frame, cam_text, (85, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (240, 240, 240), 1, cv2.LINE_AA)

    # Live timestamp
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(frame, now_str, (max(w - 200, 200), 23), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (200, 200, 200), 1, cv2.LINE_AA)

    # Threat banner if threat_count > 0
    if threat_count > 0:
        cv2.rectangle(frame, (0, 36), (w, 70), (0, 0, 220), -1)
        alert_txt = f"*** CRITICAL THREAT DETECTED ({threat_count}) - IMMEDIATE SECURITY ALERT ***"
        cv2.putText(frame, alert_txt, (30, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (255, 255, 255), 2, cv2.LINE_AA)

    # Bottom Status Bar
    cv2.rectangle(frame, (0, h - 28), (w, h), (15, 23, 42), -1)
    status_text = f"FPS: {fps:.1f} | People: {track_count} | Threats: {threat_count} | YOLOv8 Multi-Threat Active"
    status_color = (0, 0, 255) if threat_count > 0 else (160, 220, 160)
    cv2.putText(frame, status_text, (15, h - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.38, status_color, 1, cv2.LINE_AA)

    return frame


def generate_mjpeg_stream(
    source: str,
    camera_id: str = "CAM-01",
    show_zones: bool = True,
    show_bboxes: bool = True,
    conf_threshold: float = 0.25,
) -> Generator[bytes, None, None]:
    """Generates continuous MJPEG frames with real-time YOLO detection, tracking, and weapon scanning."""
    detector, tracker, zone_manager, weapon_det, fight_det, theft_det = get_cv_components()

    # Parse source: if digits, treat as integer device index for webcam
    if source.isdigit():
        video_src = int(source)
        source_name = f"Laptop Webcam {source}"
        cap = cv2.VideoCapture(video_src, cv2.CAP_DSHOW) if os.name == 'nt' else cv2.VideoCapture(video_src)
    elif source == "sample" or "sample_cctv" in source:
        sample_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../datasets/sample/sample_cctv.mp4"))
        video_src = sample_path
        source_name = "CCTV Sample Video"
        cap = cv2.VideoCapture(video_src)
    else:
        video_src = source
        source_name = "Network Stream"
        cap = cv2.VideoCapture(video_src)

    if not cap.isOpened():
        logger.warning(f"Failed to open video source: {video_src}. Using test synthetic stream fallback.")
        sample_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../datasets/sample/sample_cctv.mp4"))
        cap = cv2.VideoCapture(sample_path)
        source_name = "CCTV Ingest (Fallback)"

    prev_time = time.time()

    try:
        while True:
            success, frame = cap.read()
            if not success or frame is None:
                # Loop video if it's a file
                cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                success, frame = cap.read()
                if not success or frame is None:
                    time.sleep(0.1)
                    continue

            curr_time = time.time()
            fps = 1.0 / max(0.001, (curr_time - prev_time))
            prev_time = curr_time

            # Resize if overly large for smooth web streaming
            h, w = frame.shape[:2]
            if w > 960:
                frame = cv2.resize(frame, (960, int(h * 960 / w)))

            # Direct YOLO Person Detection & Tracking
            raw_dets = detector.detect(frame)
            tracks = tracker.track_detections([{"bbox": d.bbox, "confidence": d.confidence} for d in raw_dets])

            # Assign tracks to zones
            track_dicts = []
            for tr in tracks:
                x1, y1, x2, y2 = [int(v) for v in tr.bbox]
                cx, cy = int((x1 + x2) / 2), int((y1 + y2) / 2)
                track_dicts.append({
                    "track_id": tr.track_id,
                    "bbox": [x1, y1, x2, y2],
                    "confidence": tr.confidence,
                    "center": [cx, cy],
                })

            if zone_manager:
                track_dicts = zone_manager.assign_tracks(track_dicts)
                zone_counts = zone_manager.count_by_zone(track_dicts)
            else:
                zone_counts = {}

            # Scan for Weapons and Abnormal Activity
            weapon_events, weapon_dets = weapon_det.detect(
                frame, detector.model, camera_id=camera_id, tracks=track_dicts
            )
            fight_events = fight_det.detect(track_dicts, camera_id=camera_id)

            threat_count = len(weapon_dets) + len(fight_events)

            # Draw Zones
            if show_zones and zone_manager:
                frame = zone_manager.draw_zones(frame, zone_counts=zone_counts, alpha=0.25)

            # Draw Tracks
            if show_bboxes:
                for td in track_dicts:
                    x1, y1, x2, y2 = td["bbox"]
                    track_id = td["track_id"]
                    conf = td["confidence"]
                    assigned_zone = td.get("zone_id")
                    cx, cy = td["center"]

                    box_color = (190, 50, 130) if assigned_zone != "RESTRICTED" else (0, 0, 230)

                    # Bounding Box
                    cv2.rectangle(frame, (x1, y1), (x2, y2), box_color, 2)
                    # Centroid Dot
                    cv2.circle(frame, (cx, cy), 4, (0, 255, 0), -1)

                    tag = f"{track_id} ({int(conf * 100)}%)"
                    if assigned_zone:
                        tag += f" [{assigned_zone}]"

                    (tw, th), _ = cv2.getTextSize(tag, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                    cv2.rectangle(frame, (x1, max(0, y1 - th - 6)), (x1 + tw + 6, max(th + 6, y1)), box_color, -1)
                    cv2.putText(frame, tag, (x1 + 3, max(th, y1 - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

                # Draw Weapon BBoxes in Bright Red/Crimson
                for wd in weapon_dets:
                    wx1, wy1, wx2, wy2 = wd["bbox"]
                    threat_label = wd["threat_label"]
                    wconf = wd["confidence"]
                    w_color = (0, 0, 255)

                    cv2.rectangle(frame, (wx1, wy1), (wx2, wy2), w_color, 3)
                    w_tag = f"WEAPON: {threat_label} ({int(wconf * 100)}%)"
                    (wtw, wth), _ = cv2.getTextSize(w_tag, cv2.FONT_HERSHEY_SIMPLEX, 0.45, 1)
                    cv2.rectangle(frame, (wx1, max(0, wy1 - wth - 6)), (wx1 + wtw + 6, max(wth + 6, wy1)), w_color, -1)
                    cv2.putText(frame, w_tag, (wx1 + 3, max(wth, wy1 - 4)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)

            # Draw HUD
            frame = draw_hud(frame, camera_id, source_name, fps, len(track_dicts), threat_count=threat_count)

            # Encode frame to JPEG
            ret, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 75])
            if not ret:
                continue

            frame_bytes = buffer.tobytes()
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')

            time.sleep(0.03)

    except GeneratorExit:
        logger.info(f"Stream client disconnected from {camera_id}")
    finally:
        cap.release()


@router.get("/stream/{camera_id}")
def stream_camera_feed(
    camera_id: str,
    source: str = Query(default="sample", description="Source: '0' for laptop webcam, 'sample' for CCTV test video, or RTSP url"),
    show_zones: bool = Query(default=True, description="Overlay zone polygons"),
    show_bboxes: bool = Query(default=True, description="Overlay YOLO bounding boxes"),
    conf: float = Query(default=0.25, description="Confidence threshold"),
):
    """
    Live MJPEG video stream with real-time YOLOv8 person detection, weapon scanning, and ByteTrack.
    Can stream from Laptop Webcam (source=0), CCTV Video (source=sample), or Custom RTSP.
    """
    return StreamingResponse(
        generate_mjpeg_stream(
            source=source,
            camera_id=camera_id,
            show_zones=show_zones,
            show_bboxes=show_bboxes,
            conf_threshold=conf,
        ),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )


@router.get("/sources")
def get_available_sources():
    """Returns list of selectable video sources (CCTV Video, Laptop Webcam, RTSP)."""
    return {
        "sources": [
            {
                "id": "cctv_sample",
                "name": "CCTV Ingest Feed (Main Floor)",
                "source": "sample",
                "type": "video_file",
                "is_default": True,
                "description": "1080p retail CCTV sample video"
            },
            {
                "id": "laptop_webcam",
                "name": "Laptop Webcam (Device 0)",
                "source": "0",
                "type": "webcam",
                "is_default": False,
                "description": "Host machine device webcam"
            },
            {
                "id": "browser_webcam",
                "name": "Browser Camera (HTML5 MediaStream)",
                "source": "browser",
                "type": "browser_direct",
                "is_default": False,
                "description": "Direct browser webcam stream"
            },
            {
                "id": "custom_rtsp",
                "name": "RTSP / IP Camera Feed",
                "source": "rtsp",
                "type": "network_stream",
                "is_default": False,
                "description": "External RTSP stream"
            }
        ]
    }


@router.post("/process_browser_frame")
def process_browser_frame(
    payload: Dict[str, Any] = Body(...),
    db: Session = Depends(get_db)
):
    """
    Processes a single frame uploaded directly from a browser webcam.
    Runs:
    1. YOLO Person Detection & ByteTrack tracking.
    2. Weapon & Dangerous Object Detection.
    3. Physical Altercation / Fight Detection.
    4. Suspicious Theft / Loitering Detection.
    Returns detected tracks, threats, and zone occupancy.
    """
    detector, tracker, zone_manager, weapon_det, fight_det, theft_det, fall_det, abandoned_det = get_cv_components()

    image_b64 = payload.get("image", "")
    camera_id = payload.get("camera_id", "CAM-01")

    if "," in image_b64:
        image_b64 = image_b64.split(",")[1]

    try:
        img_bytes = base64.b64decode(image_b64)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if frame is None:
            raise ValueError("Failed to decode image")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image data: {str(e)}")

    h, w = frame.shape[:2]

    # 1. Direct YOLO Person Detection & Tracking
    raw_dets = detector.detect(frame)
    tracks = tracker.track_detections([{"bbox": d.bbox, "confidence": d.confidence} for d in raw_dets])

    track_dicts = []
    for tr in tracks:
        x1, y1, x2, y2 = [int(v) for v in tr.bbox]
        cx, cy = int((x1 + x2) / 2), int((y1 + y2) / 2)
        track_dicts.append({
            "track_id": tr.track_id,
            "bbox": [x1, y1, x2, y2],
            "confidence": round(tr.confidence, 3),
            "center": [cx, cy],
        })

    if zone_manager:
        track_dicts = zone_manager.assign_tracks(track_dicts)
        zone_counts = zone_manager.count_by_zone(track_dicts)
    else:
        zone_counts = {}

    # 2. Weapon & Dangerous Object Detection
    weapon_events, weapon_dets = weapon_det.detect(
        frame, detector.model, camera_id=camera_id, tracks=track_dicts
    )

    # 3. Fight / Physical Altercation Detection
    fight_events = fight_det.detect(track_dicts, camera_id=camera_id)

    # 4. Theft / Shoplifting Detection
    theft_events = theft_det.detect(track_dicts, camera_id=camera_id)

    # 5. Slip & Fall Medical Hazard Detection
    fall_events = fall_det.detect(track_dicts, camera_id=camera_id)

    # 6. Unattended Baggage / Abandoned Object Detection
    abandoned_events, abandoned_dets = abandoned_det.detect(
        frame, detector.model, camera_id=camera_id, tracks=track_dicts
    )

    all_abnormal_events = weapon_events + fight_events + theft_events + fall_events + abandoned_events

    # Persist critical emergency events to database
    for ab_evt in all_abnormal_events:
        try:
            existing = db.query(EventDB).filter(EventDB.event_id == ab_evt.event_id).first()
            if not existing:
                db_event = EventDB(
                    event_id=ab_evt.event_id,
                    event_type=ab_evt.event_type,
                    camera_id=camera_id,
                    zone_id=ab_evt.zone_id,
                    track_id=ab_evt.track_id,
                    timestamp=datetime.fromisoformat(ab_evt.timestamp),
                    severity=ab_evt.severity,
                    status=ab_evt.status,
                    description=ab_evt.description,
                    people_count=ab_evt.people_count or len(track_dicts),
                    details=ab_evt.details,
                )
                db.add(db_event)
                db.commit()
        except Exception as e:
            logger.error(f"Error persisting abnormal event: {e}")
            db.rollback()

    return {
        "camera_id": camera_id,
        "timestamp": datetime.now().isoformat(),
        "people_count": len(track_dicts),
        "tracks": track_dicts,
        "weapons": weapon_dets,
        "abandoned_objects": abandoned_dets,
        "abnormal_events": [evt.to_dict() for evt in all_abnormal_events],
        "threat_count": len(weapon_dets) + len(fight_events) + len(fall_events),
        "zone_counts": zone_counts,
        "frame_width": w,
        "frame_height": h,
    }
