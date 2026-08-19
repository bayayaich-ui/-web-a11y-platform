from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import uuid4
from datetime import datetime

from app.database.database import get_db
from app.database.models import Site, Scan
from app.api.auth.routes import get_current_user
from app.schemas.site import SiteCreate, SiteResponse
from app.services.queue_publisher import publish_scan_job
from app.schemas.site import ScanCreate
from fastapi import HTTPException
from uuid import UUID as UUIDType

router = APIRouter(prefix="/api/sites", tags=["sites"])

@router.get("", response_model=list[SiteResponse])
def list_sites(db: Session = Depends(get_db), user=Depends(get_current_user)):
    sites = db.query(Site).filter(Site.user_id == user.id).order_by(Site.created_at.desc()).all()

    result = []
    for site in sites:
        last_scan = (
            db.query(Scan)
            .filter(Scan.site_id == site.id)
            .order_by(Scan.started_at.desc())
            .first()
        )
        result.append(
            SiteResponse(
                id=site.id,
                url=site.url,
                name=site.name,
                created_at=site.created_at,
                last_scan_score=last_scan.score_global if last_scan else None,
                last_scan_date=last_scan.finished_at if last_scan else None,
                last_scan_id=last_scan.id if last_scan else None,
            )
        )
    return result


@router.post("", response_model=SiteResponse, status_code=201)
async def create_site(payload: SiteCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    site = Site(id=uuid4(), user_id=user.id, url=payload.url, name=payload.name)
    db.add(site)
    db.flush()

    # Créer immédiatement un scan "pending" et déclencher le job —
    # si le mode demandé est single_page, limiter max_pages à 1
    scan_mode = getattr(payload, 'scan_mode', 'single_page')
    default_max = 1 if scan_mode == 'single_page' else 50
    scan = Scan(
        id=uuid4(),
        site_id=site.id,
        status="running",
        max_pages=default_max,
        max_depth=3,
        started_at=datetime.utcnow(),
    )
    db.add(scan)
    db.commit()
    db.refresh(site)

    # Transmettre le mode de scan (par défaut 'single_page' pour accélérer les tests)
    scan_mode = getattr(payload, 'scan_mode', 'single_page')
    await publish_scan_job(str(scan.id), str(site.id), site.url, max_pages=default_max, max_depth=3, scan_mode=scan_mode)

    return SiteResponse(
        id=site.id,
        url=site.url,
        name=site.name,
        created_at=site.created_at,
        last_scan_score=None,
        last_scan_date=None,
        last_scan_id=scan.id,
    )


@router.post("/{site_id}/scan", status_code=201)
async def trigger_scan(site_id: str, payload: ScanCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # Validate site exists
    try:
        site_uuid = UUIDType(site_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Identifiant de site invalide")

    site = db.query(Site).filter(Site.id == site_uuid).first()
    if site is None or site.user_id != user.id:
        raise HTTPException(status_code=404, detail="Site introuvable")

    # Create scan row
    scan_mode = payload.scan_mode or 'single_page'
    max_pages = 1 if scan_mode == 'single_page' else (payload.max_pages or 50)
    scan = Scan(
        id=uuid4(),
        site_id=site.id,
        status="running",
        max_pages=max_pages,
        max_depth=payload.max_depth or 3,
        started_at=datetime.utcnow(),
    )
    db.add(scan)
    db.commit()
    db.refresh(scan)

    # Publish job with requested mode
    await publish_scan_job(
        str(scan.id),
        str(site.id),
        site.url,
        max_pages=scan.max_pages or 50,
        max_depth=scan.max_depth or 3,
        scan_mode=scan_mode,
    )

    return {"scan_id": str(scan.id), "scan_mode": payload.scan_mode or 'single_page'}
