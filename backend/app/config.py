"""Backend configuration and environment settings."""

import os
import json
from typing import List, Union
from pydantic import ConfigDict, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    PROJECT_NAME: str = "Smart Store Safety & Operations Intelligence API"
    VERSION: str = "3.0.0"
    API_V1_STR: str = "/api"

    # Database Configuration
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./smart_store.db"
    )
    SQLITE_FALLBACK_URL: str = "sqlite:///./smart_store.db"
    ALLOW_SQLITE_FALLBACK: bool = os.getenv("ALLOW_SQLITE_FALLBACK", "false").lower() in ("1", "true", "yes")

    # Server Configuration
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", 8000))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() in ("1", "true", "yes")
    SEED_DEMO_DATA: bool = os.getenv("SEED_DEMO_DATA", "false").lower() in ("1", "true", "yes")
    ENABLE_SAMPLE_VIDEO: bool = os.getenv("ENABLE_SAMPLE_VIDEO", "false").lower() in ("1", "true", "yes")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")
    API_KEY: str = os.getenv("API_KEY", "")
    TRUSTED_HOSTS: str = os.getenv("TRUSTED_HOSTS", "*")

    # CORS (Pure str to prevent pydantic-settings decode_complex_value error)
    CORS_ORIGINS: str = os.getenv("CORS_ORIGINS", "*")

    @property
    def cors_origins_list(self) -> List[str]:
        if not self.CORS_ORIGINS or "*" in str(self.CORS_ORIGINS):
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

    @property
    def trusted_hosts_list(self) -> List[str]:
        if not self.TRUSTED_HOSTS or "*" in self.TRUSTED_HOSTS:
            return ["*"]
        return [item.strip() for item in self.TRUSTED_HOSTS.split(",") if item.strip()]

    @model_validator(mode="after")
    def validate_production_security(self):
        if self.ENVIRONMENT.lower() == "production":
            if not self.API_KEY:
                raise ValueError("API_KEY is required when ENVIRONMENT=production")
            if self.CORS_ORIGINS.strip() == "*":
                raise ValueError("CORS_ORIGINS cannot be '*' in production")
        return self

    # Java Module Integration
    JAVA_BIN_DIR: str = os.getenv(
        "JAVA_BIN_DIR",
        os.path.abspath(os.path.join(os.path.dirname(__file__), "../../java-module/bin"))
    )

    model_config = ConfigDict(case_sensitive=True, extra="ignore")


settings = Settings()
