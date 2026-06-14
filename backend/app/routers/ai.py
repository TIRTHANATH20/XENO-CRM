from datetime import datetime, timedelta
from collections import Counter
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app import models

router = APIRouter(prefix="/ai", tags=["ai"])


def days_since(dt: Optional[datetime]) -> int:
    if not dt:
        return 9999
    return (datetime.utcnow() - dt).days


@router.post("/copilot")
def campaign_copilot(goal: dict, db: Session = Depends(get_db)) -> Any:
    """Generate a recommended audience and campaign suggestion for a high-level goal."""
    text = goal.get("goal", "").lower()

    # Simple heuristics: if contains 'repeat' find 1-time buyers inactive 30+ days
    if "repeat" in text or "bring back" in text or "dormant" in text:
        cutoff = datetime.utcnow() - timedelta(days=30)
        customers = (
            db.query(models.Customer)
            .filter(models.Customer.order_count == 1)
            .filter(models.Customer.last_order_date <= cutoff)
            .all()
        )
        audience_size = len(customers)
        recommended_channel = (
            Counter([c.preferred_channel for c in customers]).most_common(1)[0][0]
            if customers
            else "whatsapp"
        )
        expected_open = 0.68
        expected_conversion = 0.042
        offer = "15% discount"

        # create a segment
        seg = models.Segment(
            name="AI: Dormant 1-time buyers (30d+)",
            description="Automated segment generated for repeat-campaign",
            filter_criteria={"order_count": 1, "inactive_days": 30},
            customer_count=audience_size,
            is_ai_generated=True,
        )
        db.add(seg)
        db.commit()
        db.refresh(seg)

        return {
            "goal": text,
            "recommended_audience": seg.name,
            "audience_size": audience_size,
            "expected_open_rate": expected_open,
            "expected_conversion": expected_conversion,
            "recommended_channel": recommended_channel,
            "recommended_offer": offer,
            "segment_id": seg.id,
            "reasoning": [
                "1-time buyers inactive for 30+ days",
                f"Audience built from purchase history ({audience_size} members)",
            ],
        }

    # fallback
    return {"goal": text, "message": "No specialized recipe for this goal yet."}


@router.get("/digital-twin/{customer_id}")
def digital_twin(customer_id: int, db: Session = Depends(get_db)) -> Any:
    c = db.get(models.Customer, customer_id)
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")

    ltv = float(c.total_spent or 0.0)
    risk_score = 100 if days_since(c.last_order_date) > 180 else max(0, int(days_since(c.last_order_date) / 2))

    # predict next purchase from most common category in orders
    categories = [o.category for o in c.orders]
    prediction = Counter(categories).most_common(1)[0][0] if categories else "general"

    return {
        "customer_id": c.id,
        "name": c.name,
        "lifetime_value": ltv,
        "risk_score": risk_score,
        "predicted_next_purchase": prediction,
        "preferred_channel": c.preferred_channel,
        "best_contact_time": "18:00-20:00",
    }


@router.post("/simulate")
def simulate_campaign(payload: dict, db: Session = Depends(get_db)) -> Any:
    seg_id = payload.get("segment_id")
    channel = payload.get("channel", "whatsapp")
    seg = db.get(models.Segment, seg_id) if seg_id else None
    base = seg.customer_count if seg else 1000

    # simple channel multipliers
    channel_open = {"whatsapp": 0.7, "sms": 0.5, "email": 0.35, "rcs": 0.6}
    open_rate = channel_open.get(channel, 0.5)
    clicks = int(base * open_rate * 0.12)
    revenue = int(clicks * 50)  # pretend avg order value

    return {
        "predicted_reach": base,
        "expected_opens": int(base * open_rate),
        "expected_clicks": clicks,
        "expected_revenue": revenue,
    }


@router.post("/analyze_campaign/{campaign_id}")
def analyze_campaign(campaign_id: int, db: Session = Depends(get_db)) -> Any:
    camp = db.get(models.Campaign, campaign_id)
    if not camp:
        raise HTTPException(status_code=404, detail="Campaign not found")

    # aggregate by city
    comms = db.query(models.Communication).filter(models.Communication.campaign_id == camp.id).all()
    by_city = {}
    for com in comms:
        city = com.customer.city or "unknown"
        entry = by_city.setdefault(city, {"sent": 0, "converted": 0})
        entry["sent"] += 1
        if com.converted_at:
            entry["converted"] += 1

    insights = []
    # find top performing city by conversion rate
    rates = [(city, v["converted"] / v["sent"] if v["sent"] else 0) for city, v in by_city.items()]
    rates.sort(key=lambda x: x[1], reverse=True)
    if rates:
        top_city, top_rate = rates[0]
        insights.append(f"{top_city} converted {top_rate*100:.1f}% better than other cities")

    # channel comparison
    channel_counts = Counter([c.channel for c in comms])
    insights.append(f"Channel distribution: {dict(channel_counts)}")

    return {
        "campaign_id": camp.id,
        "sent": camp.sent_count,
        "opened": camp.opened_count,
        "clicked": camp.clicked_count,
        "converted": camp.converted_count,
        "insights": insights,
    }


@router.post("/autonomous")
def autonomous_agent(payload: dict, db: Session = Depends(get_db)) -> Any:
    goal = payload.get("goal", "")

    # Step 1: run copilot to get a segment
    cop = campaign_copilot({"goal": goal}, db=db)
    seg_id = cop.get("segment_id")

    # Step 2: generate simple message
    message = f"Hi {{name}}, we miss you — enjoy {cop.get('recommended_offer')} on your next order!"

    # Step 3: create a campaign
    camp = models.Campaign(name=f"AI: {goal[:40]}", segment_id=seg_id, message_template=message, channel=cop.get("recommended_channel"))
    db.add(camp)
    db.commit()
    db.refresh(camp)

    # Return the plan
    plan = [
        "Analyze customer base",
        "Create segment",
        "Generate offer and message",
        "Choose channel",
        "Create campaign",
        "(Manual) Launch campaign via campaigns API",
    ]

    return {"goal": goal, "segment_id": seg_id, "campaign_id": camp.id, "plan": plan}
