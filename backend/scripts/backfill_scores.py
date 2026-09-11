"""Backfill `score_global` for completed scans that lack it.

Usage:
  python -m backend.scripts.backfill_scores

This script computes scores using `app.services.scoring.compute_score_from_scan`
and persists them. It is safe to re-run; only updates scans where
`status='completed'` and `score_global IS NULL`.
"""
import logging
from datetime import datetime

from app.database.database import SessionLocal
from app.database.models import Scan
from app.services.scoring import compute_score_from_scan


logger = logging.getLogger("backfill_scores")
logging.basicConfig(level=logging.INFO)


def backfill(limit: int | None = None) -> int:
    db = SessionLocal()
    try:
        query = db.query(Scan).filter(Scan.status == 'completed', Scan.score_global == None)
        if limit:
            scans = query.limit(limit).all()
        else:
            scans = query.all()

        updated = 0
        for s in scans:
            try:
                score = compute_score_from_scan(s)
                s.score_global = score
                s.finished_at = s.finished_at or datetime.utcnow()
                db.add(s)
                db.commit()
                updated += 1
                logger.info("Backfilled scan %s -> score=%s", s.id, score)
            except Exception:
                db.rollback()
                logger.exception("Failed to backfill scan %s", s.id)

        return updated
    finally:
        db.close()


if __name__ == '__main__':
    count = backfill()
    print(f"Backfilled {count} scans")
