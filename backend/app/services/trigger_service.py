"""
Trigger Service — fires abandonment check in the background after cart/event activity.

Called as a FastAPI BackgroundTask from:
  - POST /cart/items      (on every add_to_cart)
  - POST /events          (every EVENT_TRIGGER_EVERY events accumulated in a session)

The check is idempotent: once an intervention has fired for a session it will not
fire again (tracked in _intervened_sessions in-memory set, reset on server restart).
"""

import logging
import random
import uuid as _uuid_mod

from app.database import SessionLocal
from app.models.models import Cart, CartItem, Event, InterventionLog, Product, Session, User
from app.services import agent_service, lstm_inference

logger = logging.getLogger(__name__)

# Fire LSTM check after every N events accumulated in a session
EVENT_TRIGGER_EVERY: int = 1

# A/B test: probability of being in the treatment group (intervention shown).
# 0.5 = 50% treatment, 50% control (suppressed).
AB_TREATMENT_PROBABILITY: float = 1.0

# In-memory guard: prevents firing more than one intervention per session.
# Key format: "<user_id>:<session_id>"
_intervened_sessions: set = set()


# ─── Internal helpers ────────────────────────────────────────────────────────

def _get_demographics(user: User) -> dict:
    return {
        "age_group":            user.age_group,
        "gender":               user.gender,
        "city_tier":            user.city_tier,
        "loyalty_tier":         user.loyalty_tier,
        "preferred_device":     user.preferred_device,
        "account_age_days":     int(user.account_age_days or 0),
        "lifetime_order_count": int(user.lifetime_order_count or 0),
        "avg_order_value":      float(user.avg_order_value or 0),
        "total_order_value":    float(user.total_order_value or 0),
        "payment_method_saved": bool(user.payment_method_saved),
        "last_purchase_date":   str(user.last_purchase_date) if user.last_purchase_date else None,
    }


def _get_events_list(session_uuid, user_uuid, db) -> list:
    events_db = (
        db.query(Event)
        .filter(Event.session_id == session_uuid, Event.customer_id == user_uuid)
        .order_by(Event.event_timestamp)
        .all()
    )
    return [
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


def _get_cart_value(user_uuid, db) -> float:
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


# ─── DB logging helper ───────────────────────────────────────────────────────

def _log_intervention(db, session_uuid, user_uuid, lstm_result, cart_value, agent_result, ab_group):
    """Persist an InterventionLog row for monitoring and A/B analytics."""
    try:
        log = InterventionLog(
            session_id=session_uuid,
            user_id=user_uuid,
            segment=lstm_result["segment"],
            abandonment_probability=float(lstm_result["abandonment_probability"]),
            cart_value=float(cart_value),
            action=agent_result.get("action") if agent_result else None,
            message=agent_result.get("message") if agent_result else None,
            ab_group=ab_group,
        )
        db.add(log)
        db.commit()
    except Exception as exc:
        logger.error("Trigger: failed to persist intervention log: %s", exc, exc_info=True)
        db.rollback()


# ─── Public API ───────────────────────────────────────────────────────────────

def run_abandonment_check(user_id: str, session_id: str) -> None:
    """
    Background task: run LSTM inference + LangGraph agent if abandonment risk detected.

    Creates its own DB session so it is safe to schedule via FastAPI BackgroundTasks
    (the request's DB session is already closed by the time this runs).

    Silently skips if:
    - LSTM model is not loaded yet
    - Agent is not ready (no GEMINI_API_KEY)
    - Session already received an intervention this server run
    - Abandonment probability is below the 0.70 threshold
    """
    session_key = f"{user_id}:{session_id}"
    if session_key in _intervened_sessions:
        logger.debug("Trigger: already intervened for session %s — skipping", session_id)
        return

    db = SessionLocal()
    try:
        user_uuid    = _uuid_mod.UUID(user_id)
        session_uuid = _uuid_mod.UUID(session_id)

        user = db.query(User).filter(User.customer_id == user_uuid).first()
        if not user:
            logger.warning("Trigger: user %s not found in DB", user_id)
            return

        events = _get_events_list(session_uuid, user_uuid, db)
        if not events:
            logger.debug("Trigger: no events yet for session %s — skipping", session_id)
            return

        demographics = _get_demographics(user)

        try:
            lstm_result = lstm_inference.predict_abandonment(
                events=events, demographics=demographics
            )
        except RuntimeError:
            logger.debug("Trigger: LSTM not ready — skipping abandonment check")
            return

        cart_exit_detected = lstm_result.get("cart_exit_detected", False)
        logger.info(
            "Trigger: session=%s prob=%.3f segment=%s should_intervene=%s cart_exit=%s threshold=%.2f",
            session_id,
            lstm_result["abandonment_probability"],
            lstm_result["segment"],
            lstm_result["should_intervene"],
            cart_exit_detected,
            lstm_result.get("threshold_used", 0.70),
        )

        if not lstm_result["should_intervene"]:
            return

        cart_value      = _get_cart_value(user_uuid, db)
        session_history = [{"event_type": e.get("event_type")} for e in events[-5:]]

        # ── A/B test assignment ───────────────────────────────────────────────
        ab_group = "treatment" if random.random() < AB_TREATMENT_PROBABILITY else "control"
        _intervened_sessions.add(session_key)

        if ab_group == "control":
            logger.info(
                "Trigger: A/B control — session=%s segment=%s prob=%.3f (intervention suppressed)",
                session_id, lstm_result["segment"], lstm_result["abandonment_probability"],
            )
            _log_intervention(
                db=db,
                session_uuid=session_uuid,
                user_uuid=user_uuid,
                lstm_result=lstm_result,
                cart_value=cart_value,
                agent_result=None,
                ab_group="control",
            )
            return

        # ── Treatment: run agent ──────────────────────────────────────────────
        try:
            agent_result = agent_service.run_intervention(
                intent_score    = lstm_result["abandonment_probability"],
                lstm_segment    = lstm_result["segment"],
                cart_value      = cart_value,
                session_history = session_history,
                session_id      = session_id,
                user_id         = user_id,
            )
        except RuntimeError:
            logger.warning(
                "Trigger: agent not ready — intervention skipped for session %s", session_id
            )
            return

        _log_intervention(
            db=db,
            session_uuid=session_uuid,
            user_uuid=user_uuid,
            lstm_result=lstm_result,
            cart_value=cart_value,
            agent_result=agent_result,
            ab_group="treatment",
        )

        logger.info(
            "Trigger: intervention fired — session=%s action=%s message_len=%d",
            session_id,
            agent_result.get("action"),
            len(agent_result.get("message", "")),
        )

        # Push to frontend via WebSocket (no-op if client not connected)
        try:
            from app.routers.websocket_router import manager as ws_manager
            ws_manager.send_intervention_sync(session_id, {
                "type":             "intervention",
                "action":           agent_result.get("action", ""),
                "message":          agent_result.get("message", ""),
                "segment":          lstm_result.get("segment", ""),
                "cart_exit":        lstm_result.get("cart_exit_detected", False),
                "threshold_used":   lstm_result.get("threshold_used", 0.70),
            })
        except Exception as ws_exc:
            logger.debug("Trigger: WS push skipped: %s", ws_exc)

    except Exception as exc:
        logger.error(
            "Trigger: unexpected error for session %s: %s", session_id, exc, exc_info=True
        )
    finally:
        db.close()
