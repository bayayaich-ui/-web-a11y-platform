import base64
import hashlib
import hmac
import os
import secrets
from datetime import datetime, timedelta, timezone
from uuid import UUID


PASSWORD_ITERATIONS = 310_000
SESSION_TTL = timedelta(days=7)


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, PASSWORD_ITERATIONS)
    return f'pbkdf2_sha256${PASSWORD_ITERATIONS}${_encode(salt)}${_encode(digest)}'


def verify_password(password: str, encoded: str | None) -> bool:
    if not encoded:
        return False
    try:
        algorithm, iterations, salt, expected = encoded.split('$')
        if algorithm != 'pbkdf2_sha256':
            return False
        actual = hashlib.pbkdf2_hmac('sha256', password.encode(), _decode(salt), int(iterations))
        return hmac.compare_digest(actual, _decode(expected))
    except (TypeError, ValueError):
        return False


def create_session_token(user_id: UUID) -> str:
    expires = int((datetime.now(timezone.utc) + SESSION_TTL).timestamp())
    payload = f'{user_id}:{expires}'.encode()
    signature = hmac.new(_secret(), payload, hashlib.sha256).digest()
    return f'{_encode(payload)}.{_encode(signature)}'


def read_session_token(token: str | None) -> UUID | None:
    if not token or '.' not in token:
        return None
    payload_text, signature_text = token.split('.', 1)
    try:
        payload = _decode(payload_text)
        expected = hmac.new(_secret(), payload, hashlib.sha256).digest()
        if not hmac.compare_digest(expected, _decode(signature_text)):
            return None
        user_text, expires_text = payload.decode().split(':', 1)
        if int(expires_text) < int(datetime.now(timezone.utc).timestamp()):
            return None
        return UUID(user_text)
    except (ValueError, TypeError):
        return None


def _secret() -> bytes:
    secret = os.getenv('AUTH_SECRET')
    if not secret:
        raise RuntimeError('AUTH_SECRET doit être défini en production')
    return secret.encode()


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode().rstrip('=')


def _decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(value + '=' * (-len(value) % 4))