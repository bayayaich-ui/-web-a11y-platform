from datetime import datetime
from uuid import UUID
import sys

from app.database.database import SessionLocal
from app.database.models import Fix

if len(sys.argv) < 2:
    print("Usage: python apply_fix.py <violation_id>")
    sys.exit(1)

violation_id = sys.argv[1]

db = SessionLocal()
try:
    fix = db.query(Fix).filter(Fix.violation_id == UUID(violation_id)).first()
    if not fix:
        print("No fix found for violation", violation_id)
        sys.exit(2)
    fix.status = 'applied'
    fix.applied_at = datetime.utcnow()
    db.add(fix)
    db.commit()
    print("Fix applied:", fix.id)
finally:
    db.close()
