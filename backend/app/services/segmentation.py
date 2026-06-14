from datetime import datetime, timedelta
from typing import Optional

from sqlalchemy import String, func, or_
from sqlalchemy.orm import Session
import logging

from app.models import Customer, Order, Segment
from app.schemas import SegmentFilter


def apply_segment_filter(db: Session, criteria: dict) -> list[Customer]:
    filters = SegmentFilter(**criteria) if criteria else SegmentFilter()
    query = db.query(Customer)

    if filters.min_total_spent is not None:
        query = query.filter(Customer.total_spent >= filters.min_total_spent)
    if filters.max_total_spent is not None:
        query = query.filter(Customer.total_spent <= filters.max_total_spent)
    if filters.min_order_count is not None:
        query = query.filter(Customer.order_count >= filters.min_order_count)
    if filters.max_order_count is not None:
        query = query.filter(Customer.order_count <= filters.max_order_count)
    if filters.city:
        query = query.filter(Customer.city.ilike(f"%{filters.city}%"))
    if filters.country:
        query = query.filter(Customer.country.ilike(f"%{filters.country}%"))
    if filters.preferred_channel:
        query = query.filter(Customer.preferred_channel == filters.preferred_channel)
    if filters.inactive_days is not None:
        cutoff = datetime.utcnow() - timedelta(days=filters.inactive_days)
        query = query.filter(
            (Customer.last_order_date == None) | (Customer.last_order_date < cutoff)  # noqa: E711
        )
    if getattr(filters, "recent_days", None) is not None:
        cutoff_recent = datetime.utcnow() - timedelta(days=filters.recent_days)
        query = query.filter(
            (Customer.last_order_date != None) & (Customer.last_order_date >= cutoff_recent)  # noqa: E711
        )
    if filters.tags:
        for tag in filters.tags:
            query = query.filter(Customer.tags.cast(String).like(f'%"{tag}"%'))
    if filters.category_purchased:
        customer_ids = (
            db.query(Order.customer_id)
            .filter(Order.category == filters.category_purchased)
            .distinct()
            .subquery()
        )
        query = query.filter(Customer.id.in_(customer_ids))

    # Execute base query
    base_customers = query.all()

    # If include_ids provided, include those customers even if they don't match other filters
    include_list = getattr(filters, "include_ids", None) or []
    if include_list:
        explicit = db.query(Customer).filter(Customer.id.in_(include_list)).all()
        # merge by id, preserving ordering from base_customers then explicit
        seen = {c.id for c in base_customers}
        merged = list(base_customers)
        for c in explicit:
            if c.id not in seen:
                merged.append(c)
                seen.add(c.id)
        return merged

    return base_customers


def create_segment(db: Session, name: str, description: str, criteria: dict, is_ai: bool = False) -> Segment:
    existing = db.query(Segment).filter(func.lower(Segment.name) == name.lower()).first()
    if existing:
        raise ValueError("A segment with that name already exists.")

    logging.getLogger("segmentation").info("Creating segment '%s' with criteria: %s", name, criteria)
    customers = apply_segment_filter(db, criteria)
    logging.getLogger("segmentation").info("Segment '%s' matched %d customers", name, len(customers))
    segment = Segment(
        name=name,
        description=description,
        filter_criteria=criteria,
        customer_count=len(customers),
        is_ai_generated=is_ai,
    )
    db.add(segment)
    db.commit()
    db.refresh(segment)
    return segment


def refresh_segment_count(db: Session, segment_id: int) -> Segment:
    segment = db.query(Segment).filter(Segment.id == segment_id).first()
    if not segment:
        raise ValueError("Segment not found")
    customers = apply_segment_filter(db, segment.filter_criteria)
    new_count = len(customers)
    logging.getLogger("segmentation").info("Refreshing segment %s (%d) count -> %d", segment.name, segment.id, new_count)
    segment.customer_count = new_count
    db.commit()
    db.refresh(segment)
    return segment


def delete_segment(db: Session, segment_id: int) -> None:
    segment = db.query(Segment).filter(Segment.id == segment_id).first()
    if not segment:
        raise ValueError("Segment not found")
    db.delete(segment)
    db.commit()


def update_segment(db: Session, segment_id: int, name: Optional[str] = None, description: Optional[str] = None) -> Segment:
    segment = db.query(Segment).filter(Segment.id == segment_id).first()
    if not segment:
        raise ValueError("Segment not found")
    if name is not None:
        segment.name = name
    if description is not None:
        segment.description = description
    db.commit()
    db.refresh(segment)
    return segment


def get_segment_customers(db: Session, segment_id: int) -> list[Customer]:
    segment = db.query(Segment).filter(Segment.id == segment_id).first()
    if not segment:
        raise ValueError("Segment not found")
    return apply_segment_filter(db, segment.filter_criteria)
