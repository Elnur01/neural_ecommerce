"""
Inference router — exposes the LSTM cart-abandonment model as a REST endpoint.

POST /inference/predict
    Body: { "session_id": str, "events": [...], "demographics": {...} }
    Returns: { "abandonment_probability": float, "segment": str,
               "segment_probabilities": {...}, "should_intervene": bool }

POST /inference/predict_for_user
    Body: { "user_id": str, "session_id": str }
    Auto-fetches events + demographics from the DB and runs inference.
"""

import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Event, User
from app.services import lstm_inference

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class EventInput(BaseModel):
    event_type:              str
    time_on_page_sec:        Optional[float] = 0.0
    product_price:           Optional[float] = 0.0
    discount_rate:           Optional[float] = 0.0
    scroll_depth_pct:        Optional[float] = 0.0
    review_section_visited:  Optional[bool]  = False
    images_viewed_count:     Optional[int]   = 0
    back_button_count:       Optional[int]   = 0
    cart_total_at_event:     Optional[float] = 0.0
    items_in_cart:           Optional[int]   = 0
    exit_intent_triggered:   Optional[bool]  = False


class DemographicsInput(BaseModel):
    age_group:              Optional[str]   = "unknown"
    gender:                 Optional[str]   = "unknown"
    city_tier:              Optional[str]   = "unknown"
    loyalty_tier:           Optional[str]   = "Bronze"
    preferred_device:       Optional[str]   = "unknown"
    account_age_days:       Optional[int]   = 0
    lifetime_order_count:   Optional[int]   = 0
    avg_order_value:        Optional[float] = 0.0
    total_order_value:      Optional[float] = 0.0
    payment_method_saved:   Optional[bool]  = False
    last_purchase_date:     Optional[str]   = None
    avg_cart_value:         Optional[float] = None


class PredictRequest(BaseModel):
    session_id:   Optional[str]             = None
    events:       List[EventInput]
    demographics: DemographicsInput


class PredictFromDBRequest(BaseModel):
    user_id:    str
    session_id: str


class PredictResponse(BaseModel):
    abandonment_probability: float
    segment:                 str
    segment_probabilities:   Dict[str, float]
    should_intervene:        bool
    cart_exit_detected:      bool  = False
    threshold_used:          float = 0.70


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/predict", response_model=PredictResponse, summary="Run LSTM inference with provided data")
def predict(body: PredictRequest):
    """
    Run LSTM abandonment inference with caller-supplied events and demographics.
    Useful for testing or external callers that already have the data in memory.
    """
    try:
        result = lstm_inference.predict_abandonment(
            events=[e.model_dump() for e in body.events],
            demographics=body.demographics.model_dump(),
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=f"LSTM model not ready: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference error: {exc}")

    return PredictResponse(**result)


@router.post("/predict_for_user", response_model=PredictResponse,
             summary="Run LSTM inference by fetching session data from DB")
def predict_for_user(body: PredictFromDBRequest, db: Session = Depends(get_db)):
    """
    Fetch the user's session events and profile from the database, then run
    LSTM inference. This is the endpoint called by the real-time trigger logic.
    """
    try:
        user_uuid    = uuid.UUID(body.user_id)
        session_uuid = uuid.UUID(body.session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    # Fetch user demographics
    user: Optional[User] = db.query(User).filter(User.customer_id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch session events ordered by timestamp
    events_db = (
        db.query(Event)
        .filter(Event.session_id == session_uuid, Event.customer_id == user_uuid)
        .order_by(Event.event_timestamp)
        .all()
    )

    events = [
        {
            "event_type":             ev.event_type,
            "time_on_page_sec":       float(ev.time_on_page_sec or 0),
            "product_price":          float(ev.product_price or 0),
            "discount_rate":          float(ev.discount_rate or 0),
            "scroll_depth_pct":       float(ev.scroll_depth_pct or 0),
            "review_section_visited": bool(ev.review_section_visited),
            "images_viewed_count":    int(ev.images_viewed_count or 0),
            "back_button_count":      int(ev.back_button_count or 0),
            "cart_total_at_event":    float(ev.cart_total_at_event or 0),
            "items_in_cart":          int(ev.items_in_cart or 0),
            "exit_intent_triggered":  bool(ev.exit_intent_triggered),
        }
        for ev in events_db
    ]

    demographics = {
        "age_group":            user.age_group,
        "gender":               user.gender,
        "city_tier":            user.city_tier,
        "loyalty_tier":         user.loyalty_tier,
        "preferred_device":     user.preferred_device,
        "account_age_days":     user.account_age_days,
        "lifetime_order_count": user.lifetime_order_count,
        "avg_order_value":      float(user.avg_order_value or 0),
        "total_order_value":    float(user.total_order_value or 0),
        "payment_method_saved": user.payment_method_saved,
        "last_purchase_date":   str(user.last_purchase_date) if user.last_purchase_date else None,
    }

    try:
        result = lstm_inference.predict_abandonment(
            events=events,
            demographics=demographics,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=f"LSTM model not ready: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Inference error: {exc}")

    return PredictResponse(**result)


@router.get("/status", summary="Check if LSTM model is loaded and ready")
def status():
    """Returns whether the LSTM inference service has been initialized."""
    return {"ready": lstm_inference._ready}
