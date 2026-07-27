import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI

from app.services.queue_consumer import start_consumer

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Démarre le consommateur RabbitMQ en tâche de fond au lancement de l'API
    consumer_task = asyncio.create_task(start_consumer())
    yield
    consumer_task.cancel()


app = FastAPI(
    title="Web Accessibility Platform API",
    version="1.0.0",
    lifespan=lifespan,
)


@app.get("/")
def root():
    return {"message": "Web Accessibility Platform API is running"}