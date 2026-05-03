"""
Coupons router — validate coupon codes.
"""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.schemas.schemas import CouponValidateRequest, CouponValidateResponse
from app.services.coupons import validate_coupon

router = APIRouter()


@router.post("/validate", response_model=CouponValidateResponse)
def validate(body: CouponValidateRequest, db: DBSession = Depends(get_db)):
    """Validate a coupon code and return discount percentage if valid."""
    result = validate_coupon(db, body.code)
    return CouponValidateResponse(**result)
