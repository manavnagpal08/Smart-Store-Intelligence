"""Backend configuration and environment settings."""

import os
import json
from typing import List, Union
from pydantic import ConfigDict, field_validator
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

    # CORS (Pure str to prevent pydantic-settings decode_complex_value error)
    CORS_ORIGINS: str = "*"

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS:
            return ["*"]
        val = str(self.CORS_ORIGINS).strip()
        if val == "*":
            return ["*"]
        if val.startswith("[") and val.endswith("]"):
            try:
                parsed = json.loads(val)
                if isinstance(parsed, list):
                    return parsed
            except Exception:
                pass
        return [i.strip() for i in val.split(",") if i.strip()]

    # Java Module Integration
    JAVA_BIN_DIR: str = os.getenv(
        "JAVA_BIN_DIR",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../java-module/bin"))
    )

    model_config = ConfigDict(case_sensitive=True, extra="ignore")


settings = Settings()
