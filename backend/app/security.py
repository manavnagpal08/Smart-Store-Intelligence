"""Authentication dependencies for protected API operations."""

import secrets
from fastapi import Header, HTTPException, status

from backend.app.config import settings


def require_api_key(x_api_key: str | None = Header(default=None)) -> None:
    """Require the configured API key; development may run without one."""
    if not settings.API_KEY and settings.ENVIRONMENT.lower() != "production":
        return
    if not x_api_key or not secrets.compare_digest(x_api_key, settings.API_KEY):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="A valid X-API-Key header is required.",
        )
