"""
Coupon validation service.
"""

from datetime import datetime, timezone
from sqlalchemy.orm import Session as DBSession
from app.models.models import Coupon


def validate_coupon(db: DBSession, code: str) -> dict:
    """
    Validate a coupon code.

    Returns:
        {"valid": True, "discount_pct": 0.10, "message": "..."} on success
        {"valid": False, "discount_pct": None, "message": "..."} on failure
    """
    coupon = db.query(Coupon).filter(Coupon.code == code.upper()).first()

    if not coupon:
        return {"valid": False, "discount_pct": None, "message": "Coupon code not found."}

    now = datetime.now(timezone.utc)

    if now < coupon.valid_from:
        return {"valid": False, "discount_pct": None, "message": "This coupon is not yet active."}

    if now > coupon.valid_until:
        return {"valid": False, "discount_pct": None, "message": "This coupon has expired."}

    if coupon.times_used >= coupon.usage_limit:
        return {"valid": False, "discount_pct": None, "message": "This coupon has reached its usage limit."}

    return {
        "valid": True,
        "discount_pct": coupon.discount_pct,
        "message": f"Coupon applied! {int(coupon.discount_pct * 100)}% discount.",
    }


def use_coupon(db: DBSession, code: str) -> None:
    """Increment the usage counter for a coupon."""
    coupon = db.query(Coupon).filter(Coupon.code == code.upper()).first()
    if coupon:
        coupon.times_used += 1
        db.commit()
