"""Database session lifecycle dependency."""

from typing import Generator
from sqlalchemy.orm import Session
from .connection import SessionLocal


def get_db() -> Generator[Session, None, None]:
    """Yield database session and guarantee closure after request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
