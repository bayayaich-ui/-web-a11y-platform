from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from uuid import uuid4
from datetime import datetime

from app.database.database import get_db
from app.database.models import Site, Scan, User
from app.schemas.site import SiteCreate, SiteResponse
from app.services.queue_publisher import publish_scan_job

router = APIRouter(prefix="/api/sites", tags=["sites"])

# Pas d'authentification pour l'instant : un utilisateur de démo unique
# sert de propriétaire par défaut, en attendant le ticket d'authentification
DEFAULT_USER_EMAIL = "demo@a11y-platform.local"


def get_or_create_default_user(db: Session) -> User:
    user = db.query(User).filter(User.email == DEFAULT_USER_EMAIL).first()
    if user is None:
        user = User(id=uuid4(), email=DEFAULT_USER_EMAIL, name="Utilisateur démo")
        db.add(user)
        db.flush()
    return user


@router.get("", response_model=list[SiteResponse])
def list_sites(db: Session = Depends(get_db)):
    sites = db.query(Site).order_by(Site.created_at.desc()).all()

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
async def create_site(payload: SiteCreate, db: Session = Depends(get_db)):
    user = get_or_create_default_user(db)

    site = Site(id=uuid4(), user_id=user.id, url=payload.url, name=payload.name)
    db.add(site)
    db.flush()

    # Créer immédiatement un scan "pending" et déclencher le job —
    # cohérent avec la description du dashboard : "le premier scan
    # démarre automatiquement une fois le site enregistré"
    scan = Scan(
        id=uuid4(),
        site_id=site.id,
        status="pending",
        max_pages=50,
        max_depth=3,
        started_at=datetime.utcnow(),
    )
    db.add(scan)
    db.commit()
    db.refresh(site)

    await publish_scan_job(str(scan.id), str(site.id), site.url, max_pages=50, max_depth=3)

    return SiteResponse(
        id=site.id,
        url=site.url,
        name=site.name,
        created_at=site.created_at,
        last_scan_score=None,
        last_scan_date=None,
        last_scan_id=scan.id,
    )
