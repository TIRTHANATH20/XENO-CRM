from datetime import datetime
from typing import Any, Dict, List, Optional, Union

from pydantic import BaseModel, Field


class CustomerCreate(BaseModel):
    name: str
    email: str
    phone: str = ""
    city: str = ""
    country: str = ""
    signup_date: Optional[datetime] = None
    preferred_channel: str = "email"
    tags: List[str] = Field(default_factory=list)


class OrderCreate(BaseModel):
    customer_id: int
    order_date: Optional[datetime] = None
    total: float
    items: List[Dict[str, Any]] = Field(default_factory=list)
    category: str = "general"


class IngestPayload(BaseModel):
    customers: List[CustomerCreate] = Field(default_factory=list)
    orders: List[OrderCreate] = Field(default_factory=list)


class SegmentFilter(BaseModel):
    min_total_spent: Optional[float] = None
    max_total_spent: Optional[float] = None
    min_order_count: Optional[int] = None
    max_order_count: Optional[int] = None
    city: Optional[str] = None
    country: Optional[str] = None
    preferred_channel: Optional[str] = None
    inactive_days: Optional[int] = None
    # Customers with a last order within this many days (active recent customers)
    recent_days: Optional[int] = None
    tags: Optional[List[str]] = None
    category_purchased: Optional[str] = None
    # Explicitly include specific customer IDs in this segment
    include_ids: Optional[List[int]] = None


class SegmentCreate(BaseModel):
    name: str
    description: str = ""
    filter_criteria: Union[SegmentFilter, Dict[str, Any]] = Field(default_factory=dict)
    is_ai_generated: bool = False


class SegmentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None


class CampaignCreate(BaseModel):
    name: str
    segment_id: int
    message_template: str
    channel: str = "email"
    status: str = "draft"


class CampaignSendRequest(BaseModel):
    campaign_id: int


class ReceiptEvent(BaseModel):
    communication_id: int
    event: str
    timestamp: Optional[datetime] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ReceiptBatch(BaseModel):
    events: List[ReceiptEvent]


class CustomerOut(BaseModel):
    id: int
    name: str
    email: str
    phone: str
    city: str
    country: str
    total_spent: float
    order_count: int
    last_order_date: Optional[datetime]
    preferred_channel: str
    tags: List[str]

    class Config:
        from_attributes = True


class SegmentOut(BaseModel):
    id: int
    name: str
    description: str
    filter_criteria: Dict[str, Any]
    customer_count: int
    created_at: datetime
    is_ai_generated: bool

    class Config:
        from_attributes = True


class CampaignOut(BaseModel):
    id: int
    name: str
    segment_id: Optional[int]
    message_template: str
    channel: str
    status: str
    created_at: datetime
    sent_count: int
    delivered_count: int
    opened_count: int
    clicked_count: int
    converted_count: int
    failed_count: int

    class Config:
        from_attributes = True


class CommunicationOut(BaseModel):
    id: int
    campaign_id: int
    customer_id: int
    channel: str
    message: str
    status: str
    sent_at: Optional[datetime]
    delivered_at: Optional[datetime]
    opened_at: Optional[datetime]
    read_at: Optional[datetime]
    clicked_at: Optional[datetime]
    converted_at: Optional[datetime]
    failed_reason: Optional[str]

    class Config:
        from_attributes = True


class DashboardStats(BaseModel):
    total_customers: int
    total_orders: int
    total_revenue: float
    active_campaigns: int
    total_communications: int
    delivery_rate: float
    open_rate: float
    click_rate: float
    conversion_rate: float
