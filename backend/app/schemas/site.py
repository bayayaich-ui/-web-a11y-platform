from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional, Literal


class SiteCreate(BaseModel):
    url: str
    name: str
    scan_mode: Optional[Literal["single_page", "full_site"]] = "single_page"


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

    class Config:
        from_attributes = True