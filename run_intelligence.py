#!/usr/bin/env python3
"""Run script for Phase 2 Store Intelligence & Alert Engine from Vision Telemetry."""

import argparse
import sys
import os
import json
import logging

from ml.intelligence.event_manager import EventManager
from ml.zones.zone_config import load_zones_from_file

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("run_intelligence")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Smart Store Safety & Operations Intelligence - Phase 2 Alert Engine"
    )
    parser.add_argument(
        "--input", "-i",
        type=str,
        default="outputs/vision_results.json",
        help="Path to Phase 1 vision telemetry JSON file"
    )
    parser.add_argument(
        "--output", "-o",
        type=str,
        default="outputs/events.json",
        help="Path to save generated structured events JSON"
    )
    parser.add_argument(
        "--config",
        type=str,
        default="ml/config/intelligence_config.json",
        help="Path to intelligence configuration JSON"
    )
    parser.add_argument(
        "--vision-config",
        type=str,
        default="ml/config/vision_config.json",
        help="Path to vision config (for zone metadata and types)"
    )
    return parser.parse_args()


def main():
    args = parse_args()

    print("=" * 70)
    print(" Smart Store Safety & Operations Intelligence - Phase 2 Alert Engine")
    print("=" * 70)

    # 1. Load telemetry input
    if not os.path.exists(args.input):
        logger.error(f"Input vision telemetry not found at: {args.input}")
        logger.info("Please run Phase 1 vision pipeline first (python run_vision.py).")
        sys.exit(1)

    with open(args.input, "r", encoding="utf-8") as f:
        try:
            telemetry_records = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in telemetry file: {e}")
            sys.exit(1)

    logger.info(f"Loaded {len(telemetry_records)} telemetry frames from '{args.input}'")

    # 2. Load intelligence config
    intel_config = {}
    if os.path.exists(args.config):
        with open(args.config, "r", encoding="utf-8") as f:
            intel_config = json.load(f)

    # 3. Load zone metadata
    zone_meta = {}
    if os.path.exists(args.vision_config):
        try:
            zones = load_zones_from_file(args.vision_config)
            zone_meta = {z.zone_id: {"name": z.name, "type": z.type, "color": z.color} for z in zones}
            logger.info(f"Loaded metadata for {len(zone_meta)} zones from '{args.vision_config}'")
        except Exception as e:
            logger.warning(f"Could not load zone metadata from '{args.vision_config}': {e}")

    # 4. Initialize Event Manager
    event_manager = EventManager(
        config=intel_config,
        zone_metadata=zone_meta,
        output_path=args.output
    )

    # 5. Process telemetry frames sequentially
    for record in telemetry_records:
        event_manager.process_telemetry(record)

    # 6. Save events
    saved_path = event_manager.save_events(args.output)
    all_events = event_manager.get_all_events()

    print("-" * 70)
    print(f" EVENT PROCESSING SUMMARY ({len(all_events)} Total Events Generated)")
    print("-" * 70)
    print(f"{'Event ID':<20} | {'Type':<22} | {'Zone':<12} | {'Severity':<8} | {'Status':<10}")
    print("-" * 70)
    for evt in all_events:
        print(f"{evt.event_id:<20} | {evt.event_type:<22} | {evt.zone_id:<12} | {evt.severity:<8} | {evt.status:<10}")
    print("=" * 70)
    print(f"Events successfully saved to: {saved_path}")


if __name__ == "__main__":
    main()
