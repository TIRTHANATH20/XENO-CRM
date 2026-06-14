from pathlib import Path
import sys

# Ensure the backend package is importable when tests run from the repo root.
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok", "service": "xeno-crm"}


def test_list_campaigns_returns_json():
    response = client.get("/api/campaigns")
    assert response.status_code == 200
    assert isinstance(response.json(), list)
