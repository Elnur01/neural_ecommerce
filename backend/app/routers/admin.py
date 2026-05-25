"""
Admin router — research dashboard API endpoints.

Provides aggregated data for the admin panel: demographics, events,
sessions, orders, surveys, funnels, and CSV export.
"""

import csv
import io
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, case, distinct, desc, text
from sqlalchemy.orm import Session as DBSession

from app.config import settings
from app.database import get_db
from app.models.models import (
    User,
    Session,
    Event,
    Order,
    OrderItem,
    Product,
    Cart,
    CartItem,
    Coupon,
    PostSessionSurvey,
)

router = APIRouter()


# ── Admin PIN verification ────────────────────────────────────────────
ADMIN_TOKEN_HEADER = "X-Admin-Token"


def _verify_admin(token: str = Query(None, alias="admin_token")):
    """Simple admin PIN check via query param or could be header-based."""
    if token != settings.ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid admin credentials")
    return True


# ══════════════════════════════════════════════════════════════════════
# PIN VERIFICATION
# ══════════════════════════════════════════════════════════════════════
@router.post("/verify")
def verify_pin(body: dict):
    """Verify admin PIN and return success."""
    pin = body.get("pin", "")
    if pin != settings.ADMIN_PIN:
        raise HTTPException(status_code=403, detail="Invalid PIN")
    return {"ok": True, "token": settings.ADMIN_PIN}


# ══════════════════════════════════════════════════════════════════════
# OVERVIEW — Aggregated KPIs
# ══════════════════════════════════════════════════════════════════════
@router.get("/overview")
def get_overview(
    _: bool = Depends(_verify_admin),
    db: DBSession = Depends(get_db),
):
    total_users = db.query(func.count(User.customer_id)).scalar() or 0
    total_sessions = db.query(func.count(Session.session_id)).scalar() or 0
    total_events = db.query(func.count(Event.event_id)).scalar() or 0
    total_orders = db.query(func.count(Order.order_id)).scalar() or 0
    total_surveys = db.query(func.count(PostSessionSurvey.survey_id)).scalar() or 0

    completed_sessions = (
        db.query(func.count(Session.session_id))
        .filter(Session.abandonment_stage == "completed")
        .scalar()
        or 0
    )
    completion_rate = (
        round(completed_sessions / total_sessions * 100, 1) if total_sessions > 0 else 0
    )

    avg_scenario_realism = (
        db.query(func.avg(PostSessionSurvey.scenario_realism_score)).scalar()
    )
    avg_overall_realism = (
        db.query(func.avg(PostSessionSurvey.overall_realism_score)).scalar()
    )

    total_revenue = db.query(func.sum(Order.total)).scalar() or 0
    avg_order_value = (
        db.query(func.avg(Order.total)).scalar() or 0
    )

    # Events today
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)
    events_today = (
        db.query(func.count(Event.event_id))
        .filter(Event.event_timestamp >= today_start)
        .scalar()
        or 0
    )

    return {
        "total_users": total_users,
        "total_sessions": total_sessions,
        "total_events": total_events,
        "total_orders": total_orders,
        "total_surveys": total_surveys,
        "completion_rate": completion_rate,
        "completed_sessions": completed_sessions,
        "avg_scenario_realism": round(float(avg_scenario_realism), 1) if avg_scenario_realism else None,
        "avg_overall_realism": round(float(avg_overall_realism), 1) if avg_overall_realism else None,
        "total_revenue": float(total_revenue),
        "avg_order_value": round(float(avg_order_value), 2) if avg_order_value else 0,
        "events_today": events_today,
    }


# ══════════════════════════════════════════════════════════════════════
# DEMOGRAPHICS — Aggregated breakdowns for charts
# ══════════════════════════════════════════════════════════════════════
@router.get("/demographics")
def get_demographics(
    _: bool = Depends(_verify_admin),
    db: DBSession = Depends(get_db),
):
    # Age group distribution
    age_groups = (
        db.query(User.age_group, func.count(User.customer_id))
        .group_by(User.age_group)
        .all()
    )

    # Gender distribution
    genders = (
        db.query(User.gender, func.count(User.customer_id))
        .group_by(User.gender)
        .all()
    )

    # City tier distribution
    city_tiers = (
        db.query(User.city_tier, func.count(User.customer_id))
        .group_by(User.city_tier)
        .all()
    )

    # Device distribution
    devices = (
        db.query(User.preferred_device, func.count(User.customer_id))
        .group_by(User.preferred_device)
        .all()
    )

    # Scenario distribution
    scenarios = (
        db.query(User.scenario_id, User.scenario_label, func.count(User.customer_id))
        .group_by(User.scenario_id, User.scenario_label)
        .all()
    )

    # Intent level distribution
    intent_levels = (
        db.query(User.scenario_intent_level, func.count(User.customer_id))
        .group_by(User.scenario_intent_level)
        .all()
    )

    # Age × Gender cross-tab
    age_gender = (
        db.query(User.age_group, User.gender, func.count(User.customer_id))
        .group_by(User.age_group, User.gender)
        .all()
    )

    # Loyalty tier distribution
    loyalty_tiers = (
        db.query(User.loyalty_tier, func.count(User.customer_id))
        .group_by(User.loyalty_tier)
        .all()
    )

    return {
        "age_groups": [{"label": r[0] or "Unknown", "count": r[1]} for r in age_groups],
        "genders": [{"label": r[0] or "Unknown", "count": r[1]} for r in genders],
        "city_tiers": [{"label": r[0] or "Unknown", "count": r[1]} for r in city_tiers],
        "devices": [{"label": r[0] or "Unknown", "count": r[1]} for r in devices],
        "scenarios": [
            {"id": r[0] or "Unknown", "label": r[1] or "Unknown", "count": r[2]}
            for r in scenarios
        ],
        "intent_levels": [{"label": r[0] or "Unknown", "count": r[1]} for r in intent_levels],
        "age_gender": [
            {"age_group": r[0] or "Unknown", "gender": r[1] or "Unknown", "count": r[2]}
            for r in age_gender
        ],
        "loyalty_tiers": [{"label": r[0] or "Unknown", "count": r[1]} for r in loyalty_tiers],
    }


# ══════════════════════════════════════════════════════════════════════
# PARTICIPANTS — Paginated user list
# ══════════════════════════════════════════════════════════════════════
@router.get("/participants")
def get_participants(
    _: bool = Depends(_verify_admin),
    db: DBSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    scenario: Optional[str] = None,
    age_group: Optional[str] = None,
    gender: Optional[str] = None,
    city_tier: Optional[str] = None,
):
    q = db.query(User)
    if scenario:
        q = q.filter(User.scenario_id == scenario)
    if age_group:
        q = q.filter(User.age_group == age_group)
    if gender:
        q = q.filter(User.gender == gender)
    if city_tier:
        q = q.filter(User.city_tier == city_tier)

    total = q.count()
    users = q.order_by(User.created_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "participants": [
            {
                "customer_id": str(u.customer_id),
                "email": u.email,
                "age_group": u.age_group,
                "raw_age": u.raw_age,
                "gender": u.gender,
                "raw_city": u.raw_city,
                "city_tier": u.city_tier,
                "preferred_device": u.preferred_device,
                "payment_method_saved": u.payment_method_saved,
                "monthly_shopping_frequency": u.monthly_shopping_frequency,
                "last_purchase_date": str(u.last_purchase_date) if u.last_purchase_date else None,
                "loyalty_tier": u.loyalty_tier,
                "credit_balance": float(u.credit_balance) if u.credit_balance else 0,
                "credit_balance_initial": float(u.credit_balance_initial) if u.credit_balance_initial else 0,
                "scenario_id": u.scenario_id,
                "scenario_label": u.scenario_label,
                "scenario_intent_level": u.scenario_intent_level,
                "created_at": u.created_at.isoformat() if u.created_at else None,
            }
            for u in users
        ],
    }


@router.get("/participants/{customer_id}")
def get_participant_detail(
    customer_id: uuid.UUID,
    _: bool = Depends(_verify_admin),
    db: DBSession = Depends(get_db),
):
    user = db.query(User).filter(User.customer_id == customer_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    sessions = (
        db.query(Session)
        .filter(Session.customer_id == customer_id)
        .order_by(Session.started_at.desc())
        .all()
    )

    events = (
        db.query(Event)
        .filter(Event.customer_id == customer_id)
        .order_by(Event.event_timestamp.desc())
        .limit(100)
        .all()
    )

    orders = (
        db.query(Order)
        .filter(Order.customer_id == customer_id)
        .order_by(Order.created_at.desc())
        .all()
    )

    return {
        "user": {
            "customer_id": str(user.customer_id),
            "email": user.email,
            "age_group": user.age_group,
            "raw_age": user.raw_age,
            "gender": user.gender,
            "raw_city": user.raw_city,
            "city_tier": user.city_tier,
            "preferred_device": user.preferred_device,
            "payment_method_saved": user.payment_method_saved,
            "monthly_shopping_frequency": user.monthly_shopping_frequency,
            "last_purchase_date": str(user.last_purchase_date) if user.last_purchase_date else None,
            "loyalty_tier": user.loyalty_tier,
            "lifetime_order_count": user.lifetime_order_count,
            "total_order_value": float(user.total_order_value) if user.total_order_value else 0,
            "avg_order_value": float(user.avg_order_value) if user.avg_order_value else 0,
            "credit_balance": float(user.credit_balance) if user.credit_balance else 0,
            "credit_balance_initial": float(user.credit_balance_initial) if user.credit_balance_initial else 0,
            "scenario_id": user.scenario_id,
            "scenario_label": user.scenario_label,
            "scenario_intent_level": user.scenario_intent_level,
            "scenario_text_shown": user.scenario_text_shown,
            "device_fingerprint": user.device_fingerprint,
            "created_at": user.created_at.isoformat() if user.created_at else None,
        },
        "sessions": [
            {
                "session_id": str(s.session_id),
                "started_at": s.started_at.isoformat() if s.started_at else None,
                "ended_at": s.ended_at.isoformat() if s.ended_at else None,
                "abandonment_stage": s.abandonment_stage,
                "mission_alignment_score": s.mission_alignment_score,
                "mission_completed_inferred": s.mission_completed_inferred,
            }
            for s in sessions
        ],
        "recent_events": [
            {
                "event_id": str(e.event_id),
                "event_type": e.event_type,
                "page_url": e.page_url,
                "event_timestamp": e.event_timestamp.isoformat() if e.event_timestamp else None,
                "time_on_page_sec": e.time_on_page_sec,
                "scroll_depth_pct": e.scroll_depth_pct,
            }
            for e in events
        ],
        "orders": [
            {
                "order_id": str(o.order_id),
                "total": float(o.total),
                "shipping_fee": float(o.shipping_fee) if o.shipping_fee else 0,
                "coupon_code": o.coupon_code,
                "discount_amount": float(o.discount_amount) if o.discount_amount else 0,
                "created_at": o.created_at.isoformat() if o.created_at else None,
            }
            for o in orders
        ],
    }


# ══════════════════════════════════════════════════════════════════════
# SESSIONS
# ══════════════════════════════════════════════════════════════════════
@router.get("/sessions")
def get_sessions(
    _: bool = Depends(_verify_admin),
    db: DBSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    abandonment_stage: Optional[str] = None,
):
    q = db.query(Session)
    if abandonment_stage:
        q = q.filter(Session.abandonment_stage == abandonment_stage)

    total = q.count()
    sessions = q.order_by(Session.started_at.desc()).offset((page - 1) * per_page).limit(per_page).all()

    results = []
    for s in sessions:
        user = db.query(User).filter(User.customer_id == s.customer_id).first()
        duration = None
        if s.started_at and s.ended_at:
            duration = round((s.ended_at - s.started_at).total_seconds())

        event_count = db.query(func.count(Event.event_id)).filter(Event.session_id == s.session_id).scalar() or 0

        results.append({
            "session_id": str(s.session_id),
            "customer_id": str(s.customer_id),
            "customer_email": user.email if user else None,
            "scenario_id": user.scenario_id if user else s.scenario_id,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
            "duration_sec": duration,
            "abandonment_stage": s.abandonment_stage,
            "mission_alignment_score": s.mission_alignment_score,
            "mission_completed_inferred": s.mission_completed_inferred,
            "event_count": event_count,
            "user_agent": s.user_agent,
        })

    return {"total": total, "page": page, "per_page": per_page, "sessions": results}


# ══════════════════════════════════════════════════════════════════════
# EVENTS
# ══════════════════════════════════════════════════════════════════════
@router.get("/events")
def get_events(
    _: bool = Depends(_verify_admin),
    db: DBSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
    event_type: Optional[str] = None,
    customer_id: Optional[str] = None,
    session_id: Optional[str] = None,
):
    q = db.query(Event)
    if event_type:
        q = q.filter(Event.event_type == event_type)
    if customer_id:
        q = q.filter(Event.customer_id == customer_id)
    if session_id:
        q = q.filter(Event.session_id == session_id)

    total = q.count()
    events = q.order_by(Event.event_timestamp.desc()).offset((page - 1) * per_page).limit(per_page).all()

    return {
        "total": total,
        "page": page,
        "per_page": per_page,
        "events": [
            {
                "event_id": str(e.event_id),
                "session_id": str(e.session_id),
                "customer_id": str(e.customer_id),
                "event_timestamp": e.event_timestamp.isoformat() if e.event_timestamp else None,
                "event_type": e.event_type,
                "page_url": e.page_url,
                "product_id": str(e.product_id) if e.product_id else None,
                "time_on_page_sec": e.time_on_page_sec,
                "product_price": float(e.product_price) if e.product_price else None,
                "discount_rate": e.discount_rate,
                "scroll_depth_pct": e.scroll_depth_pct,
                "review_section_visited": e.review_section_visited,
                "images_viewed_count": e.images_viewed_count,
                "back_button_count": e.back_button_count,
                "cart_total_at_event": float(e.cart_total_at_event) if e.cart_total_at_event else 0,
                "items_in_cart": e.items_in_cart,
                "exit_intent_triggered": e.exit_intent_triggered,
                "cart_add_remove_count": e.cart_add_remove_count,
                "search_bar_used": e.search_bar_used,
                "coupon_applied": e.coupon_applied,
                "shipping_fee": float(e.shipping_fee) if e.shipping_fee else 0,
                "abandonment_stage": e.abandonment_stage,
            }
            for e in events
        ],
    }


@router.get("/events/distribution")
def get_event_distribution(
    _: bool = Depends(_verify_admin),
    db: DBSession = Depends(get_db),
):
    results = (
        db.query(Event.event_type, func.count(Event.event_id))
        .group_by(Event.event_type)
        .order_by(func.count(Event.event_id).desc())
        .all()
    )
    return {
        "distribution": [{"event_type": r[0], "count": r[1]} for r in results]
    }


# ══════════════════════════════════════════════════════════════════════
# ORDERS
# ══════════════════════════════════════════════════════════════════════
@router.get("/orders")
def get_orders(
    _: bool = Depends(_verify_admin),
    db: DBSession = Depends(get_db),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=200),
):
    total = db.query(func.count(Order.order_id)).scalar() or 0
    orders = (
        db.query(Order)
        .order_by(Order.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    results = []
    for o in orders:
        user = db.query(User).filter(User.customer_id == o.customer_id).first()
        items = db.query(OrderItem).filter(OrderItem.order_id == o.order_id).all()
        item_details = []
        for item in items:
            product = db.query(Product).filter(Product.product_id == item.product_id).first()
            item_details.append({
                "product_id": str(item.product_id),
                "product_name": product.name if product else "Unknown",
                "quantity": item.quantity,
                "unit_price": float(item.unit_price),
            })

        results.append({
            "order_id": str(o.order_id),
            "customer_id": str(o.customer_id),
            "customer_email": user.email if user else None,
            "total": float(o.total),
            "shipping_fee": float(o.shipping_fee) if o.shipping_fee else 0,
            "coupon_code": o.coupon_code,
            "discount_amount": float(o.discount_amount) if o.discount_amount else 0,
            "created_at": o.created_at.isoformat() if o.created_at else None,
            "items": item_details,
        })

    return {"total": total, "page": page, "per_page": per_page, "orders": results}


# ══════════════════════════════════════════════════════════════════════
# SURVEYS
# ══════════════════════════════════════════════════════════════════════
@router.get("/surveys")
def get_surveys(
    _: bool = Depends(_verify_admin),
    db: DBSession = Depends(get_db),
):
    surveys = (
        db.query(PostSessionSurvey)
        .order_by(PostSessionSurvey.submitted_at.desc())
        .all()
    )

    results = []
    for s in surveys:
        user = db.query(User).filter(User.customer_id == s.customer_id).first()
        results.append({
            "survey_id": str(s.survey_id),
            "customer_id": str(s.customer_id),
            "customer_email": user.email if user else None,
            "session_id": str(s.session_id),
            "scenario_id": s.scenario_id,
            "survey_lang": s.survey_lang,
            "intent_to_buy": s.intent_to_buy,
            "completed_purchase": s.completed_purchase,
            "abandonment_reason": s.abandonment_reason,
            "abandonment_reason_other": s.abandonment_reason_other,
            "mission_completed_self_report": s.mission_completed_self_report,
            "mission_recall_text": s.mission_recall_text,
            "scenario_realism_score": s.scenario_realism_score,
            "overall_realism_score": s.overall_realism_score,
            "free_text": s.free_text,
            "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None,
        })

    return {"surveys": results, "total": len(results)}


@router.get("/surveys/stats")
def get_survey_stats(
    _: bool = Depends(_verify_admin),
    db: DBSession = Depends(get_db),
):
    total = db.query(func.count(PostSessionSurvey.survey_id)).scalar() or 0
    avg_scenario = db.query(func.avg(PostSessionSurvey.scenario_realism_score)).scalar()
    avg_overall = db.query(func.avg(PostSessionSurvey.overall_realism_score)).scalar()

    completed_count = (
        db.query(func.count(PostSessionSurvey.survey_id))
        .filter(PostSessionSurvey.completed_purchase == True)
        .scalar()
        or 0
    )

    # Intent distribution
    intents = (
        db.query(PostSessionSurvey.intent_to_buy, func.count(PostSessionSurvey.survey_id))
        .group_by(PostSessionSurvey.intent_to_buy)
        .all()
    )

    # Mission completion self-report distribution
    mission_reports = (
        db.query(
            PostSessionSurvey.mission_completed_self_report,
            func.count(PostSessionSurvey.survey_id),
        )
        .group_by(PostSessionSurvey.mission_completed_self_report)
        .all()
    )

    return {
        "total_surveys": total,
        "avg_scenario_realism": round(float(avg_scenario), 2) if avg_scenario else None,
        "avg_overall_realism": round(float(avg_overall), 2) if avg_overall else None,
        "completed_purchase_count": completed_count,
        "completion_rate": round(completed_count / total * 100, 1) if total > 0 else 0,
        "intent_distribution": [
            {"label": r[0] or "Unknown", "count": r[1]} for r in intents
        ],
        "mission_self_report": [
            {"label": r[0] or "Unknown", "count": r[1]} for r in mission_reports
        ],
    }


# ══════════════════════════════════════════════════════════════════════
# FUNNEL
# ══════════════════════════════════════════════════════════════════════
@router.get("/funnel")
def get_funnel(
    _: bool = Depends(_verify_admin),
    db: DBSession = Depends(get_db),
):
    total_signups = db.query(func.count(User.customer_id)).scalar() or 0

    # Users who acknowledged scenario
    scenario_ack = (
        db.query(func.count(User.customer_id))
        .filter(User.scenario_acknowledged_at.isnot(None))
        .scalar()
        or 0
    )

    # Unique customers who visited /shop
    shop_visitors = (
        db.query(func.count(distinct(Event.customer_id)))
        .filter(Event.page_url.like("/shop%"))
        .scalar()
        or 0
    )

    # Unique customers who viewed a product
    product_viewers = (
        db.query(func.count(distinct(Event.customer_id)))
        .filter(Event.page_url.like("/product/%"))
        .scalar()
        or 0
    )

    # Unique customers who added to cart
    cart_adders = (
        db.query(func.count(distinct(Event.customer_id)))
        .filter(Event.event_type == "add_to_cart")
        .scalar()
        or 0
    )

    # Unique customers who started checkout
    checkout_starters = (
        db.query(func.count(distinct(Event.customer_id)))
        .filter(Event.event_type == "checkout_start")
        .scalar()
        or 0
    )

    # Unique customers who completed order
    order_completers = (
        db.query(func.count(distinct(Event.customer_id)))
        .filter(Event.event_type == "order_completed")
        .scalar()
        or 0
    )

    return {
        "funnel": [
            {"stage": "Signed Up", "count": total_signups},
            {"stage": "Scenario Acknowledged", "count": scenario_ack},
            {"stage": "Visited Shop", "count": shop_visitors},
            {"stage": "Viewed Product", "count": product_viewers},
            {"stage": "Added to Cart", "count": cart_adders},
            {"stage": "Started Checkout", "count": checkout_starters},
            {"stage": "Completed Order", "count": order_completers},
        ]
    }


# ══════════════════════════════════════════════════════════════════════
# CSV EXPORT
# ══════════════════════════════════════════════════════════════════════
TABLE_MAP = {
    "users": User,
    "sessions": Session,
    "events": Event,
    "orders": Order,
    "order_items": OrderItem,
    "surveys": PostSessionSurvey,
    "coupons": Coupon,
}


@router.get("/export/{table_name}")
def export_csv(
    table_name: str,
    _: bool = Depends(_verify_admin),
    db: DBSession = Depends(get_db),
):
    model = TABLE_MAP.get(table_name)
    if not model:
        raise HTTPException(status_code=400, detail=f"Unknown table: {table_name}")

    rows = db.query(model).all()
    if not rows:
        raise HTTPException(status_code=404, detail=f"No data in table: {table_name}")

    columns = [c.key for c in model.__table__.columns]

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(columns)
    for row in rows:
        writer.writerow([getattr(row, col) for col in columns])

    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename={table_name}_{datetime.now().strftime('%Y%m%d')}.csv"
        },
    )
