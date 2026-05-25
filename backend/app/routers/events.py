"""
Events router — batched event ingestion for the sequential research dataset.
"""

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models.models import Event, Session, User, Product, Order
from app.schemas.schemas import EventBatchCreate, SessionCreate
from app.routers.auth import get_current_user

router = APIRouter()


@router.post("/sessions", status_code=status.HTTP_201_CREATED)
def create_session(
    body: SessionCreate,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    existing_session = db.query(Session).filter(Session.session_id == body.session_id).first()
    if existing_session:
        return {"session_id": str(existing_session.session_id)}
        
    session = Session(session_id=body.session_id, customer_id=current_user.customer_id, user_agent=body.user_agent)
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
            abandonment_stage=evt.abandonment_stage,
            budget_utilization_pct=evt.budget_utilization_pct,
            time_since_session_start_sec=evt.time_since_session_start_sec,
            image_index=evt.image_index,
            total_images_available=evt.total_images_available,
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

    events = db.query(Event).filter(Event.session_id == session_id).order_by(Event.event_timestamp).all()
    event_types = [e.event_type for e in events]
    page_urls = [e.page_url for e in events if e.page_url]
    
    has_order = "order_completed" in event_types
    has_add = "add_to_cart" in event_types
    reached_checkout = any(url and "/checkout" in url for url in page_urls)
    payment_submitted = "payment_submit" in event_types # Assuming this is an event

    if has_order:
        abandonment_stage = "completed"
    elif payment_submitted:
        abandonment_stage = "abandoned_payment"
    elif reached_checkout:
        abandonment_stage = "abandoned_checkout"
    elif has_add:
        abandonment_stage = "abandoned_cart"
    else:
        abandonment_stage = "abandoned_browse"

    # WP-4: Mission alignment
    EXPECTED_CATEGORIES = {
        'A_replacement': ['phones'],
        'B_upgrade':     ['laptops', 'monitors'],
        'C_gift':        ['headphones', 'audio', 'wearables', 'gaming'],
        'D_browse':      None,
    }
    
    unique_categories = set()
    # To determine unique categories, we'd ideally join with products, but here we can just query the DB for the product_ids in the session
    product_ids_visited = {e.product_id for e in events if e.product_id is not None}
    if product_ids_visited:
        visited_products = db.query(Product).filter(Product.product_id.in_(product_ids_visited)).all()
        unique_categories = {p.category for p in visited_products}
        
    purchased_category = None
    if has_order:
        # Get category of purchased item. If multiple, pick first for simplicity.
        order = db.query(Order).filter(Order.customer_id == current_user.customer_id).order_by(Order.created_at.desc()).first()
        if order and order.items:
            purchased_prod = db.query(Product).filter(Product.product_id == order.items[0].product_id).first()
            if purchased_prod:
                purchased_category = purchased_prod.category

    scenario_id = current_user.scenario_id
    mission_alignment_score = 0.0
    if scenario_id == 'D_browse':
        mission_alignment_score = 1.0 if len(events) > 5 else 0.5
    else:
        expected = EXPECTED_CATEGORIES.get(scenario_id, [])
        overlap = len(set(expected) & unique_categories) / max(len(expected), 1)
        in_target = has_order and (purchased_category in expected)
        if in_target:
            mission_alignment_score = 1.0
        elif has_order and not in_target:
            mission_alignment_score = 0.3
        elif overlap > 0:
            mission_alignment_score = 0.5 + 0.3 * overlap
        else:
            mission_alignment_score = 0.2

    session.ended_at = datetime.now(timezone.utc)
    session.abandonment_stage = abandonment_stage
    session.mission_alignment_score = mission_alignment_score
    session.mission_completed_inferred = mission_alignment_score >= 0.7
    db.commit()

    return {"session_id": str(session_id), "abandonment_stage": session.abandonment_stage}
