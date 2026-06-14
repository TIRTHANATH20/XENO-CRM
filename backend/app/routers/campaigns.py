from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Campaign, Communication
from app.schemas import CampaignCreate, CampaignOut, CommunicationOut
from app.services.campaigns import send_campaign
from app.services.analytics import get_campaign_performance

router = APIRouter(prefix="/api/campaigns", tags=["campaigns"])


@router.get("", response_model=list[CampaignOut])
def list_campaigns(db: Session = Depends(get_db)):
    return db.query(Campaign).order_by(Campaign.created_at.desc()).all()


@router.get("/{campaign_id}", response_model=CampaignOut)
def get_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    return campaign


@router.post("", response_model=CampaignOut)
def create_campaign(data: CampaignCreate, db: Session = Depends(get_db)):
    campaign = Campaign(
        name=data.name,
        segment_id=data.segment_id,
        message_template=data.message_template,
        channel=data.channel,
        status=data.status,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return campaign


@router.post("/{campaign_id}/send", response_model=CampaignOut)
async def send_campaign_endpoint(campaign_id: int, db: Session = Depends(get_db)):
    try:
        return await send_campaign(db, campaign_id)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.delete("/{campaign_id}")
def delete_campaign(campaign_id: int, db: Session = Depends(get_db)):
    campaign = db.query(Campaign).filter(Campaign.id == campaign_id).first()
    if not campaign:
        raise HTTPException(404, "Campaign not found")
    db.delete(campaign)
    db.commit()
    return {"message": "Campaign deleted"}


@router.get("/{campaign_id}/communications", response_model=list[CommunicationOut])
def campaign_communications(campaign_id: int, db: Session = Depends(get_db)):
    return db.query(Communication).filter(Communication.campaign_id == campaign_id).all()


@router.get("/{campaign_id}/performance")
def campaign_performance(campaign_id: int, db: Session = Depends(get_db)):
    try:
        result = get_campaign_performance(db, campaign_id)
        campaign = result["campaign"]
        return {
            "campaign_id": campaign.id,
            "name": campaign.name,
            "status": campaign.status,
            "funnel": result["funnel"],
            "rates": result["rates"],
        }
    except ValueError as e:
        raise HTTPException(404, str(e))
