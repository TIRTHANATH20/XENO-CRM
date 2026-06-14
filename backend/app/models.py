import enum
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    JSON,
    Boolean,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Channel(str, enum.Enum):
    whatsapp = "whatsapp"
    sms = "sms"
    email = "email"
    rcs = "rcs"


class CampaignStatus(str, enum.Enum):
    draft = "draft"
    scheduled = "scheduled"
    sending = "sending"
    completed = "completed"
    failed = "failed"


class CommunicationStatus(str, enum.Enum):
    pending = "pending"
    sent = "sent"
    delivered = "delivered"
    failed = "failed"
    opened = "opened"
    read = "read"
    clicked = "clicked"
    converted = "converted"


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    email: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(50))
    city: Mapped[str] = mapped_column(String(100))
    country: Mapped[str] = mapped_column(String(100))
    signup_date: Mapped[datetime] = mapped_column(DateTime)
    total_spent: Mapped[float] = mapped_column(Float, default=0.0)
    order_count: Mapped[int] = mapped_column(Integer, default=0)
    last_order_date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    preferred_channel: Mapped[str] = mapped_column(String(20), default="email")
    tags: Mapped[list] = mapped_column(JSON, default=list)

    orders: Mapped[list["Order"]] = relationship(back_populates="customer")
    communications: Mapped[list["Communication"]] = relationship(back_populates="customer")


class Order(Base):
    __tablename__ = "orders"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    order_date: Mapped[datetime] = mapped_column(DateTime)
    total: Mapped[float] = mapped_column(Float)
    items: Mapped[list] = mapped_column(JSON, default=list)
    category: Mapped[str] = mapped_column(String(100), default="general")

    customer: Mapped["Customer"] = relationship(back_populates="orders")


class Segment(Base):
    __tablename__ = "segments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    description: Mapped[str] = mapped_column(Text, default="")
    filter_criteria: Mapped[dict] = mapped_column(JSON, default=dict)
    customer_count: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)

    campaigns: Mapped[list["Campaign"]] = relationship(back_populates="segment")


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    segment_id: Mapped[Optional[int]] = mapped_column(ForeignKey("segments.id"), nullable=True)
    message_template: Mapped[str] = mapped_column(Text)
    channel: Mapped[str] = mapped_column(String(20), default="email")
    status: Mapped[str] = mapped_column(String(20), default=CampaignStatus.draft.value)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    sent_count: Mapped[int] = mapped_column(Integer, default=0)
    delivered_count: Mapped[int] = mapped_column(Integer, default=0)
    opened_count: Mapped[int] = mapped_column(Integer, default=0)
    clicked_count: Mapped[int] = mapped_column(Integer, default=0)
    converted_count: Mapped[int] = mapped_column(Integer, default=0)
    failed_count: Mapped[int] = mapped_column(Integer, default=0)

    segment: Mapped[Optional["Segment"]] = relationship(back_populates="campaigns")
    communications: Mapped[list["Communication"]] = relationship(back_populates="campaign")


class Communication(Base):
    __tablename__ = "communications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    campaign_id: Mapped[int] = mapped_column(ForeignKey("campaigns.id"), index=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    channel: Mapped[str] = mapped_column(String(20))
    message: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default=CommunicationStatus.pending.value)
    sent_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    delivered_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    opened_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    read_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    clicked_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    converted_at: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    failed_reason: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    attributed_order_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    campaign: Mapped["Campaign"] = relationship(back_populates="communications")
    customer: Mapped["Customer"] = relationship(back_populates="communications")
