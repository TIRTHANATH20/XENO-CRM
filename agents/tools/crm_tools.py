import json
from typing import Any

import httpx
from langchain_core.tools import tool

from agents.config import settings

BASE = settings.crm_api_url


def _get(path: str) -> str:
    with httpx.Client(timeout=30.0) as client:
        r = client.get(f"{BASE}{path}")
        r.raise_for_status()
        return json.dumps(r.json(), indent=2, default=str)


def _post(path: str, data: dict) -> str:
    with httpx.Client(timeout=30.0) as client:
        r = client.post(f"{BASE}{path}", json=data)
        if r.status_code >= 400:
            return f"Error {r.status_code}: {r.text}"
        return json.dumps(r.json(), indent=2, default=str)


@tool
def ask_db(query: str) -> str:
    """Query CRM data via API. Use endpoints like /api/customers, /api/segments, /api/campaigns, /api/analytics/dashboard.
    For filtered data, use specific endpoints. Example: GET /api/customers returns all shoppers."""
    path = query if query.startswith("/") else f"/api/{query}"
    try:
        return _get(path)
    except Exception as e:
        return f"Error: {e}"


@tool
def create_segment(name: str, description: str, filter_json: str) -> str:
    """Create a shopper segment. filter_json is JSON with keys like min_total_spent, max_order_count, city, country, preferred_channel, inactive_days, tags, category_purchased."""
    try:
        criteria = json.loads(filter_json)
        return _post("/api/segments", {"name": name, "description": description, "filter_criteria": criteria, "is_ai_generated": True})
    except Exception as e:
        return f"Error: {e}"


@tool
def create_campaign(name: str, segment_id: int, message_template: str, channel: str) -> str:
    """Create a marketing campaign. channel must be one of: whatsapp, sms, email, rcs. Use {{name}}, {{city}}, {{total_spent}} in message_template for personalization."""
    try:
        return _post("/api/campaigns", {
            "name": name,
            "segment_id": segment_id,
            "message_template": message_template,
            "channel": channel,
        })
    except Exception as e:
        return f"Error: {e}"


@tool
def send_campaign(campaign_id: int) -> str:
    """Send/launch a campaign to its segment via the channel service. Returns updated campaign stats."""
    try:
        with httpx.Client(timeout=60.0) as client:
            r = client.post(f"{BASE}/api/campaigns/{campaign_id}/send")
            if r.status_code >= 400:
                return f"Error {r.status_code}: {r.text}"
            return json.dumps(r.json(), indent=2, default=str)
    except Exception as e:
        return f"Error: {e}"


@tool
def get_campaign_performance(campaign_id: int) -> str:
    """Get delivery funnel and engagement rates for a campaign (sent, delivered, opened, clicked, converted)."""
    try:
        return _get(f"/api/campaigns/{campaign_id}/performance")
    except Exception as e:
        return f"Error: {e}"


@tool
def get_dashboard_stats() -> str:
    """Get overall CRM analytics: customers, revenue, delivery/open/click/conversion rates."""
    try:
        return _get("/api/analytics/dashboard")
    except Exception as e:
        return f"Error: {e}"


@tool
def list_segment_customers(segment_id: int) -> str:
    """List all shoppers in a segment by segment_id."""
    try:
        return _get(f"/api/segments/{segment_id}/customers")
    except Exception as e:
        return f"Error: {e}"
