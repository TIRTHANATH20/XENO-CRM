from fastapi.testclient import TestClient

from agents.api import app

client = TestClient(app)


def test_agent_health():
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert "xeno-agents" in data["service"]


def test_list_agents_returns_dict():
    response = client.get("/api/agents")
    assert response.status_code == 200
    assert isinstance(response.json(), dict)
