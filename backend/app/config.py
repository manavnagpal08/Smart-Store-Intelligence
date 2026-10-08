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

    # CORS (Supports "*", comma-separated string, or JSON array)
    CORS_ORIGINS: Union[List[str], str] = ["*"]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            if isinstance(v, str):
                try:
                    return json.loads(v)
                except Exception:
                    return [v]
            return v
        return ["*"]

    # Java Module Integration
    JAVA_BIN_DIR: str = os.getenv(
        "JAVA_BIN_DIR",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../../java-module/bin"))
    )

    model_config = ConfigDict(case_sensitive=True, extra="ignore")


settings = Settings()
