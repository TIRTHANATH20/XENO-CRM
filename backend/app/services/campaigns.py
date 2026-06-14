import re
from datetime import datetime
from typing import Optional

import httpx
from sqlalchemy.orm import Session

from app.config import settings
from app.models import Campaign, CampaignStatus, Communication, CommunicationStatus, Customer
from app.services.segmentation import get_segment_customers


def personalize_message(template: str, customer: Customer) -> str:
    message = template
    replacements = {
        "{{name}}": customer.name.split()[0],
        "{{full_name}}": customer.name,
        "{{email}}": customer.email,
        "{{city}}": customer.city,
        "{{total_spent}}": f"{customer.total_spent:.0f}",
        "{{order_count}}": str(customer.order_count),
    }
    for key, value in replacements.items():
        message = message.replace(key, value)
    return message


async def send_campaign(db: Session, campaign_id: int) -> Campaign:
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise ValueError("Campaign not found")
    if campaign.status not in (CampaignStatus.draft.value, CampaignStatus.scheduled.value):
        raise ValueError(f"Campaign cannot be sent from status: {campaign.status}")

    customers = get_segment_customers(db, campaign.segment_id)
    if not customers:
        raise ValueError("No customers in segment")

    campaign.status = CampaignStatus.sending.value
    db.commit()

    communications: list[Communication] = []
    for customer in customers:
        channel = campaign.channel or customer.preferred_channel
        message = personalize_message(campaign.message_template, customer)
        comm = Communication(
            campaign_id=campaign.id,
            customer_id=customer.id,
            channel=channel,
            message=message,
            status=CommunicationStatus.pending.value,
        )
        db.add(comm)
        communications.append(comm)
    db.commit()

    customer_map = {c.id: c for c in customers}

    async with httpx.AsyncClient(timeout=30.0) as client:
        for comm in communications:
            db.refresh(comm)
            customer = customer_map[comm.customer_id]
            payload = {
                "communication_id": comm.id,
                "recipient": {
                    "email": customer.email,
                    "phone": customer.phone,
                    "name": customer.name,
                },
                "message": comm.message,
                "channel": comm.channel,
                "callback_url": settings.crm_callback_url,
            }
            try:
                response = await client.post(
                    f"{settings.channel_service_url}/api/send",
                    json=payload,
                )
                response.raise_for_status()
                comm.status = CommunicationStatus.sent.value
                comm.sent_at = datetime.utcnow()
                campaign.sent_count += 1
            except Exception as exc:
                comm.status = CommunicationStatus.failed.value
                comm.failed_reason = str(exc)
                campaign.failed_count += 1
            db.commit()

    campaign.status = CampaignStatus.completed.value
    db.commit()
    db.refresh(campaign)
    return campaign


def process_receipt(db: Session, communication_id: int, event: str, timestamp: Optional[datetime] = None) -> Communication:
    comm = db.query(Communication).filter(Communication.id == communication_id).first()
    if not comm:
        raise ValueError("Communication not found")

    campaign = comm.campaign
    ts = timestamp or datetime.utcnow()
    event = event.lower()

    status_progression = {
        "delivered": (CommunicationStatus.delivered, "delivered_at", "delivered_count"),
        "failed": (CommunicationStatus.failed, None, "failed_count"),
        "opened": (CommunicationStatus.opened, "opened_at", "opened_count"),
        "read": (CommunicationStatus.read, "read_at", None),
        "clicked": (CommunicationStatus.clicked, "clicked_at", "clicked_count"),
        "converted": (CommunicationStatus.converted, "converted_at", "converted_count"),
    }

    if event not in status_progression:
        raise ValueError(f"Unknown event: {event}")

    new_status, time_field, counter_field = status_progression[event]
    comm.status = new_status.value

    if time_field:
        setattr(comm, time_field, ts)
    if counter_field and event != "failed":
        current = getattr(campaign, counter_field, 0)
        setattr(campaign, counter_field, current + 1)
    elif event == "failed":
        campaign.failed_count += 1
        comm.failed_reason = comm.failed_reason or "Channel delivery failed"

    db.commit()
    db.refresh(comm)
    return comm
