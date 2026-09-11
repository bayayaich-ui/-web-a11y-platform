from pydantic import BaseModel, field_validator
from uuid import UUID
from datetime import datetime
from typing import Optional, Literal


class SiteCreate(BaseModel):
    url: str
    name: str
    scan_mode: Optional[Literal["single_page", "full_site"]] = "single_page"

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Le nom du site est obligatoire.")
        if len(value) > 200:
            raise ValueError("Le nom du site ne peut pas dépasser 200 caractères.")
        return value


class SiteUpdate(BaseModel):
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Le nom du site est obligatoire.")
        if len(value) > 200:
            raise ValueError("Le nom du site ne peut pas dépasser 200 caractères.")
        return value


class ScanCreate(BaseModel):
    scan_mode: Optional[Literal["single_page", "full_site"]] = "single_page"
    max_pages: Optional[int] = 50
    max_depth: Optional[int] = 3


class SiteResponse(BaseModel):
    id: UUID
    url: str
    name: str
    created_at: datetime
    last_scan_score: Optional[float] = None
    last_scan_date: Optional[datetime] = None
    last_scan_id: Optional[UUID] = None
    last_scan_mode: Optional[Literal["single_page", "full_site"]] = None
    scan_mode: Optional[Literal["single_page", "full_site"]] = None

    class Config:
        from_attributes = True