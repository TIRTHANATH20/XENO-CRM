from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Segment
from app.schemas import CustomerOut, SegmentCreate, SegmentOut, SegmentUpdate
from app.services.segmentation import create_segment, delete_segment, get_segment_customers, refresh_segment_count, update_segment

router = APIRouter(prefix="/api/segments", tags=["segments"])


@router.get("", response_model=list[SegmentOut])
def list_segments(db: Session = Depends(get_db)):
    segments = db.query(Segment).order_by(Segment.created_at.desc()).all()
    for segment in segments:
        try:
            refresh_segment_count(db, segment.id)
        except ValueError:
            continue
    return db.query(Segment).order_by(Segment.created_at.desc()).all()


@router.get("/{segment_id}", response_model=SegmentOut)
def get_segment(segment_id: int, db: Session = Depends(get_db)):
    segment = db.query(Segment).filter(Segment.id == segment_id).first()
    if not segment:
        raise HTTPException(404, "Segment not found")
    return segment


@router.post("", response_model=SegmentOut)
def create_segment_endpoint(data: SegmentCreate, db: Session = Depends(get_db)):
    criteria = data.filter_criteria
    if hasattr(criteria, "model_dump"):
        criteria = criteria.model_dump(exclude_none=True)
    try:
        return create_segment(db, data.name, data.description, criteria, data.is_ai_generated)
    except ValueError as e:
        raise HTTPException(status_code=409, detail=str(e))


@router.delete("/{segment_id}")
def delete_segment_endpoint(segment_id: int, db: Session = Depends(get_db)):
    try:
        delete_segment(db, segment_id)
        return {"success": True}
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.get("/{segment_id}/customers", response_model=list[CustomerOut])
def segment_customers(segment_id: int, db: Session = Depends(get_db)):
    try:
        return get_segment_customers(db, segment_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.patch("/{segment_id}", response_model=SegmentOut)
def update_segment_endpoint(segment_id: int, data: SegmentUpdate, db: Session = Depends(get_db)):
    try:
        return update_segment(db, segment_id, data.name, data.description)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/{segment_id}/refresh", response_model=SegmentOut)
def refresh_segment(segment_id: int, db: Session = Depends(get_db)):
    try:
        return refresh_segment_count(db, segment_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/{segment_id}/add_customer", response_model=SegmentOut)
def add_customer_to_segment(segment_id: int, payload: dict, db: Session = Depends(get_db)):
    """Add a specific customer to a segment's explicit include list and refresh count."""
    customer_id = payload.get("customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="customer_id is required")

    segment = db.query(Segment).filter(Segment.id == segment_id).first()
    if not segment:
        raise HTTPException(404, "Segment not found")

    criteria = segment.filter_criteria or {}
    include_ids = list(criteria.get("include_ids") or [])
    try:
        cid = int(customer_id)
    except Exception:
        raise HTTPException(status_code=400, detail="customer_id must be an integer")
    if cid not in include_ids:
        include_ids.append(cid)
    criteria["include_ids"] = include_ids
    # Use update to ensure JSON change is persisted
    db.query(Segment).filter(Segment.id == segment_id).update({"filter_criteria": criteria})
    db.commit()
    segment = db.query(Segment).filter(Segment.id == segment_id).first()

    try:
        return refresh_segment_count(db, segment_id)
    except ValueError as e:
        raise HTTPException(404, str(e))


@router.post("/auto-categorize", response_model=dict)
def auto_categorize_all(db: Session = Depends(get_db)):
    """Refresh all segment counts to auto-categorize customers based on their current data."""
    from app.services.segmentation import refresh_segment_count
    
    segments = db.query(Segment).all()
    count = 0
    for segment in segments:
        try:
            refresh_segment_count(db, segment.id)
            count += 1
        except ValueError:
            continue
    return {"auto_categorized": count, "total_segments": len(segments), "message": f"Re-categorized {count} segments based on current customer data."}

