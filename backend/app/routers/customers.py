from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Customer, Order
from app.schemas import CustomerCreate, CustomerOut, OrderCreate
from app.services.ingest import create_order, upsert_customer

router = APIRouter(prefix="/api/customers", tags=["customers"])


@router.get("", response_model=list[CustomerOut])
def list_customers(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return db.query(Customer).offset(skip).limit(limit).all()


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(404, "Customer not found")
    return customer


@router.post("", response_model=CustomerOut)
def create_customer(data: CustomerCreate, db: Session = Depends(get_db)):
    return upsert_customer(db, data)


@router.post("/{customer_id}/orders")
def add_order(customer_id: int, data: OrderCreate, db: Session = Depends(get_db)):
    if not db.query(Customer).filter(Customer.id == customer_id).first():
        raise HTTPException(404, "Customer not found")
    data.customer_id = customer_id
    order = create_order(db, data)
    return {"id": order.id, "total": order.total, "category": order.category}
