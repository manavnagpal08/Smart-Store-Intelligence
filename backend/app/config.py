"""Backend configuration and environment settings."""

import os
from typing import List
from pydantic import ConfigDict
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Store Safety & Operations Intelligence API"
    VERSION: str = "3.0.0"
    API_V1_STR: str = "/api"

    # Database Configuration
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://root:password@localhost:3306/smart_store_db"
    )
    SQLITE_FALLBACK_URL: str = "sqlite:///./smart_store.db"

    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    DEBUG: bool = os.getenv("DEBUG", "true").lower() in ("1", "true", "yes")

    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "*"
    ]

    # Java Module Integration
    JAVA_BIN_DIR: str = os.getenv(
        "JAVA_BIN_DIR",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../java-module/bin"))
    )

    model_config = ConfigDict(case_sensitive=True)


settings = Settings()
