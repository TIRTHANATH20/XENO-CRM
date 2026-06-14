import asyncio
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from app.simulator import simulate_lifecycle

app = FastAPI(
    title="Xeno Channel Service",
    description="Simulates WhatsApp, SMS, Email, and RCS delivery with async callbacks",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Recipient(BaseModel):
    email: str = ""
    phone: str = ""
    name: str = ""


class SendRequest(BaseModel):
    communication_id: int
    recipient: Recipient
    message: str
    channel: str
    callback_url: str
    metadata: dict[str, Any] = Field(default_factory=dict)


@app.post("/api/send")
async def send_message(request: SendRequest):
    payload = request.model_dump()
    asyncio.create_task(simulate_lifecycle(payload))
    return {
        "status": "accepted",
        "communication_id": request.communication_id,
        "channel": request.channel,
        "message": "Message queued for simulated delivery",
    }


@app.get("/health")
def health():
    return {"status": "ok", "service": "xeno-channel-service"}
