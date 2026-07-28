from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from uuid import UUID

from app.database.database import get_db
from app.database.models import Scan, Violation, Page
from app.schemas.scan import ScanDetailResponse, ViolationResponse

router = APIRouter(prefix="/api/scans", tags=["scans"])


@router.get("/{scan_id}", response_model=ScanDetailResponse)
def get_scan_detail(scan_id: str, db: Session = Depends(get_db)):
    """Get detailed information about a specific scan."""
    try:
        scan_uuid = UUID(scan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scan ID format")

    scan = db.query(Scan).filter(Scan.id == scan_uuid).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    return ScanDetailResponse(
        id=scan.id,
        site_id=scan.site_id,
        status=scan.status,
        score_global=scan.score_global,
        violations_critical=scan.violations_critical or 0,
        violations_serious=scan.violations_serious or 0,
        violations_moderate=scan.violations_moderate or 0,
        violations_minor=scan.violations_minor or 0,
        pages_scanned=scan.pages_scanned or 0,
        started_at=scan.started_at,
        finished_at=scan.finished_at,
    )


@router.get("/{scan_id}/violations", response_model=list[ViolationResponse])
def get_violations(scan_id: str, db: Session = Depends(get_db)):
    """Get all violations for a specific scan, grouped by page."""
    try:
        scan_uuid = UUID(scan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scan ID format")

    # Verify scan exists
    scan = db.query(Scan).filter(Scan.id == scan_uuid).first()
    if not scan:
        raise HTTPException(status_code=404, detail="Scan not found")

    violations = (
        db.query(Violation)
        .join(Page)
        .filter(Page.scan_id == scan_uuid)
        .all()
    )

    return [
        ViolationResponse(
            id=v.id,
            rule=v.rule,
            impact=v.impact,
            element=v.element or "",
            message=v.message or "",
            page_url=v.page.url,
            priority=v.priority or "mineur",
        )
        for v in violations
    ]
