from datetime import datetime

from sqlalchemy.orm import Session

from app.models import Customer, Order
from app.schemas import CustomerCreate, IngestPayload, OrderCreate


def upsert_customer(db: Session, data: CustomerCreate) -> Customer:
    customer = db.query(Customer).filter(Customer.email == data.email).first()
    if customer:
        customer.name = data.name
        customer.phone = data.phone
        customer.city = data.city
        customer.country = data.country
        customer.preferred_channel = data.preferred_channel
        customer.tags = data.tags
    else:
        customer = Customer(
            name=data.name,
            email=data.email,
            phone=data.phone,
            city=data.city,
            country=data.country,
            signup_date=data.signup_date or datetime.utcnow(),
            preferred_channel=data.preferred_channel,
            tags=data.tags,
        )
        db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer


def create_order(db: Session, data: OrderCreate) -> Order:
    order = Order(
        customer_id=data.customer_id,
        order_date=data.order_date or datetime.utcnow(),
        total=data.total,
        items=data.items,
        category=data.category,
    )
    db.add(order)

    customer = db.query(Customer).filter(Customer.id == data.customer_id).first()
    if customer:
        customer.order_count += 1
        customer.total_spent += data.total
        customer.last_order_date = order.order_date

    db.commit()
    db.refresh(order)
    return order


def ingest_data(db: Session, payload: IngestPayload) -> dict:
    email_to_id: dict[str, int] = {}
    customers_created = 0
    orders_created = 0

    for c in payload.customers:
        customer = upsert_customer(db, c)
        email_to_id[c.email] = customer.id
        customers_created += 1

    for o in payload.orders:
        create_order(db, o)
        orders_created += 1

    return {"customers_ingested": customers_created, "orders_ingested": orders_created}
