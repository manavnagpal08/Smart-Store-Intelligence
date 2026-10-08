#!/usr/bin/env python3
"""Import Phase 2 structured events into MySQL/Database with Java validation."""

import os
import sys
import json
import argparse
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from backend.app.database.connection import Base, engine, SessionLocal
from backend.app.schemas.event import EventCreate
from backend.app.services.event_service import EventService
from backend.app.services.java_validation_service import java_validator
from backend.app.main import seed_initial_metadata

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s"
)
logger = logging.getLogger("import_events")


def parse_args():
    parser = argparse.ArgumentParser(
        description="Import Phase 2 JSON events into database with Java validation"
    )
    parser.add_argument(
        "--file", "-f",
        type=str,
        default="outputs/events.json",
        help="Path to Phase 2 events JSON file"
    )
    return parser.parse_args()


def import_events(file_path: str):
    if not os.path.exists(file_path):
        logger.error(f"Events file not found at: {file_path}")
        sys.exit(1)

    with open(file_path, "r", encoding="utf-8") as f:
        try:
            events_data = json.load(f)
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON in {file_path}: {e}")
            sys.exit(1)

    if not isinstance(events_data, list):
        logger.error("Events JSON must contain an array of events.")
        sys.exit(1)

    logger.info(f"Loaded {len(events_data)} events from '{file_path}'")

    # Initialize tables and seed metadata
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_initial_metadata(db)

    imported_count = 0
    rejected_count = 0

    print("=" * 70)
    print(" INGESTING EVENTS INTO DATABASE WITH JAVA VALIDATION")
    print("=" * 70)

    try:
        for idx, item in enumerate(events_data, 1):
            try:
                # 1. Pydantic schema validation
                event_dto = EventCreate(**item)

                # 2. Ingest via EventService (which runs Java business validation)
                saved_event = EventService.create_or_update(db, event_dto)
                imported_count += 1
                print(f" [PASS] Event {saved_event.event_id} ({saved_event.event_type}) -> DB Inserted/Updated")

            except Exception as e:
                rejected_count += 1
                evt_id = item.get("event_id", f"INDEX_{idx}")
                print(f" [REJECTED] Event {evt_id}: {e}")

    finally:
        db.close()

    print("-" * 70)
    print(f" INGESTION SUMMARY: {imported_count} Imported / {rejected_count} Rejected")
    print("=" * 70)


if __name__ == "__main__":
    args = parse_args()
    import_events(args.file)
