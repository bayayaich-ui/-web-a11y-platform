import json
from datetime import datetime
from uuid import uuid4

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.database import models
from app.schemas.site import ScanCreate
from app.api.sites.routes import trigger_scan
from app.services.queue_consumer import handle_scan_completed, handle_scan_failed, persist_page_result


def test_trigger_scan_marks_running_as_soon_as_job_is_accepted(monkeypatch):
    engine = create_engine('sqlite:///:memory:')
    with engine.connect() as conn:
        conn.exec_driver_sql("CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, name TEXT, password_hash TEXT, created_at TEXT);")
        conn.exec_driver_sql("CREATE TABLE sites (id TEXT PRIMARY KEY, user_id TEXT, url TEXT, name TEXT, scan_mode TEXT, created_at TEXT);")
        conn.exec_driver_sql("CREATE TABLE scans (id TEXT PRIMARY KEY, site_id TEXT, status TEXT, max_pages INTEGER, max_depth INTEGER, scan_mode TEXT, pages_scanned INTEGER, pages_failed INTEGER, progress INTEGER, current_step TEXT, error TEXT, score_global INTEGER, violations_critical INTEGER, violations_serious INTEGER, violations_moderate INTEGER, violations_minor INTEGER, started_at TEXT, last_activity_at TEXT, finished_at TEXT);")
        conn.exec_driver_sql("CREATE TABLE pages (id TEXT PRIMARY KEY, scan_id TEXT, url TEXT, screenshot_url TEXT, scanned_at TEXT, status TEXT);")
        conn.exec_driver_sql("CREATE TABLE violations (id TEXT PRIMARY KEY, page_id TEXT, rule TEXT, wcag_criteria TEXT, impact TEXT, element TEXT, message TEXT, source_file TEXT, source_line INTEGER, source_column INTEGER, priority TEXT, diagnostic TEXT, created_at TEXT);")
    Session = sessionmaker(bind=engine)
    db = Session()

    user = models.User(id=uuid4(), email='scan-trigger@example.test', name='runner')
    db.add(user)
    db.flush()

    site = models.Site(id=uuid4(), user_id=user.id, url='http://example.test', name='site')
    db.add(site)
    db.commit()

    async def fake_publish_scan_job(*args, **kwargs):
        return None

    monkeypatch.setattr('app.api.sites.routes.publish_scan_job', fake_publish_scan_job)

    import asyncio
    asyncio.run(trigger_scan(str(site.id), ScanCreate(scan_mode='single_page', max_pages=1, max_depth=1), db, user))

    refreshed = db.query(models.Scan).filter(models.Scan.site_id == site.id).order_by(models.Scan.started_at.desc()).first()
    assert refreshed is not None
    assert refreshed.status == 'running'


def test_trigger_scan_persists_requested_scan_mode(monkeypatch):
    engine = create_engine('sqlite:///:memory:')
    with engine.connect() as conn:
        conn.exec_driver_sql("CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT, name TEXT, password_hash TEXT, created_at TEXT);")
        conn.exec_driver_sql("CREATE TABLE sites (id TEXT PRIMARY KEY, user_id TEXT, url TEXT, name TEXT, scan_mode TEXT, created_at TEXT);")
        conn.exec_driver_sql("CREATE TABLE scans (id TEXT PRIMARY KEY, site_id TEXT, status TEXT, max_pages INTEGER, max_depth INTEGER, scan_mode TEXT, pages_scanned INTEGER, pages_failed INTEGER, progress INTEGER, current_step TEXT, error TEXT, score_global INTEGER, violations_critical INTEGER, violations_serious INTEGER, violations_moderate INTEGER, violations_minor INTEGER, started_at TEXT, last_activity_at TEXT, finished_at TEXT);")
    Session = sessionmaker(bind=engine)
    db = Session()

    user = models.User(id=uuid4(), email='mode-scan@example.test', name='runner')
    db.add(user)
    db.flush()

    site = models.Site(id=uuid4(), user_id=user.id, url='http://example.test', name='site', scan_mode='full_site')
    db.add(site)
    db.commit()

    async def fake_publish_scan_job(*args, **kwargs):
        return None

    monkeypatch.setattr('app.api.sites.routes.publish_scan_job', fake_publish_scan_job)

    import asyncio
    asyncio.run(trigger_scan(str(site.id), ScanCreate(scan_mode='full_site', max_pages=10, max_depth=2), db, user))

    refreshed = db.query(models.Scan).filter(models.Scan.site_id == site.id).order_by(models.Scan.started_at.desc()).first()
    assert refreshed is not None
    assert refreshed.scan_mode == 'full_site'


def test_persist_page_result_sets_running_and_completed():
    engine = create_engine('sqlite:///:memory:')
    # create minimal tables manually (avoid PostgreSQL-specific types like ARRAY)
    with engine.connect() as conn:
        conn.exec_driver_sql("CREATE TABLE sites (id TEXT PRIMARY KEY, user_id TEXT, url TEXT, name TEXT, scan_mode TEXT, created_at TEXT);")
        conn.exec_driver_sql("CREATE TABLE scans (id TEXT PRIMARY KEY, site_id TEXT, status TEXT, max_pages INTEGER, max_depth INTEGER, scan_mode TEXT, pages_scanned INTEGER, pages_failed INTEGER, progress INTEGER, current_step TEXT, error TEXT, score_global INTEGER, violations_critical INTEGER, violations_serious INTEGER, violations_moderate INTEGER, violations_minor INTEGER, started_at TEXT, last_activity_at TEXT, finished_at TEXT);")
        conn.exec_driver_sql("CREATE TABLE pages (id TEXT PRIMARY KEY, scan_id TEXT, url TEXT, screenshot_url TEXT, scanned_at TEXT, status TEXT);")
        conn.exec_driver_sql("CREATE TABLE violations (id TEXT PRIMARY KEY, page_id TEXT, rule TEXT, impact TEXT, element TEXT, message TEXT, source_file TEXT, source_line INTEGER, source_column INTEGER, priority TEXT, diagnostic TEXT, created_at TEXT);")
    Session = sessionmaker(bind=engine)
    db = Session()

    # create minimal site and scan
    site = models.Site(id=uuid4(), user_id=uuid4(), url='http://example.test', name='t')
    db.add(site)
    db.flush()

    scan = models.Scan(id=uuid4(), site_id=site.id, status='pending', max_pages=1, pages_scanned=0)
    db.add(scan)
    db.commit()

    payload = {
        'scan_id': str(scan.id),
        'page_url': 'http://example.test/page1',
        'violations': [],
        'scanned_at': datetime.utcnow().isoformat() + 'Z'
    }

    persist_page_result(db, payload)
    db.commit()

    refreshed = db.query(models.Scan).filter(models.Scan.id == scan.id).first()
    assert refreshed.pages_scanned == 1
    assert refreshed.status == 'completed'
    assert refreshed.finished_at is not None


class DummyMessage:
    def __init__(self, payload):
        self.body = json.dumps(payload).encode('utf-8')

    def process(self):
        return self

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc, tb):
        return False


def test_handle_scan_completed_defers_completion_until_pages_are_persisted():
    engine = create_engine('sqlite:///:memory:')
    with engine.connect() as conn:
        conn.exec_driver_sql("CREATE TABLE sites (id TEXT PRIMARY KEY, user_id TEXT, url TEXT, name TEXT, scan_mode TEXT, created_at TEXT);")
        conn.exec_driver_sql("CREATE TABLE scans (id TEXT PRIMARY KEY, site_id TEXT, status TEXT, max_pages INTEGER, max_depth INTEGER, scan_mode TEXT, pages_scanned INTEGER, pages_failed INTEGER, progress INTEGER, current_step TEXT, error TEXT, score_global INTEGER, violations_critical INTEGER, violations_serious INTEGER, violations_moderate INTEGER, violations_minor INTEGER, started_at TEXT, last_activity_at TEXT, finished_at TEXT);")
        conn.exec_driver_sql("CREATE TABLE pages (id TEXT PRIMARY KEY, scan_id TEXT, url TEXT, screenshot_url TEXT, scanned_at TEXT, status TEXT);")
        conn.exec_driver_sql("CREATE TABLE violations (id TEXT PRIMARY KEY, page_id TEXT, rule TEXT, wcag_criteria TEXT, impact TEXT, element TEXT, message TEXT, source_file TEXT, source_line INTEGER, source_column INTEGER, priority TEXT, diagnostic TEXT, created_at TEXT);")
    Session = sessionmaker(bind=engine)
    db = Session()

    site = models.Site(id=uuid4(), user_id=uuid4(), url='http://example.test', name='t')
    db.add(site)
    db.flush()

    scan = models.Scan(
        id=uuid4(),
        site_id=site.id,
        status='running',
        max_pages=3,
        pages_scanned=1,
        violations_critical=1,
        score_global=95,
    )
    db.add(scan)
    db.commit()

    import asyncio
    asyncio.run(handle_scan_completed(DummyMessage({
        'scan_id': str(scan.id),
        'pages_processed': 3,
        'finished_at': datetime.utcnow().isoformat() + 'Z',
    })))

    refreshed = db.query(models.Scan).filter(models.Scan.id == scan.id).first()
    assert refreshed.status == 'running'
    assert refreshed.score_global == 95
    assert refreshed.pages_scanned == 1


def test_persist_page_result_recomputes_score_after_violations_are_added():
    engine = create_engine('sqlite:///:memory:')
    with engine.connect() as conn:
        conn.exec_driver_sql("CREATE TABLE sites (id TEXT PRIMARY KEY, user_id TEXT, url TEXT, name TEXT, scan_mode TEXT, created_at TEXT);")
        conn.exec_driver_sql("CREATE TABLE scans (id TEXT PRIMARY KEY, site_id TEXT, status TEXT, max_pages INTEGER, max_depth INTEGER, scan_mode TEXT, pages_scanned INTEGER, pages_failed INTEGER, progress INTEGER, current_step TEXT, error TEXT, score_global INTEGER, violations_critical INTEGER, violations_serious INTEGER, violations_moderate INTEGER, violations_minor INTEGER, started_at TEXT, last_activity_at TEXT, finished_at TEXT);")
        conn.exec_driver_sql("CREATE TABLE pages (id TEXT PRIMARY KEY, scan_id TEXT, url TEXT, screenshot_url TEXT, scanned_at TEXT, status TEXT);")
        conn.exec_driver_sql("CREATE TABLE violations (id TEXT PRIMARY KEY, page_id TEXT, rule TEXT, wcag_criteria TEXT, impact TEXT, element TEXT, message TEXT, source_file TEXT, source_line INTEGER, source_column INTEGER, priority TEXT, diagnostic TEXT, created_at TEXT);")
    Session = sessionmaker(bind=engine)
    db = Session()

    site = models.Site(id=uuid4(), user_id=uuid4(), url='http://example.test', name='t')
    db.add(site)
    db.flush()

    scan = models.Scan(id=uuid4(), site_id=site.id, status='pending', max_pages=1, pages_scanned=0)
    db.add(scan)
    db.commit()

    payload = {
        'scan_id': str(scan.id),
        'page_url': 'http://example.test/page1',
        'violations': [{
            'violation': {
                'rule': 'color-contrast',
                'impact': 'critical',
                'element': '<button>CTA</button>',
                'message': 'Contraste insuffisant',
                'wcag': ['1.4.3'],
            },
            'priority': 'bloquant',
            'diagnostic': {'summary': 'OK'},
        }],
        'scanned_at': datetime.utcnow().isoformat() + 'Z',
    }

    persist_page_result(db, payload)
    db.commit()

    refreshed = db.query(models.Scan).filter(models.Scan.id == scan.id).first()
    assert refreshed.violations_critical == 1
    assert refreshed.score_global == 95


def test_handle_scan_failed_marks_partial_results_as_completed_with_errors(monkeypatch):
    engine = create_engine('sqlite:///:memory:')
    with engine.connect() as conn:
        conn.exec_driver_sql("CREATE TABLE sites (id TEXT PRIMARY KEY, user_id TEXT, url TEXT, name TEXT, scan_mode TEXT, created_at TEXT);")
        conn.exec_driver_sql("CREATE TABLE scans (id TEXT PRIMARY KEY, site_id TEXT, status TEXT, max_pages INTEGER, max_depth INTEGER, scan_mode TEXT, pages_scanned INTEGER, pages_failed INTEGER, progress INTEGER, current_step TEXT, error TEXT, score_global INTEGER, violations_critical INTEGER, violations_serious INTEGER, violations_moderate INTEGER, violations_minor INTEGER, started_at TEXT, last_activity_at TEXT, finished_at TEXT);")
        conn.exec_driver_sql("CREATE TABLE pages (id TEXT PRIMARY KEY, scan_id TEXT, url TEXT, screenshot_url TEXT, scanned_at TEXT, status TEXT);")
        conn.exec_driver_sql("CREATE TABLE violations (id TEXT PRIMARY KEY, page_id TEXT, rule TEXT, wcag_criteria TEXT, impact TEXT, element TEXT, message TEXT, source_file TEXT, source_line INTEGER, source_column INTEGER, priority TEXT, diagnostic TEXT, created_at TEXT);")
    Session = sessionmaker(bind=engine)
    db = Session()

    site = models.Site(id=uuid4(), user_id=uuid4(), url='http://example.test', name='t')
    db.add(site)
    db.flush()

    scan = models.Scan(
        id=uuid4(),
        site_id=site.id,
        status='running',
        max_pages=10,
        pages_scanned=2,
        progress=60,
        current_step='page_analysis',
    )
    db.add(scan)
    db.commit()

    monkeypatch.setattr('app.services.queue_consumer.SessionLocal', lambda: db)

    import asyncio
    asyncio.run(handle_scan_failed(DummyMessage({
        'scan_id': str(scan.id),
        'failed_step': 'worker_timeout',
        'error': '429 Too Many Requests',
        'finished_at': datetime.utcnow().isoformat() + 'Z',
    })))

    refreshed = db.query(models.Scan).filter(models.Scan.id == scan.id).first()
    assert refreshed.status == 'completed_with_errors'
    assert refreshed.current_step == 'completed_with_errors'
    assert refreshed.progress == 100
    assert refreshed.pages_scanned == 2
