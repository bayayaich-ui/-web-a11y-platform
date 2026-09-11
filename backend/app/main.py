import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import ALLOWED_ORIGINS

from app.services.queue_consumer import start_consumer, recover_stale_scans_once
from app.api.sites.routes import router as sites_router
from app.api.scans.routes import router as scans_router
from app.api.auth.routes import router as auth_router
from app.api.violations.routes import router as violations_router
from app.api.reports.routes import router as reports_router

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async def run_queue_consumer():
        while True:
            try:
                await start_consumer()
            except asyncio.CancelledError:
                raise
            except Exception:
                logging.exception("Le consumer RabbitMQ est indisponible; nouvelle tentative dans 5 secondes")
                await asyncio.sleep(5)

    consumer_task = asyncio.create_task(run_queue_consumer())
    async def recover_stale_scans():
        while True:
            await asyncio.to_thread(recover_stale_scans_once)
            await asyncio.sleep(30)

    recovery_task = asyncio.create_task(recover_stale_scans())
    yield
    consumer_task.cancel()
    recovery_task.cancel()


app = FastAPI(
    title="Web Accessibility Platform API",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS origins from environment (comma-separated). Default allows localhost:3000, 3001, 3002 for development.
# This covers cases where the Next dev server runs on different ports to avoid 'Failed to fetch' from the browser.
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(sites_router)
app.include_router(scans_router)
app.include_router(auth_router)
app.include_router(violations_router)
app.include_router(reports_router)


@app.get("/")
def root():
    return {"message": "Web Accessibility Platform API is running"}


@app.get("/api/health")
def health():
    return {"status": "ok"}