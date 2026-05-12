from datetime import datetime
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models.models import User
from app.routers.auth import get_current_user
from pydantic import BaseModel

router = APIRouter()

class ScenarioAcknowledgeRequest(BaseModel):
    scenario_id: str
    scenario_label: str
    scenario_intent_level: str
    scenario_text_shown: str
    scenario_text_lang: str
    scenario_text_version: str
    scenario_read_time_sec: int

@router.post("/acknowledge")
def acknowledge_scenario(
    body: ScenarioAcknowledgeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.scenario_id = body.scenario_id
    current_user.scenario_label = body.scenario_label
    current_user.scenario_intent_level = body.scenario_intent_level
    current_user.scenario_text_shown = body.scenario_text_shown
    current_user.scenario_text_lang = body.scenario_text_lang
    current_user.scenario_text_version = body.scenario_text_version
    current_user.scenario_read_time_sec = body.scenario_read_time_sec
    current_user.scenario_acknowledged_at = datetime.utcnow()
    
    db.commit()
    return {"ok": True}
