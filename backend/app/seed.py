from datetime import datetime, timedelta
from pathlib import Path
import json
import random

from app.database import SessionLocal, engine, Base
from app.models import Customer, Order, Segment, Campaign, Communication
from app.services.segmentation import create_segment

DATA_DIR = Path(__file__).resolve().parents[1] / "data"
SEED_FILE = DATA_DIR / "seed_data.json"


def load_seed_data() -> dict:
    if SEED_FILE.exists():
        seed = json.loads(SEED_FILE.read_text())

        if "brand" not in seed:
            seed["brand"] = BRAND
        seed.setdefault("customers", [])
        seed.setdefault("orders", [])
        seed.setdefault("campaigns", [])

        return seed

    return {
        "brand": BRAND,
        "customers": [],
        "orders": [],
        "campaigns": [],
    }


BRAND = "Coffee House"


def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    now = datetime.utcnow()
    seed_data = load_seed_data()
    customer_index = {}

    # Upsert customers from seed data so the DB reflects seed_data.json as the single source of truth.
    for data in seed_data["customers"]:
        if not data.get("email"):
            continue
        signup_date = (
            datetime.fromisoformat(data["signup_date"]) if data.get("signup_date") else None
        )

        customer = db.query(Customer).filter(Customer.email == data["email"]).first()
        if not customer:
            # try matching by name if email differs
            customer = db.query(Customer).filter(Customer.name == data["name"]).first()

        if customer:
            # update fields to match seed
            customer.name = data.get("name", customer.name)
            customer.email = data.get("email", customer.email)
            customer.phone = data.get("phone", customer.phone)
            customer.city = data.get("city", customer.city)
            customer.country = data.get("country", customer.country)
            customer.preferred_channel = data.get("preferred_channel", customer.preferred_channel)
            customer.tags = data.get("tags", customer.tags)
            if signup_date:
                customer.signup_date = signup_date
        else:
            # create new
            customer = Customer(
                name=data["name"],
                email=data["email"],
                phone=data.get("phone", ""),
                city=data.get("city", ""),
                country=data.get("country", ""),
                signup_date=signup_date or (now - timedelta(days=random.randint(30, 365))),
                total_spent=0,
                order_count=0,
                preferred_channel=data.get("preferred_channel", "email"),
                tags=data.get("tags", []),
            )
            db.add(customer)
            db.flush()
        customer_index[data["email"]] = customer

    for order_data in seed_data.get("orders", []):
        customer = customer_index.get(order_data["customer_email"])
        if not customer:
            continue

        order_date = (
            datetime.fromisoformat(order_data["order_date"]) if isinstance(order_data["order_date"], str) else order_data["order_date"]
        )

        order = Order(
            customer_id=customer.id,
            order_date=order_date,
            total=order_data["total"],
            items=order_data.get("items", []),
            category=order_data.get("category", "general"),
        )
        db.add(order)

        customer.order_count += 1
        customer.total_spent += order.total
        if not customer.last_order_date or order_date > customer.last_order_date:
            customer.last_order_date = order_date

    db.commit()

    if db.query(Segment).count() == 0:
        create_segment(
            db,
            "High-Value Loyalists",
            "Customers who spent ₹2000+ with 3+ orders",
            {"min_total_spent": 2000, "min_order_count": 3},
        )
        create_segment(
            db,
            "Win-Back: Churned",
            "Previously active customers who haven't ordered in 90+ days",
            {"inactive_days": 90, "min_order_count": 2},
        )
        create_segment(
            db,
            "Coffee Enthusiasts",
            "Tagged coffee lovers in major metros",
            {"tags": ["coffee"], "city": "Mumbai"},
        )
        create_segment(
            db,
            "New Shoppers",
            "Recent signups with 0-1 orders",
            {"max_order_count": 1},
            is_ai=False,
        )
        db.commit()

    db.query(Communication).delete()
    db.query(Campaign).delete()
    db.commit()

    segment_map = {segment.name: segment.id for segment in db.query(Segment).all()}

    # Support campaigns defined in the seed JSON under the "campaigns" key. If not present,
    # fall back to the inline defaults previously used.
    default_campaigns = [
        {
            "name": "High-Value Loyalists: Premium Perk",
            "segment_name": "High-Value Loyalists",
            "message_template": "Hi {{name}}, thank you for your loyalty. Redeem an exclusive premium blend reward on your next order.",
            "channel": "email",
            "status": "completed",
            "sent_count": 10,
            "delivered_count": 10,
            "opened_count": 8,
            "clicked_count": 4,
            "converted_count": 2,
            "failed_count": 0,
        },
        {
            "name": "Win-Back: Churned Espresso Offer",
            "segment_name": "Win-Back: Churned",
            "message_template": "Hi {{name}}, we miss your mornings. Get a fresh espresso on us when you return this week.",
            "channel": "whatsapp",
            "status": "completed",
            "sent_count": 2,
            "delivered_count": 2,
            "opened_count": 2,
            "clicked_count": 1,
            "converted_count": 1,
            "failed_count": 0,
        },
        {
            "name": "Coffee Enthusiasts: New Roast Preview",
            "segment_name": "Coffee Enthusiasts",
            "message_template": "Hi {{name}}, be the first to taste our limited roast preview—reserve your sample today.",
            "channel": "sms",
            "status": "draft",
            "sent_count": 0,
            "delivered_count": 0,
            "opened_count": 0,
            "clicked_count": 0,
            "converted_count": 0,
            "failed_count": 0,
        },
        {
            "name": "New Shoppers: Welcome Reward",
            "segment_name": "New Shoppers",
            "message_template": "Welcome {{name}}! Enjoy ₹50 off your first full-size roast order at Coffee House.",
            "channel": "email",
            "status": "scheduled",
            "sent_count": 0,
            "delivered_count": 0,
            "opened_count": 0,
            "clicked_count": 0,
            "converted_count": 0,
            "failed_count": 0,
        },
    ]

    campaign_entries = seed_data.get("campaigns") if seed_data.get("campaigns") else default_campaigns

    for campaign_data in campaign_entries:
        # allow campaign entries to reference segments by name (preferred in seed file)
        seg_id = campaign_data.get("segment_id") or segment_map.get(campaign_data.get("segment_name"))
        campaign = Campaign(
            name=campaign_data["name"],
            segment_id=seg_id,
            message_template=campaign_data["message_template"],
            channel=campaign_data.get("channel", "email"),
            status=campaign_data.get("status", "draft"),
            sent_count=campaign_data.get("sent_count", 0),
            delivered_count=campaign_data.get("delivered_count", 0),
            opened_count=campaign_data.get("opened_count", 0),
            clicked_count=campaign_data.get("clicked_count", 0),
            converted_count=campaign_data.get("converted_count", 0),
            failed_count=campaign_data.get("failed_count", 0),
        )
        db.add(campaign)

    db.commit()
    db.close()
    return {"status": "seeded", "customers": len(seed_data["customers"]), "brand": seed_data.get("brand", BRAND)}


if __name__ == "__main__":
    print(seed_database())
