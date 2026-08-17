import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
import os
from fastapi.middleware.cors import CORSMiddleware

from app.services.queue_consumer import start_consumer
from app.api.sites.routes import router as sites_router
from app.api.scans.routes import router as scans_router
from app.api.violations.routes import router as violations_router

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    consumer_task = asyncio.create_task(start_consumer())
    yield
    consumer_task.cancel()


app = FastAPI(
    title="Web Accessibility Platform API",
    version="1.0.0",
    lifespan=lifespan,
)

# Configure CORS origins from environment (comma-separated). Default allows localhost:3000 and 3001 for development.
# This covers cases where the Next dev server runs on 3001 to avoid 'Failed to fetch' from the browser.
allowed = os.getenv("CORS_ALLOW_ORIGINS", "http://localhost:3000,http://localhost:3001")
allow_origins = [o.strip() for o in allowed.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(sites_router)
app.include_router(scans_router)
app.include_router(violations_router)


@app.get("/")
def root():
    return {"message": "Web Accessibility Platform API is running"}