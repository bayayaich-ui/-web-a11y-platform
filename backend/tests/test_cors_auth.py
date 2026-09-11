from fastapi.testclient import TestClient

from app.main import app


ORIGIN = "http://localhost:3000"


def test_auth_preflight_allows_local_frontend():
    with TestClient(app) as client:
        response = client.options(
            "/api/auth/login",
            headers={
                "Origin": ORIGIN,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )

    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == ORIGIN
    assert response.headers["access-control-allow-credentials"] == "true"


def test_auth_errors_keep_cors_headers():
    with TestClient(app) as client:
        response = client.get("/api/auth/me", headers={"Origin": ORIGIN})

    assert response.status_code == 401
    assert response.headers["access-control-allow-origin"] == ORIGIN
    assert response.headers["access-control-allow-credentials"] == "true"
