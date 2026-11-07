from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Configuration read from environment variables (or a local .env file)."""

    model_config = SettingsConfigDict(env_prefix="FF_", env_file=".env", extra="ignore")

    database_url: str = "postgresql+asyncpg://fourchette:fourchette@localhost:5432/fourchette"
    """Async SQLAlchemy URL (driver asyncpg)."""

    environment: Literal["development", "test", "production"] = "development"


@lru_cache
def get_settings() -> Settings:
    return Settings()
