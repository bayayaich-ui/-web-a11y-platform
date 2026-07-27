import asyncio
import json
import os
import logging
from datetime import datetime
from uuid import UUID

import aio_pika
from aio_pika.abc import AbstractIncomingMessage

from app.database.database import SessionLocal
from app.database.models import Scan, Page, Violation

logger = logging.getLogger("queue_consumer")

SCAN_RESULTS_QUEUE = "scan.page_completed"

# Traduction de l'impact axe-core vers les compteurs de la table scans
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


def persist_page_result(db, payload: dict) -> None:
    scan_id = payload["scan_id"]

    scan = db.query(Scan).filter(Scan.id == UUID(scan_id)).first()
    if scan is None:
        # Le scan doit exister avant que le Scanner ne publie ses résultats
        # (créé par l'endpoint POST /api/sites, ticket B, pas encore fait)
        logger.warning("Scan introuvable en base pour scan_id=%s, résultat ignoré", scan_id)
        return

    page = Page(
        scan_id=scan.id,
        url=payload["page_url"],
        screenshot_url=payload.get("screenshot_key"),
        scanned_at=parse_datetime(payload.get("scanned_at")),
        status="success",
    )
    db.add(page)
    db.flush()  # nécessaire pour obtenir page.id avant de créer les violations liées

    for item in payload.get("violations", []):
        violation_brute = item.get("violation", {})
        diagnostic = item.get("diagnostic")
        priority = item.get("priority")

        violation = Violation(
            page_id=page.id,
            rule=violation_brute.get("rule"),
            wcag_criteria=violation_brute.get("wcag", []),
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


def parse_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        logger.warning("Date invalide reçue: %s", value)
        return None


async def start_consumer() -> None:
    rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://localhost:5672")

    connection = await aio_pika.connect_robust(rabbitmq_url)
    channel = await connection.channel()
    await channel.set_qos(prefetch_count=5)

    queue = await channel.declare_queue(SCAN_RESULTS_QUEUE, durable=True)

    logger.info("Consommateur en écoute sur la file %s", SCAN_RESULTS_QUEUE)
    await queue.consume(handle_page_result)

    # Garde la coroutine active indéfiniment (le consumer tourne en arrière-plan)
    await asyncio.Future()