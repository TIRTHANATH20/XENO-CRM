from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas import ReceiptBatch, ReceiptEvent
from app.services.campaigns import process_receipt

router = APIRouter(prefix="/api/receipts", tags=["receipts"])


@router.post("")
def receive_receipt(event: ReceiptEvent, db: Session = Depends(get_db)):
    try:
        comm = process_receipt(db, event.communication_id, event.event, event.timestamp)
        return {"status": "ok", "communication_id": comm.id, "new_status": comm.status}
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/batch")
def receive_receipt_batch(batch: ReceiptBatch, db: Session = Depends(get_db)):
    results = []
    for event in batch.events:
        try:
            comm = process_receipt(db, event.communication_id, event.event, event.timestamp)
            results.append({"communication_id": comm.id, "status": comm.status, "ok": True})
        except ValueError as e:
            results.append({"communication_id": event.communication_id, "error": str(e), "ok": False})
    return {"processed": len(results), "results": results}
