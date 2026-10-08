"""API routers package."""
from .health import router as health_router
from .cameras import router as cameras_router
from .zones import router as zones_router
from .events import router as events_router

__all__ = ["health_router", "cameras_router", "zones_router", "events_router"]
