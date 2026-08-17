from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
import asyncio
import json
from sqlalchemy.orm import Session
from uuid import UUID

from app.database.database import get_db
from app.database.models import Scan, Violation, Page
from app.schemas.scan import ScanDetailResponse, ViolationResponse
from app.database.database import SessionLocal

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
        max_pages=scan.max_pages,
        scan_mode=getattr(scan, 'scan_mode', None),
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


@router.get("/{scan_id}/events")
async def get_scan_events(scan_id: str, request: Request):
    try:
        scan_uuid = UUID(scan_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid scan ID format")

    async def event_generator():
        last_state = None
        while True:
            if await request.is_disconnected():
                break
            db = SessionLocal()
            try:
                scan = db.query(Scan).filter(Scan.id == scan_uuid).first()
                if not scan:
                    await asyncio.sleep(1)
                    continue

                data = {
                    'id': str(scan.id),
                    'status': scan.status,
                    'pages_scanned': scan.pages_scanned or 0,
                    'max_pages': scan.max_pages,
                    'scan_mode': getattr(scan, 'scan_mode', None),
                    'started_at': scan.started_at.isoformat() if scan.started_at else None,
                    'finished_at': scan.finished_at.isoformat() if scan.finished_at else None,
                }

                if data != last_state:
                    last_state = data
                    yield f"event: scan_update\n"
                    yield f"data: {json.dumps(data)}\n\n"
            finally:
                db.close()
            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")
