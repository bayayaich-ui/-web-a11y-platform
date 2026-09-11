import os

from dotenv import load_dotenv


load_dotenv()

APP_ENV = os.getenv("APP_ENV", "development").lower()
DATABASE_URL = os.getenv("DATABASE_URL")
AUTH_SECRET = os.getenv("AUTH_SECRET")
AUTH_COOKIE_SECURE = os.getenv("AUTH_COOKIE_SECURE", "false").lower() == "true"
SCAN_TIMEOUT_SECONDS = int(os.getenv("SCAN_TIMEOUT_SECONDS", "300"))
ALLOWED_ORIGINS = [
	origin.strip()
	for origin in os.getenv(
		"CORS_ALLOW_ORIGINS",
		"http://localhost:3000,http://localhost:3001,http://localhost:3002,http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002",
	).split(",")
	if origin.strip()
]


if not DATABASE_URL:
	raise RuntimeError("DATABASE_URL doit être défini dans l'environnement du backend.")

if not AUTH_SECRET or len(AUTH_SECRET) < 32:
	raise RuntimeError(
		"AUTH_SECRET doit être défini avec au moins 32 caractères "
		"dans l'environnement du backend."
	)

if APP_ENV == "production" and not AUTH_COOKIE_SECURE:
	raise RuntimeError("AUTH_COOKIE_SECURE doit être true en production.")
