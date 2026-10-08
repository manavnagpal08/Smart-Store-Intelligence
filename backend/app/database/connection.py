"""SQLAlchemy connection and database engine initialization."""

import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from backend.app.config import settings

logger = logging.getLogger("backend.database")

Base = declarative_base()

# Attempt MySQL connection, fallback to SQLite if unavailable
engine = None
SessionLocal = None


def init_db_engine():
    global engine, SessionLocal

    # Try configured DATABASE_URL (MySQL)
    try:
        if settings.DATABASE_URL.startswith("mysql"):
            test_engine = create_engine(
                settings.DATABASE_URL,
                pool_pre_ping=True,
                pool_recycle=3600,
                connect_args={"connect_timeout": 3}
            )
            # Test connection
            with test_engine.connect() as conn:
                pass
            engine = test_engine
            logger.info("Connected successfully to MySQL database.")
    except Exception as e:
        logger.warning(f"MySQL connection unavailable ({e}). Using local SQLite database engine for storage.")
        engine = create_engine(
            settings.SQLITE_FALLBACK_URL,
            connect_args={"check_same_thread": False}
        )

    if engine is None:
        if settings.DATABASE_URL.startswith("sqlite"):
            engine = create_engine(settings.DATABASE_URL, connect_args={"check_same_thread": False})
        else:
            engine = create_engine(settings.SQLITE_FALLBACK_URL, connect_args={"check_same_thread": False})

    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return engine


engine = init_db_engine()
