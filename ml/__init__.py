"""ML and Intelligence Package for Smart Retail Operations Intelligence."""

# Phase 1 Vision Components
from ml.detection.person_detector import PersonDetector, Detection
from ml.tracking.person_tracker import PersonTracker, Track
from ml.zones.zone_config import Zone, load_zones_from_file
from ml.zones.zone_manager import ZoneManager
from ml.output.json_exporter import JSONExporter
from ml.pipeline.vision_pipeline import VisionPipeline

# Phase 2 Intelligence Components
from ml.intelligence.models import StoreEvent, EventType, EventStatus, EventSeverity
from ml.intelligence.severity_engine import SeverityEngine
from ml.intelligence.crowd_detector import CrowdDetector
from ml.intelligence.queue_detector import QueueDetector
from ml.intelligence.restricted_area_detector import RestrictedAreaDetector
from ml.intelligence.obstruction_detector import ObstructionDetector
from ml.intelligence.event_manager import EventManager

__all__ = [
    "PersonDetector",
    "Detection",
    "PersonTracker",
    "Track",
    "Zone",
    "load_zones_from_file",
    "ZoneManager",
    "JSONExporter",
    "VisionPipeline",
    "StoreEvent",
    "EventType",
    "EventStatus",
    "EventSeverity",
    "SeverityEngine",
    "CrowdDetector",
    "QueueDetector",
    "RestrictedAreaDetector",
    "ObstructionDetector",
    "EventManager"
]
