from pathlib import Path
import json
import uuid
from decimal import Decimal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload

from app.api.auth.routes import get_current_user
from app.database.database import get_db
from app.database.models import Page, Report, Scan, Site
from app.schemas.report import ReportListResponse, ReportResponse
from app.services.pdf_report import build_report_pdf, store_report_pdf
from app.services.report_service import build_report_content

router = APIRouter(prefix="/api/reports", tags=["reports"])


def json_default(value):
    if isinstance(value, Decimal):
        return float(value)
    raise TypeError(f"Type non sérialisable dans le rapport: {type(value).__name__}")


def report_response(report: Report) -> ReportResponse:
    content = report.content
    return ReportResponse(
        id=report.id,
        scan_id=report.scan_id,
        site_id=content["site_id"],
        site_name=content["site_name"],
        website_url=content["website_url"],
        score=content.get("score"),
        total_violations=content["total"],
        scan_mode=content.get("scan_mode"),
        scan_date=content.get("scan_date"),
        generated_at=report.generated_at,
        content=content,
    )


@router.post("/scan/{scan_id}", response_model=ReportResponse, status_code=201)
def generate_report(scan_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        scan_uuid = UUID(scan_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Identifiant de scan invalide") from exc

    scan = (
        db.query(Scan)
        .join(Site)
        .options(joinedload(Scan.site), joinedload(Scan.pages).joinedload(Page.violations))
        .filter(Scan.id == scan_uuid, Site.user_id == user.id)
        .first()
    )
    if not scan:
        raise HTTPException(status_code=404, detail="Scan introuvable")
    if scan.status not in {"completed", "completed_with_errors"}:
        raise HTTPException(status_code=409, detail="Le rapport ne peut pas être généré avant la fin du scan.")

    existing = db.query(Report).filter(Report.scan_id == scan.id).first()
    if existing:
        content = json.loads(json.dumps(build_report_content(scan), default=json_default))
        existing.content = content
        existing.pdf_path = store_report_pdf(str(existing.id), build_report_pdf(content))
        db.commit()
        db.refresh(existing)
        return report_response(existing)

    content = json.loads(json.dumps(build_report_content(scan), default=json_default))
    report_id = uuid.uuid4()
    pdf_path = store_report_pdf(str(report_id), build_report_pdf(content))
    report = Report(id=report_id, scan_id=scan.id, pdf_path=pdf_path, content=content)
    db.add(report)
    db.commit()
    db.refresh(report)
    return report_response(report)


@router.get("", response_model=list[ReportListResponse])
def list_reports(db: Session = Depends(get_db), user=Depends(get_current_user)):
    reports = (
        db.query(Report)
        .join(Report.scan)
        .join(Scan.site)
        .filter(Site.user_id == user.id)
        .order_by(Report.generated_at.desc())
        .all()
    )
    return [report_response(report) for report in reports]


@router.get("/{report_id}", response_model=ReportResponse)
def get_report(report_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    try:
        report_uuid = UUID(report_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Identifiant de rapport invalide") from exc
    report = (
        db.query(Report)
        .join(Report.scan)
        .join(Scan.site)
        .filter(Report.id == report_uuid, Site.user_id == user.id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Rapport introuvable")
    return report_response(report)


@router.get("/{report_id}/download")
def download_report(report_id: str, db: Session = Depends(get_db), user=Depends(get_current_user)):
    report = (
        db.query(Report)
        .join(Report.scan)
        .join(Scan.site)
        .filter(Report.id == report_id, Site.user_id == user.id)
        .first()
    )
    if not report:
        raise HTTPException(status_code=404, detail="Rapport introuvable")
    path = Path(report.pdf_path)
    if not path.is_file():
        raise HTTPException(status_code=410, detail="Le fichier PDF du rapport est indisponible")
    return FileResponse(path, media_type="application/pdf", filename=f"accessiq-report-{report.id}.pdf")