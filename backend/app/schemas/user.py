"""User-facing schemas. A password hash never appears in any of them."""

from __future__ import annotations

from datetime import datetime
from typing import Annotated, Any, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

FullName = Annotated[str, Field(min_length=1, max_length=100, examples=["Ayesha Khan"])]
Password = Annotated[str, Field(min_length=8, max_length=128, examples=["S3cure-pass!"])]

Role = Literal["user", "admin"]


class UserCreate(BaseModel):
    """Signup payload. `role` is deliberately absent — it can never be set here."""

    model_config = ConfigDict(extra="forbid")

    full_name: FullName
    email: EmailStr
    password: Password

    @field_validator("full_name")
    @classmethod
    def _trim_name(cls, value: str) -> str:
        trimmed = value.strip()
        if not trimmed:
            raise ValueError("full_name must not be blank")
        if len(trimmed) > 100:
            raise ValueError("full_name must be at most 100 characters")
        return trimmed

    @field_validator("email")
    @classmethod
    def _normalise_email(cls, value: str) -> str:
        return value.strip().lower()


class UserPublic(BaseModel):
    """The only user representation that leaves the API."""

    id: str = Field(examples=["6711f0a2c3d4e5f60718293a"])
    full_name: str
    email: EmailStr
    role: Role
    created_at: datetime

    @classmethod
    def from_document(cls, document: dict[str, Any]) -> "UserPublic":
        return cls(
            id=str(document["_id"]),
            full_name=document["full_name"],
            email=document["email"],
            role=document.get("role", "user"),
            created_at=document["created_at"],
        )


class UserList(BaseModel):
    """Admin listing of accounts."""

    items: list[UserPublic]
    total: int


class RoleUpdate(BaseModel):
    """Admin-only role change."""

    model_config = ConfigDict(extra="forbid")

    role: Role = Field(examples=["admin"])
