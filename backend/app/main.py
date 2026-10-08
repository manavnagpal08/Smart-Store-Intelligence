"""FastAPI Application Entry Point for Smart Store Operations Intelligence."""

import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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


def seed_initial_metadata(db):
    """Seed initial cameras and zones if tables are empty."""
    try:
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
            db.add_all([cam1, cam2])
            db.commit()

        if db.query(ZoneDB).count() == 0:
            logger.info("Seeding default zone metadata...")
            zones = [
                ZoneDB(zone_id="ENTRANCE", zone_name="Store Entrance", zone_type="ENTRANCE", camera_id="CAM-01", description="Store entry vestibule"),
                ZoneDB(zone_id="AISLE-A", zone_name="Aisle A (Groceries)", zone_type="AISLE", camera_id="CAM-01", description="Dry foods & snacks aisle"),
                ZoneDB(zone_id="AISLE-B", zone_name="Aisle B (Beverages)", zone_type="AISLE", camera_id="CAM-01", description="Cold drinks & juices aisle"),
                ZoneDB(zone_id="CHECKOUT-01", zone_name="Checkout Lane 1", zone_type="CHECKOUT", camera_id="CAM-01", description="Primary cashier register"),
                ZoneDB(zone_id="RESTRICTED", zone_name="Backroom Storage", zone_type="RESTRICTED", camera_id="CAM-01", description="Staff-only inventory storage")
            ]
            db.add_all(zones)
            db.commit()
    except Exception as e:
        logger.warning(f"Error during metadata seed: {e}")
        db.rollback()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Create tables and seed initial data
    logger.info("Initializing database tables...")
    Base.metadata.create_all(bind=engine)
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
    description="Backend REST API for Smart Store Safety & Operations Intelligence (Phase 3)",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(cameras_router, prefix=settings.API_V1_STR)
app.include_router(zones_router, prefix=settings.API_V1_STR)
app.include_router(events_router, prefix=settings.API_V1_STR)
app.include_router(video_router, prefix=settings.API_V1_STR)


@app.get("/")
def root():
    return {
        "message": "Welcome to Smart Store Safety & Operations Intelligence API",
        "docs": "/docs",
        "redoc": "/redoc",
        "health": "/api/health"
    }
