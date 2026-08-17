import json
import os
import aio_pika

SCAN_JOBS_QUEUE = "scan.jobs"


async def publish_scan_job(scan_id: str, site_id: str, url: str, max_pages: int = 50, max_depth: int = 3, scan_mode: str = "single_page") -> None:
    rabbitmq_url = os.getenv("RABBITMQ_URL", "amqp://localhost:5672")
    connection = await aio_pika.connect_robust(rabbitmq_url)

    try:
        channel = await connection.channel()
        await channel.declare_queue(SCAN_JOBS_QUEUE, durable=True)

        payload = {
            "scan_id": scan_id,
            "site_id": site_id,
            "url": url,
            "max_pages": max_pages,
            "max_depth": max_depth,
            "scan_mode": scan_mode,
        }

        await channel.default_exchange.publish(
            aio_pika.Message(
                body=json.dumps(payload).encode("utf-8"),
                delivery_mode=aio_pika.DeliveryMode.PERSISTENT,
            ),
            routing_key=SCAN_JOBS_QUEUE,
        )
    finally:
        await connection.close()