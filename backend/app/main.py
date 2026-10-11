"""FastAPI Application Entry Point for Smart Store Operations Intelligence."""

import os
import cv2
import numpy as np
import logging
from datetime import datetime, timedelta
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from sqlalchemy import text

from backend.app.config import settings
from backend.app.database.connection import Base, engine, SessionLocal
from backend.app.models.camera import CameraDB
from backend.app.models.zone import ZoneDB
from backend.app.models.event import EventDB, EventHistoryDB
from backend.app.api.health import router as health_router
from backend.app.api.cameras import router as cameras_router
from backend.app.api.zones import router as zones_router
from backend.app.api.events import router as events_router
from backend.app.api.video_stream import router as video_router

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("backend.main")

SNAPSHOTS_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../snapshots"))
os.makedirs(SNAPSHOTS_DIR, exist_ok=True)


def ensure_schema_upgrades(db_engine):
    """Ensure all required columns exist in SQLite database without manual migrations."""
    try:
        with db_engine.connect() as conn:
            # Check events table columns
            result = conn.execute(text("PRAGMA table_info(events)"))
            cols = [row[1] for row in result.fetchall()]
            
            if "snapshot_url" not in cols:
                logger.info("Adding missing column 'snapshot_url' to events table...")
                conn.execute(text("ALTER TABLE events ADD COLUMN snapshot_url VARCHAR(255)"))
                conn.commit()
                
            if "snapshot_base64" not in cols:
                logger.info("Adding missing column 'snapshot_base64' to events table...")
                conn.execute(text("ALTER TABLE events ADD COLUMN snapshot_base64 TEXT"))
                conn.commit()
    except Exception as e:
        logger.warning(f"Auto schema migration check: {e}")


def generate_sample_snapshot(filename: str, title: str, threat_type: str, camera_id: str):
    """Generate a realistic synthetic forensic snapshot image for demonstration."""
    try:
        file_path = os.path.join(SNAPSHOTS_DIR, filename)
        if os.path.exists(file_path):
            return f"/api/events/snapshots/{filename}"

        img = np.zeros((480, 640, 3), dtype=np.uint8)
        # Gradient background
        for y in range(480):
            img[y, :] = (20 + int(y * 0.05), 24 + int(y * 0.05), 32 + int(y * 0.05))

        # Grid lines (CCTV style)
        for y in range(0, 480, 40):
            cv2.line(img, (0, y), (640, y), (35, 42, 54), 1)
        for x in range(0, 640, 40):
            cv2.line(img, (x, 0), (x, 480), (35, 42, 54), 1)

        # Top Bar
        cv2.rectangle(img, (0, 0), (640, 36), (15, 23, 42), -1)
        cv2.circle(img, (20, 18), 6, (0, 0, 240), -1)
        cv2.putText(img, "REC", (32, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 255), 2)
        cv2.putText(img, f"CAM: {camera_id} | FORENSIC ARCHIVE", (80, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (220, 220, 220), 1)
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        cv2.putText(img, now_str, (450, 23), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (180, 180, 180), 1)

        # Simulated Bounding Boxes
        cv2.rectangle(img, (180, 120), (380, 420), (0, 0, 230), 2)
        cv2.rectangle(img, (180, 95), (380, 120), (0, 0, 230), -1)
        cv2.putText(img, f"ALERT: {threat_type} (94%)", (185, 112), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

        # Bottom Bar
        cv2.rectangle(img, (0, 445), (640, 480), (15, 23, 42), -1)
        cv2.putText(img, f"INCIDENT: {title} | SHA256-AUTHENTICATED", (15, 465), cv2.FONT_HERSHEY_SIMPLEX, 0.38, (0, 220, 255), 1)

        cv2.imwrite(file_path, img, [cv2.IMWRITE_JPEG_QUALITY, 85])
        return f"/api/events/snapshots/{filename}"
    except Exception as e:
        logger.error(f"Error generating sample snapshot: {e}")
        return ""


def seed_initial_metadata(db):
    """Seed initial cameras, zones, and realistic operational events for immediate out-of-the-box readiness."""
    try:
        now = datetime.now()

        # 1. Cameras
        if db.query(CameraDB).count() == 0:
            logger.info("Seeding default camera metadata...")
            cam1 = CameraDB(
                camera_id="CAM-01",
                camera_name="Main Store Overhead CCTV",
                location="Main Floor Ceiling",
                stream_source="datasets/sample/sample_cctv.mp4",
                status="ACTIVE"
            )
            cam2 = CameraDB(
                camera_id="CAM-02",
                camera_name="Checkout Register Camera",
                location="Front Registers",
                stream_source="rtsp://store-cam-02.local/stream",
                status="ACTIVE"
            )
            cam3 = CameraDB(
                camera_id="CAM-03",
                camera_name="Store Entrance Optical Scanner",
                location="Front Vestibule Gate",
                stream_source="rtsp://store-cam-03.local/stream",
                status="ACTIVE"
            )
            cam4 = CameraDB(
                camera_id="CAM-04",
                camera_name="Inventory Vault Camera",
                location="Backroom Storage Vault",
                stream_source="rtsp://store-cam-04.local/stream",
                status="ACTIVE"
            )
            db.add_all([cam1, cam2, cam3, cam4])
            db.commit()

        # 2. Zones
        if db.query(ZoneDB).count() == 0:
            logger.info("Seeding default zone metadata...")
            zones = [
                ZoneDB(zone_id="ENTRANCE", zone_name="Store Entrance", zone_type="ENTRANCE", camera_id="CAM-01", description="Store entry vestibule & turnstile zone"),
                ZoneDB(zone_id="AISLE-A", zone_name="Aisle A (Groceries & Snacks)", zone_type="AISLE", camera_id="CAM-01", description="Dry foods, snacks, and beverage aisle"),
                ZoneDB(zone_id="AISLE-B", zone_name="Aisle B (Cosmetics & High-Value)", zone_type="AISLE", camera_id="CAM-01", description="High-margin skincare, cosmetics, and lifestyle goods"),
                ZoneDB(zone_id="CHECKOUT-01", zone_name="Checkout Lane 1", zone_type="CHECKOUT", camera_id="CAM-01", description="Primary cashier register and POS counter"),
                ZoneDB(zone_id="RESTRICTED", zone_name="Backroom Storage Vault", zone_type="RESTRICTED", camera_id="CAM-01", description="Staff-only high value inventory storage")
            ]
            db.add_all(zones)
            db.commit()

        # 3. Operational & Security Events
        if db.query(EventDB).count() == 0:
            logger.info("Seeding realistic store operational events and threat snapshots...")
            
            snap1 = generate_sample_snapshot("SNAPSHOT_EVT-101.jpg", "RESTRICTED VAULT ENTRY", "UNAUTHORIZED PERSON", "CAM-01")
            snap2 = generate_sample_snapshot("SNAPSHOT_EVT-102.jpg", "CHECKOUT CONGESTION", "QUEUE OVERFLOW", "CAM-02")
            snap3 = generate_sample_snapshot("SNAPSHOT_EVT-103.jpg", "AISLE B SUSPICIOUS DWELL", "LOITERING", "CAM-01")
            snap4 = generate_sample_snapshot("SNAPSHOT_EVT-104.jpg", "ENTRANCE SPIKE", "CROWD SURGE", "CAM-03")
            snap5 = generate_sample_snapshot("SNAPSHOT_EVT-105.jpg", "AISLE A BOX OBSTRUCTION", "HAZARD OBSTRUCTION", "CAM-01")

            events = [
                EventDB(
                    event_id="EVT-101",
                    event_type="RESTRICTED_AREA_ENTRY",
                    camera_id="CAM-01",
                    zone_id="RESTRICTED",
                    track_id="TRK-008",
                    timestamp=now - timedelta(minutes=4),
                    severity="CRITICAL",
                    status="ACTIVE",
                    description="Unauthorized entry detected inside Staff-Only Inventory Storage Vault without staff RFID badge.",
                    people_count=1,
                    snapshot_url=snap1,
                    details={"confidence": 0.94, "snapshot_url": snap1, "auto_captured": True}
                ),
                EventDB(
                    event_id="EVT-102",
                    event_type="QUEUE_CONGESTION",
                    camera_id="CAM-02",
                    zone_id="CHECKOUT-01",
                    track_id="TRK-014",
                    timestamp=now - timedelta(minutes=12),
                    severity="MEDIUM",
                    status="ACTIVE",
                    description="Checkout register line exceeds 7 customers; average wait time estimated at 4.2 minutes.",
                    people_count=8,
                    snapshot_url=snap2,
                    details={"confidence": 0.91, "snapshot_url": snap2, "auto_captured": True}
                ),
                EventDB(
                    event_id="EVT-103",
                    event_type="THEFT_SUSPICIOUS",
                    camera_id="CAM-01",
                    zone_id="AISLE-B",
                    track_id="TRK-022",
                    timestamp=now - timedelta(minutes=25),
                    severity="HIGH",
                    status="ACTIVE",
                    description="Prolonged dwell time (>90s) with rapid shelf-reaching motion detected in Cosmetics & High-Value goods aisle.",
                    people_count=1,
                    snapshot_url=snap3,
                    details={"confidence": 0.88, "snapshot_url": snap3, "auto_captured": True}
                ),
                EventDB(
                    event_id="EVT-104",
                    event_type="CROWD_DENSITY",
                    camera_id="CAM-03",
                    zone_id="ENTRANCE",
                    track_id=None,
                    timestamp=now - timedelta(minutes=42),
                    severity="LOW",
                    status="ACKNOWLEDGED",
                    description="Store entrance pedestrian flow rate surged to 18 persons/min during midday promotional rush.",
                    people_count=14,
                    snapshot_url=snap4,
                    details={"confidence": 0.96, "snapshot_url": snap4}
                ),
                EventDB(
                    event_id="EVT-105",
                    event_type="AISLE_OBSTRUCTION",
                    camera_id="CAM-01",
                    zone_id="AISLE-A",
                    track_id="TRK-003",
                    timestamp=now - timedelta(hours=2),
                    severity="MEDIUM",
                    status="RESOLVED",
                    description="Restocking pallet left stationary in central walkway causing pedestrian cart diversion.",
                    people_count=3,
                    resolved_at=now - timedelta(hours=1, minutes=30),
                    snapshot_url=snap5,
                    details={"confidence": 0.92, "snapshot_url": snap5}
                ),
                EventDB(
                    event_id="EVT-106",
                    event_type="WEAPON_DETECTED",
                    camera_id="CAM-01",
                    zone_id="ENTRANCE",
                    track_id="TRK-091",
                    timestamp=now - timedelta(hours=5),
                    severity="CRITICAL",
                    status="RESOLVED",
                    description="Security drill test weapon object flagged by AI and immediately verified safe by on-site officer.",
                    people_count=1,
                    resolved_at=now - timedelta(hours=4, minutes=50),
                    snapshot_url=snap1,
                    details={"confidence": 0.98, "snapshot_url": snap1}
                )
            ]
            db.add_all(events)
            db.commit()

            # Seed Event History
            for evt in events:
                hist = EventHistoryDB(
                    event_id=evt.event_id,
                    old_status=None,
                    new_status=evt.status,
                    changed_at=evt.timestamp,
                    changed_by="SYSTEM"
                )
                db.add(hist)
            db.commit()
            logger.info("Successfully seeded operational events.")

    except Exception as e:
        logger.warning(f"Error during metadata seed: {e}")
        db.rollback()


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database tables and schema migrations...")
    Base.metadata.create_all(bind=engine)
    ensure_schema_upgrades(engine)
    
    db = SessionLocal()
    try:
        seed_initial_metadata(db)
    finally:
        db.close()
    yield
    logger.info("Shutting down backend service.")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend REST API for Smart Store Safety & Operations Intelligence",
    docs_url=None if settings.ENVIRONMENT.lower() == "production" else "/docs",
    redoc_url=None if settings.ENVIRONMENT.lower() == "production" else "/redoc",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key"],
)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.trusted_hosts_list)

# Register API Routers
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(cameras_router, prefix=settings.API_V1_STR)
app.include_router(zones_router, prefix=settings.API_V1_STR)
app.include_router(events_router, prefix=settings.API_V1_STR)
app.include_router(video_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    response = {
        "message": "Welcome to Smart Store Safety & Operations Intelligence API",
        "health": "/api/health"
    }
    if settings.ENVIRONMENT.lower() != "production":
        response.update({"docs": "/docs", "redoc": "/redoc"})
    return response
