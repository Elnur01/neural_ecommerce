"""
Agent router — exposes the LangGraph CustomerExperienceAgent as REST endpoints.

POST /agent/intervene
    Body: { "intent_score", "lstm_segment", "cart_value",
            "session_history", "session_id", "user_id" }
    Returns: { "intervention_status", "action", "message", "langgraph_segment" }

POST /agent/pipeline
    Combined endpoint: auto-runs LSTM inference then agent for a given user+session.
    Body: { "user_id", "session_id" }
    Returns: LSTM result + agent result merged.

GET /agent/segment_map
    Returns the LSTM → LangGraph segment name mapping (debugging/docs).

GET /agent/status
    Returns whether the agent is initialized and ready.
"""

import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.models import Event, User, Cart, CartItem, Product
from app.services import agent_service, lstm_inference

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class InterventionRequest(BaseModel):
    intent_score:     float           = Field(..., ge=0.0, le=1.0)
    lstm_segment:     str             = Field(..., description="Segment name from LSTM model")
    cart_value:       float           = Field(default=0.0, ge=0.0)
    session_history:  List[Dict[str, Any]] = Field(default_factory=list)
    session_id:       str             = Field(default="unknown")
    user_id:          str             = Field(default="unknown")


class PipelineRequest(BaseModel):
    user_id:    str
    session_id: str


class InterventionResponse(BaseModel):
    intervention_status: bool
    action:              str
    message:             str
    langgraph_segment:   str


class PipelineResponse(BaseModel):
    # LSTM outputs
    abandonment_probability: float
    lstm_segment:            str
    segment_probabilities:   Dict[str, float]
    should_intervene:        bool
    # Agent outputs
    intervention_status:     bool
    action:                  str
    message:                 str
    langgraph_segment:       str


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _get_cart_value(user_uuid: uuid.UUID, db: Session) -> float:
    """Compute current cart total from DB."""
    cart = db.query(Cart).filter(Cart.customer_id == user_uuid).first()
    if not cart:
        return 0.0
    items = db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).all()
    total = 0.0
    for item in items:
        product = db.query(Product).filter(Product.product_id == item.product_id).first()
        if product:
            price = float(product.price or 0)
            discount = float(product.discount_rate or 0)
            total += price * (1 - discount) * item.quantity
    return round(total, 2)


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/intervene", response_model=InterventionResponse,
             summary="Run LangGraph agent with supplied LSTM outputs")
def intervene(body: InterventionRequest):
    """
    Run the LangGraph agent with caller-supplied LSTM outputs.
    The lstm_segment is adapted to the LangGraph naming convention internally.
    """
    try:
        result = agent_service.run_intervention(
            intent_score=body.intent_score,
            lstm_segment=body.lstm_segment,
            cart_value=body.cart_value,
            session_history=body.session_history,
            session_id=body.session_id,
            user_id=body.user_id,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=f"Agent not ready: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Agent error: {exc}")

    return InterventionResponse(**result)


@router.post("/pipeline", response_model=PipelineResponse,
             summary="Full pipeline: LSTM inference + LangGraph agent from DB")
def pipeline(body: PipelineRequest, db: Session = Depends(get_db)):
    """
    Fetches session events and user demographics from the DB, runs LSTM inference,
    then (if should_intervene) runs the LangGraph agent.
    This is the endpoint used by the real-time trigger logic (Stage 4).
    """
    try:
        user_uuid    = uuid.UUID(body.user_id)
        session_uuid = uuid.UUID(body.session_id)
    except ValueError:
        raise HTTPException(status_code=422, detail="Invalid UUID format")

    # Fetch user
    user: Optional[User] = db.query(User).filter(User.customer_id == user_uuid).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Fetch events
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

    # Run LSTM inference
    try:
        lstm_result = lstm_inference.predict_abandonment(events=events, demographics=demographics)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=f"LSTM not ready: {exc}")

    # Run agent if intervention needed
    cart_value = _get_cart_value(user_uuid, db)
    session_history = [{"event_type": ev.get("event_type")} for ev in events[-5:]]

    if lstm_result["should_intervene"]:
        try:
            agent_result = agent_service.run_intervention(
                intent_score=lstm_result["abandonment_probability"],
                lstm_segment=lstm_result["segment"],
                cart_value=cart_value,
                session_history=session_history,
                session_id=body.session_id,
                user_id=body.user_id,
            )
        except RuntimeError as exc:
            raise HTTPException(status_code=503, detail=f"Agent not ready: {exc}")
    else:
        agent_result = {
            "intervention_status": False,
            "action":              "",
            "message":             "",
            "langgraph_segment":   agent_service.adapt_segment(lstm_result["segment"]),
        }

    return PipelineResponse(
        **lstm_result,
        lstm_segment=lstm_result["segment"],
        **agent_result,
    )


@router.get("/segment_map", summary="Show LSTM → LangGraph segment name mapping")
def segment_map():
    """Returns the full mapping table for debugging and documentation."""
    return agent_service._SEGMENT_MAP


@router.get("/status", summary="Check if LangGraph agent is initialized and ready")
def status():
    return {"ready": agent_service._agent_ready}
