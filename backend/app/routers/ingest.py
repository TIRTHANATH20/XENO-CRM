from fastapi import APIRouter, Depends

from app.database import get_db
from app.schemas import IngestPayload
from app.services.ingest import ingest_data
from sqlalchemy.orm import Session

router = APIRouter(prefix="/api/ingest", tags=["ingest"])


@router.post("")
def ingest(payload: IngestPayload, db: Session = Depends(get_db)):
    return ingest_data(db, payload)
