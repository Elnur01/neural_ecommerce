"""
Events router — batched event ingestion for the sequential research dataset.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models.models import Event, Session, User
from app.schemas.schemas import EventBatchCreate, SessionCreate
from app.routers.auth import get_current_user

router = APIRouter()


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
def create_session(
    body: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    session = Session(customer_id=current_user.customer_id, user_agent=body.user_agent)
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"session_id": str(session.session_id)}


@router.post("", status_code=status.HTTP_201_CREATED)
def ingest_events(
    body: EventBatchCreate,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    if not body.events:
        raise HTTPException(status_code=400, detail="Event batch cannot be empty.")

    for evt in body.events:
        event = Event(
            session_id=evt.session_id,
            customer_id=current_user.customer_id,
            event_type=evt.event_type,
            page_url=evt.page_url,
            product_id=evt.product_id,
            time_on_page_sec=evt.time_on_page_sec,
            product_price=evt.product_price,
            discount_rate=evt.discount_rate,
            scroll_depth_pct=evt.scroll_depth_pct,
            review_section_visited=evt.review_section_visited,
            images_viewed_count=evt.images_viewed_count,
            back_button_count=evt.back_button_count,
            cart_total_at_event=evt.cart_total_at_event,
            items_in_cart=evt.items_in_cart,
            exit_intent_triggered=evt.exit_intent_triggered,
            cart_add_remove_count=evt.cart_add_remove_count,
            search_bar_used=evt.search_bar_used,
            coupon_applied=evt.coupon_applied,
            shipping_fee=evt.shipping_fee,
            abandonment_status=evt.abandonment_status,
        )
        db.add(event)

    db.commit()
    return {"inserted": len(body.events)}


@router.post("/sessions/{session_id}/close")
def close_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    session = db.query(Session).filter(
        Session.session_id == session_id,
        Session.customer_id == current_user.customer_id,
    ).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found.")

    has_order = db.query(Event).filter(
        Event.session_id == session_id, Event.event_type == "order_completed"
    ).first()

    session.ended_at = datetime.now(timezone.utc)
    session.abandonment_status = not bool(has_order)
    db.commit()

    return {"session_id": str(session_id), "abandonment_status": session.abandonment_status}
