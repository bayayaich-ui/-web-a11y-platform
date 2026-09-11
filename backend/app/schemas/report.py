from datetime import datetime
from typing import Any
from uuid import UUID

from pydantic import BaseModel


class ReportListResponse(BaseModel):
    id: UUID
    scan_id: UUID
    site_id: UUID
    site_name: str
    website_url: str
    score: int | None
    total_violations: int
    scan_mode: str | None
    scan_date: datetime | None
    generated_at: datetime


class ReportResponse(ReportListResponse):
    content: dict[str, Any]
