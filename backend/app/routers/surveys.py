from typing import Optional
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from pydantic import BaseModel
import uuid

from app.database import get_db
from app.models.models import User, PostSessionSurvey
from app.routers.auth import get_current_user

router = APIRouter()

class SurveySubmitRequest(BaseModel):
    session_id: uuid.UUID
    scenario_id: Optional[str] = None
    survey_lang: Optional[str] = None
    intent_to_buy: Optional[str] = None
    completed_purchase: Optional[bool] = None
    abandonment_reason: Optional[str] = None
    abandonment_reason_other: Optional[str] = None
    mission_completed_self_report: Optional[str] = None
    mission_recall_text: Optional[str] = None
    scenario_realism_score: Optional[int] = None
    overall_realism_score: Optional[int] = None
    free_text: Optional[str] = None

@router.post("")
def submit_survey(
    body: SurveySubmitRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    survey = PostSessionSurvey(
        customer_id=current_user.customer_id,
        session_id=body.session_id,
        scenario_id=body.scenario_id,
        survey_lang=body.survey_lang,
        intent_to_buy=body.intent_to_buy,
        completed_purchase=body.completed_purchase,
        abandonment_reason=body.abandonment_reason,
        abandonment_reason_other=body.abandonment_reason_other,
        mission_completed_self_report=body.mission_completed_self_report,
        mission_recall_text=body.mission_recall_text,
        scenario_realism_score=body.scenario_realism_score,
        overall_realism_score=body.overall_realism_score,
        free_text=body.free_text,
    )
    db.add(survey)
    db.commit()
    return {"ok": True}
