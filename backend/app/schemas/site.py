from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class SiteCreate(BaseModel):
    url: str
    name: str


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