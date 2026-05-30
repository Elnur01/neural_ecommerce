"""
Checkout calculation services (Tax and Shipping Fee).
"""

import hashlib
import uuid
from decimal import Decimal
from sqlalchemy.orm import Session as DBSession

from app.models.models import Session


def get_stable_shipping_fee(db: DBSession, customer_id: uuid.UUID) -> Decimal:
    """
    Selects a deterministic random shipping fee (40, 50, 60, 80, 100 TL)
    based on the user's latest session ID (or customer ID as fallback).
    """
    session = (
        db.query(Session)
        .filter(Session.customer_id == customer_id)
        .order_by(Session.started_at.desc())
        .first()
    )
    if session:
        seed_str = str(session.session_id)
    else:
        seed_str = str(customer_id)

    # Deterministic hash mapping to one of the allowed shipping fees
    h = hashlib.md5(seed_str.encode("utf-8")).hexdigest()
    val = int(h, 16)
    fees = [Decimal("40"), Decimal("50"), Decimal("60"), Decimal("80"), Decimal("100")]
    return fees[val % len(fees)]


def calculate_tax(subtotal: Decimal) -> Decimal:
    """
    Calculate 20% tax on the order subtotal.
    """
    return round(subtotal * Decimal("0.20"), 2)
