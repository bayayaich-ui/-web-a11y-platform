import asyncio
import json
import os
import logging
from datetime import datetime
from uuid import UUID

import aio_pika
from aio_pika.abc import AbstractIncomingMessage

from app.database.database import SessionLocal
from app.database.models import Scan, Page, Violation, Fix
from app.services.scoring import compute_score_from_scan

logger = logging.getLogger("queue_consumer")

SCAN_RESULTS_QUEUE = "scan.page_completed"
SCAN_COMPLETED_QUEUE = "scan.completed"
VIOLATION_ANALYSIS_COMPLETED_QUEUE = "violation.analysis.completed"


def normalize_wcag_criteria(value):
    """Return a database-safe WCAG value for the active SQL dialect.

    PostgreSQL arrays are supported by the model, but SQLite tests/in-memory DBs
    cannot bind Python lists to an ARRAY column. We preserve native list values on
    Postgres and serialize to JSON on SQLite so the data stays valid everywhere.
    """
    if value is None:
        return None

    if isinstance(value, str):
        try:
            parsed = json.loads(value)
        except (TypeError, ValueError):
            return value
        if isinstance(parsed, list):
            return parsed
        return value

    if isinstance(value, (list, tuple)):
        return list(value)

    return value


def db_safe_wcag_criteria(value, db=None):
    normalized = normalize_wcag_criteria(value)
    if not isinstance(normalized, (list, tuple)):
        return normalized

    values = list(normalized)
    bind = getattr(db, "bind", None)
    if bind is None and db is not None:
        try:
            bind = db.get_bind()
        except Exception:
            bind = None

    dialect = getattr(bind, "dialect", None) if bind is not None else None
    dialect_name = getattr(dialect, "name", None)

    if dialect_name == "sqlite":
        return json.dumps(values)

    if dialect_name is None:
        # protect in-memory SQLite tests or unbound contexts by defaulting to JSON text
        return json.dumps(values)

    return values


IMPACT_TO_COUNTER_FIELD = {
    "critical": "violations_critical",
    "serious": "violations_serious",
    "moderate": "violations_moderate",
    "minor": "violations_minor",
}

async def handle_page_result(message: AbstractIncomingMessage) -> None:
    async with message.process():
        try:
            payload = json.loads(message.body.decode("utf-8"))
        except json.JSONDecodeError:
            logger.error("Message reçu non-JSON, ignoré : %s", message.body[:200])
            return

        db = SessionLocal()
        try:
            persist_page_result(db, payload)
            db.commit()
            logger.info(
                "Page persistée : scan_id=%s page_url=%s (%d violations)",
                payload.get("scan_id"),
                payload.get("page_url"),
                len(payload.get("violations", [])),
            )
        except Exception:
            db.rollback()
            logger.exception("Échec de la persistance du résultat de page")
            raise
        finally:
            db.close()


async def handle_scan_completed(message: AbstractIncomingMessage) -> None:
    async with message.process():
        try:
            payload = json.loads(message.body.decode("utf-8"))
        except json.JSONDecodeError:
            logger.error("Message scan.completed non-JSON, ignoré : %s", message.body[:200])
            return

        db = SessionLocal()
        try:
            scan_id = payload.get("scan_id")
            pages_processed = payload.get("pages_processed")
            finished_at = payload.get("finished_at")

            scan = db.query(Scan).filter(Scan.id == UUID(scan_id)).first()
            if scan is None:
                logger.warning("Scan introuvable pour scan.completed scan_id=%s", scan_id)
                return

            persisted_pages = scan.pages_scanned or 0
            target_pages = scan.max_pages or 0

            # If the scan.completed event is stale, do not force a final state before the
            # persisted page results have actually reached the completion threshold.
            if isinstance(pages_processed, int) and pages_processed > persisted_pages:
                scan.pages_scanned = max(persisted_pages, pages_processed)

            if target_pages and persisted_pages < target_pages:
                logger.info(
                    "scan.completed ignoré tant que les résultats persistés ne sont pas à %s/%s pages pour scan_id=%s",
                    persisted_pages,
                    target_pages,
                    scan_id,
                )
                db.rollback()
                return

            # Only finalize once the persisted store is consistent with the configured threshold.
            scan.status = 'completed'
            scan.finished_at = parse_datetime(finished_at) or datetime.utcnow()
            try:
                scan.score_global = compute_score_from_scan(scan)
            except Exception:
                logger.exception("Erreur lors du calcul du score final (scan.completed)")

            db.commit()
            logger.info("Scan marked completed via scan.completed: %s", scan_id)
        except Exception:
            db.rollback()
            logger.exception("Échec du traitement de scan.completed")
            raise
        finally:
            db.close()

def persist_page_result(db, payload: dict) -> None:
    scan_id = payload["scan_id"]

    scan = db.query(Scan).filter(Scan.id == UUID(scan_id)).first()
    if scan is None:
        logger.warning("Scan introuvable en base pour scan_id=%s, résultat ignoré", scan_id)
        return

    # If the scan was pending, mark it as running when first page result arrives
    if scan.status in (None, 'pending'):
        scan.status = 'running'

    page = Page(
        scan_id=scan.id,
        url=payload["page_url"],
        screenshot_url=payload.get("screenshot_key"),
        scanned_at=parse_datetime(payload.get("scanned_at")),
        status="success",
    )
    db.add(page)
    db.flush()

    for item in payload.get("violations", []):
        violation_brute = item.get("violation", {})
        diagnostic = item.get("diagnostic")
        priority = item.get("priority")
        wcag_values = db_safe_wcag_criteria(violation_brute.get("wcag") or [], db=db)

        violation = Violation(
            page_id=page.id,
            rule=violation_brute.get("rule"),
            wcag_criteria=wcag_values,
            impact=violation_brute.get("impact"),
            element=violation_brute.get("element"),
            message=violation_brute.get("message"),
            priority=priority,
            diagnostic=diagnostic,
        )
        db.add(violation)

        counter_field = IMPACT_TO_COUNTER_FIELD.get(violation_brute.get("impact"))
        if counter_field:
            current = getattr(scan, counter_field) or 0
            setattr(scan, counter_field, current + 1)

    scan.pages_scanned = (scan.pages_scanned or 0) + 1

    # If we've reached the configured max_pages, mark the scan as finished
    try:
        if scan.max_pages and scan.pages_scanned >= scan.max_pages:
            scan.status = 'completed'
            scan.finished_at = datetime.utcnow()
            # compute final score when scan completes
            try:
                scan.score_global = compute_score_from_scan(scan)
            except Exception:
                logger.exception("Erreur lors du calcul du score final")
    except Exception:
        # defensive: ignore if attributes missing
        pass

def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        logger.warning("Date invalide reçue: %s", value)
        return None
    


# scoring is implemented in app.services.scoring

async def start_consumer() -> None:
    rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://localhost:5672")

    connection = await aio_pika.connect_robust(rabbitmq_url)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=5)

    queue = await channel.declare_queue(SCAN_RESULTS_QUEUE, durable=True)

    # listen for page results
    logger.info("Consommateur en écoute sur la file %s", SCAN_RESULTS_QUEUE)
    await queue.consume(handle_page_result)

    # also listen for scan.completed events published by scanner
    completed_queue = await channel.declare_queue(SCAN_COMPLETED_QUEUE, durable=True)
    logger.info("Consommateur en écoute sur la file %s", SCAN_COMPLETED_QUEUE)
    await completed_queue.consume(handle_scan_completed)

    # Listen for results of on-demand violation analysis
    analysis_queue = await channel.declare_queue(VIOLATION_ANALYSIS_COMPLETED_QUEUE, durable=True)
    logger.info("Consommateur en écoute sur la file %s", VIOLATION_ANALYSIS_COMPLETED_QUEUE)
    await analysis_queue.consume(handle_violation_analysis)

    await asyncio.Future()


async def handle_violation_analysis(message: AbstractIncomingMessage) -> None:
    async with message.process():
        try:
            payload = json.loads(message.body.decode("utf-8"))
        except json.JSONDecodeError:
            logger.error("Message violation.analysis.completed non-JSON, ignoré : %s", message.body[:200])
            return

        violation_id = payload.get("violation_id")
        diagnostic = payload.get("diagnostic")
        correctif = payload.get("correctif")

        # If the analyzer returned an explanation inside the `correctif`,
        # prefer that for the Violation.diagnostic field so the UI can show
        # the LLM explanation even when the top-level `diagnostic` is absent.
        if not diagnostic and isinstance(correctif, dict):
            for k in ("explication", "explication_simple", "explanation", "reason", "why"):
                if correctif.get(k):
                    diagnostic = correctif.get(k)
                    break

        if not violation_id:
            logger.warning("violation.analysis.completed sans violation_id : %s", payload)
            return

        db = SessionLocal()
        try:
            v = db.query(Violation).filter(Violation.id == UUID(violation_id)).first()
            if not v:
                logger.warning("Violation introuvable pour analysis result: %s", violation_id)
                return

            # Build a structured diagnostic object prioritizing explicit fields
            # from the correctif payload so the frontend has predictable keys.
            diag_obj = None
            if isinstance(correctif, dict):
                summary = correctif.get('explication') or correctif.get('explication_simple') or diagnostic
                impact_txt = correctif.get('impact') or (diagnostic.get('impact') if isinstance(diagnostic, dict) else None)
                offending = correctif.get('code_original') or correctif.get('offending_code') or correctif.get('html') or v.element
                correction = correctif.get('code_corrige') or correctif.get('correction') or None
                correction_explanation = correctif.get('explication') or correctif.get('explanation') or None

                diag_obj = {
                    'summary': summary,
                    'impact': impact_txt,
                    'offending_code': offending,
                    'correction': correction,
                    'correction_explanation': correction_explanation,
                }
                v.diagnostic = diag_obj

                # Persist WCAG references when provided by the correctif or diagnostic
                wcag_list = None
                for wc_key in ("wcag", "wcag_refs", "wcag_reference", "wcag_criteria"):
                    if correctif.get(wc_key) is not None:
                        wcag_list = correctif.get(wc_key)
                        break
                # if diagnostic is a dict, it may contain wcag too
                if wcag_list is None and isinstance(diagnostic, dict) and diagnostic.get("wcag") is not None:
                    wcag_list = diagnostic.get("wcag")
                # Normalize to list if single string
                if wcag_list and isinstance(wcag_list, str):
                    wcag_list = [wcag_list]
                if wcag_list:
                    try:
                        v.wcag_criteria = db_safe_wcag_criteria(wcag_list, db=db)
                    except Exception:
                        logger.exception("Impossible de persister wcag_criteria pour %s: %s", violation_id, wcag_list)

                # Persist any detailed structured payload into `details` if provided
                for dk in ("details", "why_details", "explanation_detail"):
                    if correctif.get(dk) is not None:
                        v.details = correctif.get(dk)
                        break
            else:
                # fallback: preserve diagnostic as-is (string or dict)
                v.diagnostic = diagnostic
            # persist fix if provided
            if correctif:
                logger.info("Received correctif payload for violation %s: %s", violation_id, json.dumps(correctif)[:1000])
                # Normalize method (DB constraint expects specific values)
                # Accept multiple incoming keys and synonyms, fall back to safe default.
                raw_t = None
                for k in ("type_correctif", "type", "method", "type_correct"):
                    if correctif.get(k) is not None:
                        raw_t = correctif.get(k)
                        break
                method = None
                if isinstance(raw_t, str):
                    rt = raw_t.strip().lower()
                    if rt in ("automatique", "automatic", "auto"):
                        method = "widget_patch"
                    elif rt in ("manuel", "manual", "manuelle"):
                        method = "pull_request"
                    elif rt in ("widget_patch", "pull_request"):
                        method = rt
                # final fallback
                if method is None:
                    method = "widget_patch"

                # Build a safe code_diff: prefer explicit patch or code_diff fields,
                # otherwise store original/corrected pair as JSON string.
                code_diff_value = None
                if correctif.get("patch"):
                    try:
                        code_diff_value = json.dumps(correctif.get("patch"))
                    except Exception:
                        code_diff_value = str(correctif.get("patch"))
                elif correctif.get("code_diff"):
                    code_diff_value = correctif.get("code_diff")
                elif correctif.get("code_corrige") or correctif.get("code_corrige") is not None:
                    # fallback: store original and corrected
                    pair = {
                        "original": correctif.get("code_original") or correctif.get("code_original"),
                        "corrected": correctif.get("code_corrige") or correctif.get("code_corrige"),
                    }
                    code_diff_value = json.dumps(pair)

                fix = Fix(
                    violation_id=v.id,
                    method=method,
                    code_diff=code_diff_value,
                    status="suggested",
                )
                db.add(fix)
            db.commit()
            logger.info("Violation %s mise à jour avec le diagnostic IA", violation_id)
        except Exception:
            db.rollback()
            logger.exception("Erreur lors de la persistance du résultat d'analyse de violation")
            raise
        finally:
            db.close()
