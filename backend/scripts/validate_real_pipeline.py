import os
import json
from uuid import uuid4
from datetime import datetime

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import models
from app.main import app
from app.services.queue_consumer import persist_page_result

os.environ.setdefault("DATABASE_URL", "postgresql://a11y_user:a11y_password@localhost:5432/a11y_platform")
os.environ.setdefault("RABBITMQ_URL", "amqp://a11y_user:a11y_password@localhost:5672")
os.environ.setdefault("GEMINI_API_KEY", "AQ.Ab8RN6KA_R6kL4Ti2UK7axkdw6keCsjcTPKQfGWXipCp7gWYrw")

engine = create_engine(os.environ["DATABASE_URL"])
Session = sessionmaker(bind=engine)

def build_payload(scan_id: str, *, with_violations: bool):
    if not with_violations:
        return {
            "scan_id": scan_id,
            "page_url": "http://example.test/clean-page",
            "violations": [],
            "scanned_at": datetime.utcnow().isoformat() + "Z",
        }
    return {
        "scan_id": scan_id,
        "page_url": "http://example.test/dirt-page",
        "violations": [
            {"violation": {"rule": "color-contrast", "impact": "critical", "element": "<button>CTA</button>", "message": "Contrast", "wcag": ["1.4.3"]}, "priority": "bloquant", "diagnostic": {"summary": "ok"}},
            {"violation": {"rule": "image-alt", "impact": "serious", "element": "<img>", "message": "Missing alt", "wcag": ["1.1.1"]}, "priority": "majeur", "diagnostic": {"summary": "ok"}},
            {"violation": {"rule": "label", "impact": "moderate", "element": "<input>", "message": "Label", "wcag": ["3.3.2"]}, "priority": "mineur", "diagnostic": None},
            {"violation": {"rule": "aria-valid-attr", "impact": "minor", "element": "<div>", "message": "ARIA", "wcag": ["4.1.2"]}, "priority": "mineur", "diagnostic": None},
            {"violation": {"rule": "heading-order", "impact": "critical", "element": "<h1>", "message": "Heading order", "wcag": ["2.4.6"]}, "priority": "bloquant", "diagnostic": {"summary": "ok"}},
        ],
        "scanned_at": datetime.utcnow().isoformat() + "Z",
    }


def run_case(label: str, with_violations: bool):
    db = Session()
    user = models.User(id=uuid4(), email=f"{label}@example.test", name="pipeline-user")
    db.add(user)
    db.flush()
    site = models.Site(id=uuid4(), user_id=user.id, url="http://example.test", name=f"site-{label}")
    db.add(site)
    db.flush()
    scan = models.Scan(
        id=uuid4(),
        site_id=site.id,
        status="running",
        max_pages=1,
        pages_scanned=0,
        violations_critical=0,
        violations_serious=0,
        violations_moderate=0,
        violations_minor=0,
    )
    db.add(scan)
    db.commit()

    payload = build_payload(str(scan.id), with_violations=with_violations)
    persist_page_result(db, payload)
    db.commit()

    scan_after = db.query(models.Scan).filter(models.Scan.id == scan.id).first()
    violations = db.query(models.Violation).join(models.Page).filter(models.Page.scan_id == scan.id).all()
    print(f"CASE={label} scan_status={scan_after.status} counters=({scan_after.violations_critical},{scan_after.violations_serious},{scan_after.violations_moderate},{scan_after.violations_minor}) score={scan_after.score_global} violation_count={len(violations)}")

    with TestClient(app) as client:
        resp = client.get(f"/api/scans/{scan.id}/violations")
        print(f"CASE={label} API_violations_len={len(resp.json())} status={resp.status_code}")
        detail = client.get(f"/api/scans/{scan.id}")
        print(f"CASE={label} API_score_global={detail.json()['score_global']} status={detail.status_code}")

    assert len(violations) == (5 if with_violations else 0)

    if with_violations:
        assert scan_after.score_global < 100
        assert len(violations) == 5
    else:
        assert scan_after.score_global == 100
        assert len(violations) == 0

    return scan.id


run_case("llm-failure-preserved", True)
run_case("no-violations", False)
print("VALIDATION_OK")
