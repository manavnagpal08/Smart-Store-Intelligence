#!/usr/bin/env python3
"""Run script for Phase 1 Smart Retail Intelligence Vision Pipeline."""

import argparse
import sys
import os
import json
import logging

from ml.pipeline.vision_pipeline import VisionPipeline

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("run_vision")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Smart Store Safety & Operations Intelligence - Phase 1 Vision Pipeline"
    )
    parser.add_argument(
        "--source", "-s",
        type=str,
        default=None,
        help="Path to video file (.mp4, .avi, etc.), camera index (0, 1), or RTSP URL"
    )
    parser.add_argument(
        "--camera-id", "-c",
        type=str,
        default=None,
        help="Unique camera identifier (e.g. CAM-01)"
    )
    parser.add_argument(
        "--config",
        type=str,
        default="ml/config/vision_config.json",
        help="Path to central vision configuration JSON file"
    )
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="YOLO model weight file or name (e.g. yolov8n.pt)"
    )
    parser.add_argument(
        "--conf",
        type=float,
        default=None,
        help="Detection confidence threshold (0.0 to 1.0)"
    )
    parser.add_argument(
        "--tracker",
        type=str,
        default=None,
        help="Tracker type configuration (e.g. bytetrack.yaml, botsort.yaml)"
    )
    parser.add_argument(
        "--output-json", "-o",
        type=str,
        default=None,
        help="Path to write structured JSON results (default: outputs/vision_results.json)"
    )
    parser.add_argument(
        "--save-video",
        action="store_true",
        help="Save annotated video stream with bounding boxes and zone overlay"
    )
    parser.add_argument(
        "--output-video",
        type=str,
        default=None,
        help="Path to save output video (e.g. outputs/annotated_stream.mp4)"
    )
    parser.add_argument(
        "--frame-skip",
        type=int,
        default=None,
        help="Process every Nth frame (1 = process all frames)"
    )
    parser.add_argument(
        "--max-frames",
        type=int,
        default=None,
        help="Limit maximum number of frames to process"
    )
    parser.add_argument(
        "--show", "--display",
        action="store_true",
        dest="display",
        help="Display OpenCV visual monitoring window in real-time"
    )
    return parser.parse_args()


def main():
    args = parse_args()

    print("=" * 70)
    print(" Smart Store Safety & Operations Intelligence - Phase 1 Vision")
    print("=" * 70)

    # Validate config file
    if not os.path.exists(args.config):
        logger.error(f"Config file not found: {args.config}")
        sys.exit(1)

    try:
        pipeline = VisionPipeline(
            config_path=args.config,
            camera_id=args.camera_id,
            model_path=args.model,
            confidence_threshold=args.conf,
            tracker_type=args.tracker,
            output_json_path=args.output_json,
            output_video_path=args.output_video,
            frame_skip=args.frame_skip,
            display=args.display
        )

        source = args.source or pipeline.config.get("video_source")
        if not source:
            logger.error(
                "No video source specified. Please supply --source <path_to_video> or configure 'video_source' in config file."
            )
            sys.exit(1)

        summary = pipeline.process_video(
            video_source=source,
            save_video=args.save_video,
            output_video_path=args.output_video,
            output_json_path=args.output_json,
            max_frames=args.max_frames
        )

        print("-" * 70)
        print(" PIPELINE EXECUTION SUMMARY")
        print("-" * 70)
        for k, v in summary.items():
            print(f" {k:<20}: {v}")
        print("=" * 70)

    except FileNotFoundError as e:
        logger.error(f"File Error: {e}")
        sys.exit(1)
    except Exception as e:
        logger.exception(f"Pipeline Execution Failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
