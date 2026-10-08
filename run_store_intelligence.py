#!/usr/bin/env python3
"""Unified End-to-End Runner: Phase 1 Vision + Phase 2 Store Intelligence."""

import argparse
import sys
import os
import time
import json
import logging
from datetime import datetime

import cv2
import numpy as np

from ml.pipeline.vision_pipeline import VisionPipeline
from ml.intelligence.event_manager import EventManager
from ml.intelligence.models import EventSeverity

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("store_intelligence")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Smart Store Safety & Operations Intelligence - Unified Vision & Alert Stream"
    )
    parser.add_argument(
        "--source", "-s",
        type=str,
        default=None,
        help="Path to video file (.mp4), camera device index, or RTSP stream"
    )
    parser.add_argument(
        "--camera-id", "-c",
        type=str,
        default="CAM-01",
        help="Camera identifier"
    )
    parser.add_argument(
        "--vision-config",
        type=str,
        default="ml/config/vision_config.json",
        help="Path to vision configuration JSON"
    )
    parser.add_argument(
        "--intel-config",
        type=str,
        default="ml/config/intelligence_config.json",
        help="Path to intelligence configuration JSON"
    )
    parser.add_argument(
        "--output-json",
        type=str,
        default="outputs/vision_results.json",
        help="Path for vision telemetry output"
    )
    parser.add_argument(
        "--output-events",
        type=str,
        default="outputs/events.json",
        help="Path for operational events output"
    )
    parser.add_argument(
        "--save-video",
        action="store_true",
        help="Save annotated video with alert banners"
    )
    parser.add_argument(
        "--output-video",
        type=str,
        default="outputs/annotated_stream.mp4",
        help="Path to save output video"
    )
    parser.add_argument(
        "--show", "--display",
        action="store_true",
        dest="display",
        help="Show live OpenCV monitoring window"
    )
    parser.add_argument(
        "--max-frames",
        type=int,
        default=None,
        help="Maximum frames to process"
    )
    return parser.parse_args()


def draw_active_alert_overlays(frame: np.ndarray, active_events: list) -> np.ndarray:
    """Draw clean alert notification cards on the frame when incidents are active."""
    if not active_events or frame is None:
        return frame

    h, w = frame.shape[:2]
    alert_y = 50  # Below top HUD bar

    sev_colors = {
        EventSeverity.LOW.value: (0, 200, 200),      # Yellow
        EventSeverity.MEDIUM.value: (0, 165, 255),   # Orange
        EventSeverity.HIGH.value: (0, 0, 255),       # Red
        EventSeverity.CRITICAL.value: (0, 0, 200)    # Deep Red
    }

    for evt in active_events[:3]:  # Display up to 3 concurrent active alerts
        color = sev_colors.get(evt.severity, (0, 0, 255))
        badge_text = f"! [{evt.severity}] {evt.event_type}: {evt.zone_id}"
        if evt.people_count is not None and evt.people_count > 1:
            badge_text += f" ({evt.people_count} people)"
        elif evt.track_id:
            badge_text += f" ({evt.track_id})"

        font = cv2.FONT_HERSHEY_SIMPLEX
        font_scale = 0.55
        font_thick = 2
        (tw, th), _ = cv2.getTextSize(badge_text, font, font_scale, font_thick)

        card_w = tw + 24
        card_h = th + 14
        card_x1 = max(10, w - card_w - 15)
        card_y1 = alert_y
        card_x2 = card_x1 + card_w
        card_y2 = card_y1 + card_h

        # Semi-transparent alert card background
        card_overlay = frame.copy()
        cv2.rectangle(card_overlay, (card_x1, card_y1), (card_x2, card_y2), (20, 20, 20), -1)
        cv2.addWeighted(card_overlay, 0.85, frame, 0.15, 0, frame)

        # Border and highlight bar
        cv2.rectangle(frame, (card_x1, card_y1), (card_x2, card_y2), color, 1, cv2.LINE_AA)
        cv2.rectangle(frame, (card_x1, card_y1), (card_x1 + 6, card_y2), color, -1)

        # Text
        cv2.putText(
            frame,
            badge_text,
            (card_x1 + 14, card_y1 + th + 4),
            font,
            font_scale,
            (255, 255, 255),
            1,
            cv2.LINE_AA
        )

        alert_y += card_h + 8

    return frame


def main():
    args = parse_args()

    print("=" * 75)
    print(" Smart Store Safety & Operations Intelligence - Unified Live Pipeline")
    print("=" * 75)

    # 1. Initialize Phase 1 Vision Pipeline
    pipeline = VisionPipeline(
        config_path=args.vision_config,
        camera_id=args.camera_id,
        output_json_path=args.output_json,
        output_video_path=args.output_video,
        display=False
    )

    # 2. Initialize Phase 2 Event Manager
    intel_cfg = {}
    if os.path.exists(args.intel_config):
        with open(args.intel_config, "r", encoding="utf-8") as f:
            intel_cfg = json.load(f)

    event_manager = EventManager(
        config=intel_cfg,
        zone_metadata={z.zone_id: {"name": z.name, "type": z.type, "color": z.color} for z in pipeline.zone_manager.zones},
        output_path=args.output_events
    )

    source = args.source or pipeline.config.get("video_source")
    if not source:
        logger.error("No video source provided. Use --source <video_path>")
        sys.exit(1)

    if isinstance(source, str) and not source.isdigit() and not source.startswith("rtsp://") and not source.startswith("http"):
        if not os.path.exists(source):
            raise FileNotFoundError(f"Video file not found at: '{source}'")

    cap = cv2.VideoCapture(int(source) if (isinstance(source, str) and source.isdigit()) else source)
    if not cap.isOpened():
        logger.error(f"Failed to open video source: {source}")
        sys.exit(1)

    fps = cap.get(cv2.CAP_PROP_FPS) or 25.0
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

    writer = None
    if args.save_video and args.output_video:
        os.makedirs(os.path.dirname(os.path.abspath(args.output_video)), exist_ok=True)
        fourcc = cv2.VideoWriter_fourcc(*"mp4v")
        writer = cv2.VideoWriter(args.output_video, fourcc, fps, (width, height))

    frame_idx = 0
    start_time = time.time()
    window_name = f"Smart Store Intelligence - {args.camera_id}"

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret or frame is None:
                break

            frame_idx += 1

            # Process Phase 1 Vision Frame
            annotated_frame, telemetry = pipeline.process_frame(
                frame=frame,
                frame_number=frame_idx
            )

            # Process Phase 2 Event Intelligence
            active_events = event_manager.process_telemetry(telemetry)

            # Draw Alert Badges on Video Overlay
            annotated_frame = draw_active_alert_overlays(annotated_frame, active_events)

            if writer is not None:
                writer.write(annotated_frame)

            if args.display:
                cv2.imshow(window_name, annotated_frame)
                if cv2.waitKey(1) & 0xFF == ord('q'):
                    break

            if args.max_frames and frame_idx >= args.max_frames:
                break

    finally:
        cap.release()
        if writer is not None:
            writer.release()
        if args.display:
            cv2.destroyAllWindows()

    elapsed = max(0.001, time.time() - start_time)
    pipeline.exporter.save(args.output_json)
    event_manager.save_events(args.output_events)

    print("-" * 75)
    print(f" PIPELINE FINISHED: Processed {frame_idx} frames in {elapsed:.2f}s ({frame_idx/elapsed:.2f} FPS)")
    print(f" Vision Telemetry saved : {args.output_json}")
    print(f" Store Events saved     : {args.output_events}")
    print(f" Total Incidents Logged : {len(event_manager.get_all_events())}")
    print("=" * 75)


if __name__ == "__main__":
    main()
