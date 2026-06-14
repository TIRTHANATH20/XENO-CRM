import asyncio
import random
from datetime import datetime

import httpx

from app.config import settings


async def simulate_lifecycle(payload: dict):
    """Simulate async message lifecycle and callback to CRM."""
    comm_id = payload["communication_id"]
    callback_url = payload["callback_url"]
    channel = payload.get("channel", "email")

    channel_modifiers = {
        "whatsapp": {"open": 1.2, "click": 1.3, "convert": 1.1},
        "sms": {"open": 0.9, "click": 0.7, "convert": 0.6},
        "email": {"open": 1.0, "click": 1.0, "convert": 1.0},
        "rcs": {"open": 1.15, "click": 1.2, "convert": 1.05},
    }
    mod = channel_modifiers.get(channel, channel_modifiers["email"])

    async def send_event(event: str, delay: float):
        await asyncio.sleep(delay)
        async with httpx.AsyncClient(timeout=15.0) as client:
            try:
                await client.post(
                    callback_url,
                    json={
                        "communication_id": comm_id,
                        "event": event,
                        "timestamp": datetime.utcnow().isoformat(),
                    },
                )
            except Exception:
                pass

    base_delay = random.uniform(settings.min_delay_seconds, settings.max_delay_seconds)

    if random.random() > settings.delivery_success_rate:
        await send_event("failed", base_delay)
        return

    await send_event("delivered", base_delay)

    if random.random() < settings.open_rate * mod["open"]:
        await send_event("opened", base_delay + random.uniform(1, 5))

        if random.random() < settings.read_rate:
            await send_event("read", base_delay + random.uniform(2, 8))

        if random.random() < settings.click_rate * mod["click"]:
            await send_event("clicked", base_delay + random.uniform(3, 12))

            if random.random() < settings.conversion_rate * mod["convert"]:
                await send_event("converted", base_delay + random.uniform(5, 20))
