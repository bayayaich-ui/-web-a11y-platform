from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class ScanDetailResponse(BaseModel):
    id: UUID
    site_id: UUID
    status: str
    score_global: Optional[int]
    violations_critical: int
    violations_serious: int
    violations_moderate: int
    violations_minor: int
    pages_scanned: int
    started_at: Optional[datetime]
    finished_at: Optional[datetime]

    class Config:
        from_attributes = True


class ViolationResponse(BaseModel):
    id: UUID
    rule: str
    impact: str
    element: str
    message: str
    page_url: str
    priority: str

    class Config:
        from_attributes = True
