from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "version": "0.1.0", "db_ok": True, "redis_ok": True}

def test_version():
    response = client.get("/version")
    assert response.status_code == 200
    assert response.json() == {"version": "0.1.0"}

def test_portfolio_summary():
    response = client.get("/api/v1/portfolio/summary")
    assert response.status_code == 200
    assert "total_points_equivalent_usd" in response.json()
