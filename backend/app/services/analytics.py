from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models import Campaign, Communication, Customer, Order
from app.schemas import DashboardStats


def get_dashboard_stats(db: Session) -> DashboardStats:
    total_customers = db.query(func.count(Customer.id)).scalar() or 0
    total_orders = db.query(func.count(Order.id)).scalar() or 0
    total_revenue = db.query(func.coalesce(func.sum(Order.total), 0.0)).scalar() or 0.0
    active_campaigns = (
        db.query(func.count(Campaign.id))
        .filter(Campaign.status.in_(["sending", "completed"]))
        .scalar()
        or 0
    )
    # prefer counting Communications (detailed events); if none exist, fall back to campaign aggregates
    total_comms = db.query(func.count(Communication.id)).scalar() or 0
    if total_comms > 0:
        delivered = (
            db.query(func.count(Communication.id))
            .filter(Communication.status.in_(["delivered", "opened", "read", "clicked", "converted"]))
            .scalar()
            or 0
        )
        opened = (
            db.query(func.count(Communication.id))
            .filter(Communication.status.in_(["opened", "read", "clicked", "converted"]))
            .scalar()
            or 0
        )
        clicked = (
            db.query(func.count(Communication.id))
            .filter(Communication.status.in_(["clicked", "converted"]))
            .scalar()
            or 0
        )
        converted = (
            db.query(func.count(Communication.id))
            .filter(Communication.status == "converted")
            .scalar()
            or 0
        )
        sent = (
            db.query(func.count(Communication.id))
            .filter(Communication.status != "pending")
            .scalar()
            or 0
        )
    else:
        # Use campaign-level counters as a reasonable fallback for demo data
        sent = db.query(func.coalesce(func.sum(Campaign.sent_count), 0)).scalar() or 0
        delivered = db.query(func.coalesce(func.sum(Campaign.delivered_count), 0)).scalar() or 0
        opened = db.query(func.coalesce(func.sum(Campaign.opened_count), 0)).scalar() or 0
        clicked = db.query(func.coalesce(func.sum(Campaign.clicked_count), 0)).scalar() or 0
        converted = db.query(func.coalesce(func.sum(Campaign.converted_count), 0)).scalar() or 0
        total_comms = sent

    return DashboardStats(
        total_customers=total_customers,
        total_orders=total_orders,
        total_revenue=float(total_revenue),
        active_campaigns=active_campaigns,
        total_communications=total_comms,
        delivery_rate=round((delivered / sent * 100) if sent else 0, 1),
        open_rate=round((opened / delivered * 100) if delivered else 0, 1),
        click_rate=round((clicked / opened * 100) if opened else 0, 1),
        conversion_rate=round((converted / sent * 100) if sent else 0, 1),
    )


def get_campaign_performance(db: Session, campaign_id: int) -> dict:
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise ValueError("Campaign not found")

    funnel = {
        "sent": campaign.sent_count,
        "delivered": campaign.delivered_count,
        "opened": campaign.opened_count,
        "clicked": campaign.clicked_count,
        "converted": campaign.converted_count,
        "failed": campaign.failed_count,
    }
    rates = {
        "delivery_rate": round((funnel["delivered"] / funnel["sent"] * 100) if funnel["sent"] else 0, 1),
        "open_rate": round((funnel["opened"] / funnel["delivered"] * 100) if funnel["delivered"] else 0, 1),
        "click_rate": round((funnel["clicked"] / funnel["opened"] * 100) if funnel["opened"] else 0, 1),
        "conversion_rate": round((funnel["converted"] / funnel["sent"] * 100) if funnel["sent"] else 0, 1),
    }
    return {"campaign": campaign, "funnel": funnel, "rates": rates}
