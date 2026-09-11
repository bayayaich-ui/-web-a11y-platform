from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlalchemy.orm import Session
from uuid import UUID
from datetime import datetime
import json

from app.database.database import get_db
from app.database.models import Violation, Fix
from app.schemas.scan import ViolationResponse, ViolationDetailResponse, FixResponse
from app.services.queue_publisher import publish_scan_job
import aio_pika
import os
from app.database.database import SessionLocal
import asyncio
from fastapi import Request
from fastapi.responses import StreamingResponse

from app.database.models import Page, Scan, Site
from app.api.auth.routes import get_current_user
router = APIRouter(prefix="/api/violations", tags=["violations"])


@router.get("")
def list_all_violations(db: Session = Depends(get_db), user=Depends(get_current_user)):
    rows = (
        db.query(Violation, Page, Scan, Site)
        .join(Page, Violation.page_id == Page.id)
        .join(Scan, Page.scan_id == Scan.id)
        .join(Site, Scan.site_id == Site.id)
        .filter(Site.user_id == user.id)
        .order_by(Violation.created_at.desc())
        .all()
    )

    return [
        {
            "id": violation.id,
            "scan_id": scan.id,
            "site_id": site.id,
            "site_name": site.name or site.url,
            "rule": violation.rule,
            "impact": violation.impact,
            "element": violation.element or "",
            "message": violation.message or "",
            "page_url": page.url,
            "priority": violation.priority or "mineur",
            "source_file": violation.source_file,
            "source_line": violation.source_line,
            "source_column": violation.source_column,
            "has_diagnostic": bool(violation.diagnostic),
            "has_fix": bool(violation.fix),
        }
        for violation, page, scan, site in rows
    ]


@router.get("/{violation_id}", response_model=ViolationDetailResponse)
def get_violation_detail(violation_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        vid = UUID(violation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid violation ID")

    v = db.query(Violation).join(Violation.page).join(Page.scan).join(Scan.site).filter(Violation.id == vid, Site.user_id == user.id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Violation not found")

    fix = None
    # `v.fix` can be a relationship list or a single object depending on mapping.
    fix_obj = None
    if v.fix:
        if isinstance(v.fix, list):
            fix_obj = v.fix[0] if len(v.fix) > 0 else None
        else:
            fix_obj = v.fix

    if fix_obj:
        fix = FixResponse(
            id=fix_obj.id,
            method=fix_obj.method,
            code_diff=fix_obj.code_diff,
            applied_at=fix_obj.applied_at,
            status=fix_obj.status,
        )

    # Ensure `diagnostic` and `details` are dict or None to match schema
    diag_val = None
    if isinstance(v.diagnostic, dict):
        diag_val = v.diagnostic
    elif isinstance(v.diagnostic, str):
        diag_val = {"summary": v.diagnostic}

    details_val = None
    if isinstance(v.details, dict):
        details_val = v.details
    elif isinstance(v.details, str):
        try:
            details_val = json.loads(v.details)
        except Exception:
            details_val = {"raw": v.details}

    # Ensure WCAG criteria are surfaced to the API response under details.wcag.
    # Some runtimes store this as a JSON string (SQLite), while PostgreSQL can keep lists.
    try:
        if details_val is None:
            details_val = {}
        raw_wcag = getattr(v, 'wcag_criteria', None)
        if raw_wcag:
            if isinstance(raw_wcag, str):
                try:
                    raw_wcag = json.loads(raw_wcag)
                except (TypeError, ValueError):
                    raw_wcag = [raw_wcag]
            if isinstance(raw_wcag, (list, tuple)) and details_val.get('wcag') is None:
                details_val['wcag'] = list(raw_wcag)
    except Exception:
        pass

    return ViolationDetailResponse(
        id=v.id,
        rule=v.rule,
        impact=v.impact,
        element=v.element or "",
        message=v.message or "",
        page_url=v.page.url if v.page else "",
        priority=v.priority or "mineur",
        source_file=v.source_file,
        source_line=v.source_line,
        source_column=v.source_column,
        diagnostic=diag_val,
        details=details_val,
        fix=fix,
    )


@router.post("/{violation_id}/analyze", status_code=202)
async def request_violation_analysis(violation_id: str, background: BackgroundTasks, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        vid = UUID(violation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid violation ID")

    v = db.query(Violation).join(Violation.page).join(Page.scan).join(Scan.site).filter(Violation.id == vid, Site.user_id == user.id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Violation not found")

    # Build payload for analyzer: include the raw violation info so scanner-service can run LLM
    violation_brute = {
        "rule": v.rule,
        "impact": v.impact,
        "element": v.element,
        "html": v.element,
        "message": v.message,
        "wcag": v.wcag_criteria or [],
        "page_url": v.page.url if v.page else None,
        "sourceFile": v.source_file,
        "sourceLine": v.source_line,
        "sourceColumn": v.source_column,
        "details": v.details,
    }

    payload = {
        "violation_id": str(v.id),
        "scan_id": str(v.page.scan_id) if v.page else None,
        "page_url": v.page.url if v.page else None,
        "violation": violation_brute,
    }

    # Publish to RabbitMQ 'violation.analyze' queue
    rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://localhost:5672")

    async def _publish():
        conn = await aio_pika.connect_robust(rabbitmq_url)
        try:
            channel = await conn.channel()
            queue = await channel.declare_queue("violation.analyze", durable=True)
            await channel.default_exchange.publish(
                aio_pika.Message(body=json.dumps(payload).encode("utf-8"), delivery_mode=aio_pika.DeliveryMode.PERSISTENT),
                routing_key="violation.analyze",
            )
        finally:
            await conn.close()

    background.add_task(_publish)
    return {"status": "queued"}



@router.get("/{violation_id}/events")
async def get_violation_events(violation_id: str, request: Request, user=Depends(get_current_user)):
    try:
        vid = UUID(violation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid violation ID")

    async def event_generator():
        last_state = None
        while True:
            if await request.is_disconnected():
                break
            db = SessionLocal()
            try:
                v = db.query(Violation).join(Violation.page).join(Page.scan).join(Scan.site).filter(Violation.id == vid, Site.user_id == user.id).first()
                if not v:
                    await asyncio.sleep(1)
                    continue

                # normalize possible list relationship
                fix_obj = None
                if v.fix:
                    fix_obj = v.fix[0] if isinstance(v.fix, list) and len(v.fix) > 0 else (v.fix if not isinstance(v.fix, list) else None)

                data = {
                    'id': str(v.id),
                    'diagnostic': v.diagnostic,
                    'fix': {
                        'id': str(fix_obj.id) if fix_obj else None,
                        'method': fix_obj.method if fix_obj else None,
                        'code_diff': fix_obj.code_diff if fix_obj else None,
                        'status': fix_obj.status if fix_obj else None,
                    } if fix_obj else None,
                }

                if data != last_state:
                    last_state = data
                    yield f"event: violation_update\n"
                    yield f"data: {json.dumps(data)}\n\n"
            finally:
                db.close()
            await asyncio.sleep(1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.post("/{violation_id}/apply_fix")
def apply_fix(violation_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        vid = UUID(violation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid violation ID")

    v = db.query(Violation).join(Violation.page).join(Page.scan).join(Scan.site).filter(Violation.id == vid, Site.user_id == user.id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Violation not found")

    # Apply all fixes associated with this violation (handle list or single relationship)
    fixes = []
    if not v.fix:
        raise HTTPException(status_code=404, detail="No fix available to apply")
    if isinstance(v.fix, list):
        fixes = v.fix
    else:
        fixes = [v.fix]

    applied_ids = []
    for f in fixes:
        f.status = 'applied'
        f.applied_at = datetime.utcnow()
        db.add(f)
        applied_ids.append(str(f.id))

    db.commit()

    return {"status": "applied", "fix_ids": applied_ids}


@router.post("/{violation_id}/unapply_fix")
def unapply_fix(violation_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        vid = UUID(violation_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid violation ID")

    v = db.query(Violation).join(Violation.page).join(Page.scan).join(Scan.site).filter(Violation.id == vid, Site.user_id == user.id).first()
    if not v:
        raise HTTPException(status_code=404, detail="Violation not found")

    fixes = []
    if not v.fix:
        raise HTTPException(status_code=404, detail="No fix available to unapply")
    if isinstance(v.fix, list):
        fixes = v.fix
    else:
        fixes = [v.fix]

    unapplied_ids = []
    for f in fixes:
        f.status = 'suggested'
        f.applied_at = None
        db.add(f)
        unapplied_ids.append(str(f.id))

    db.commit()

    return {"status": "unapplied", "fix_ids": unapplied_ids}
