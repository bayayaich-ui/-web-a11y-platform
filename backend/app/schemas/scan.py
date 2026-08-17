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
    max_pages: Optional[int]
    scan_mode: Optional[str]
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


class FixResponse(BaseModel):
    id: UUID
    method: Optional[str]
    code_diff: Optional[str]
    applied_at: Optional[datetime]
    status: Optional[str]

    class Config:
        from_attributes = True


class ViolationDetailResponse(BaseModel):
    id: UUID
    rule: str
    impact: str
    element: str
    message: str
    page_url: str
    priority: str
    diagnostic: Optional[dict]
    details: Optional[dict]
    fix: Optional[FixResponse]

    class Config:
        from_attributes = True
