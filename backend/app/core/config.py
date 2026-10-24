"""Application settings, loaded from environment variables / `.env`."""

from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# Value shipped in `.env.example`; must never be used outside dev.
EXAMPLE_JWT_SECRET = "change-me-to-a-long-random-string-at-least-32-chars"
MIN_JWT_SECRET_LENGTH = 32


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=False,
    )

    APP_ENV: Literal["dev", "test", "prod"] = "dev"
    APP_NAME: str = "LegalDocReader API"
    API_V1_PREFIX: str = "/api/v1"

    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "legaldocreader"

    JWT_SECRET: str = EXAMPLE_JWT_SECRET
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(default=60, ge=1)

    CORS_ORIGINS: str = "http://localhost:5173"

    # Argon2id work factors. Defaults match argon2-cffi's own, which sit above
    # the OWASP minimum (m=19 MiB, t=2, p=1). Exposed so a deployment can tune
    # cost to its hardware, and so the test suite can run at a low cost without
    # changing the algorithm or the verification path it exercises.
    ARGON2_TIME_COST: int = Field(default=3, ge=1)
    ARGON2_MEMORY_COST_KIB: int = Field(default=65536, ge=8192)
    ARGON2_PARALLELISM: int = Field(default=4, ge=1)

    @property
    def cors_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    @property
    def is_dev(self) -> bool:
        return self.APP_ENV == "dev"

    @property
    def is_prod(self) -> bool:
        return self.APP_ENV == "prod"

    @field_validator("MONGODB_URI")
    @classmethod
    def _uri_not_empty(cls, value: str) -> str:
        if not value.strip():
            raise ValueError("MONGODB_URI must not be empty")
        return value.strip()

    @model_validator(mode="after")
    def _enforce_strong_secret_outside_dev(self) -> "Settings":
        if self.APP_ENV == "dev":
            return self
        secret = self.JWT_SECRET or ""
        if not secret.strip():
            raise ValueError(f"JWT_SECRET must be set when APP_ENV={self.APP_ENV!r}")
        if secret == EXAMPLE_JWT_SECRET:
            raise ValueError(
                f"JWT_SECRET is still the example value; set a real secret when APP_ENV={self.APP_ENV!r}"
            )
        if len(secret) < MIN_JWT_SECRET_LENGTH:
            raise ValueError(
                f"JWT_SECRET must be at least {MIN_JWT_SECRET_LENGTH} characters "
                f"when APP_ENV={self.APP_ENV!r}"
            )
        return self


@lru_cache
def get_settings() -> Settings:
    """Cached settings instance (one read of the environment per process)."""
    return Settings()


settings = get_settings()
