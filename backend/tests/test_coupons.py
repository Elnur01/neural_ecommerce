"""
Unit tests for coupon validation.
"""
import pytest
from datetime import datetime, timedelta, timezone
from app.services.coupons import validate_coupon, use_coupon

class MockCoupon:
    def __init__(self, code, valid_from, valid_until, usage_limit, times_used, discount_pct):
        self.code = code
        self.valid_from = valid_from
        self.valid_until = valid_until
        self.usage_limit = usage_limit
        self.times_used = times_used
        self.discount_pct = discount_pct

class MockQuery:
    def __init__(self, coupon):
        self.coupon = coupon
    def filter(self, *args, **kwargs):
        return self
    def first(self):
        return self.coupon

class MockDBSession:
    def __init__(self, coupon=None):
        self.coupon = coupon
        self.committed = False
    
    def query(self, *args, **kwargs):
        return MockQuery(self.coupon)
    
    def commit(self):
        self.committed = True

def test_coupon_valid():
    now = datetime.now(timezone.utc)
    coupon = MockCoupon(
        code="SAVE10",
        valid_from=now - timedelta(days=1),
        valid_until=now + timedelta(days=1),
        usage_limit=10,
        times_used=0,
        discount_pct=0.10
    )
    db = MockDBSession(coupon)
    result = validate_coupon(db, "SAVE10")
    assert result["valid"] is True
    assert result["discount_pct"] == 0.10

def test_coupon_expired():
    now = datetime.now(timezone.utc)
    coupon = MockCoupon(
        code="EXPIRED10",
        valid_from=now - timedelta(days=5),
        valid_until=now - timedelta(days=1),
        usage_limit=10,
        times_used=0,
        discount_pct=0.10
    )
    db = MockDBSession(coupon)
    result = validate_coupon(db, "EXPIRED10")
    assert result["valid"] is False
    assert "expired" in result["message"].lower()

def test_coupon_already_used():
    now = datetime.now(timezone.utc)
    coupon = MockCoupon(
        code="USED10",
        valid_from=now - timedelta(days=1),
        valid_until=now + timedelta(days=1),
        usage_limit=1,
        times_used=1,
        discount_pct=0.10
    )
    db = MockDBSession(coupon)
    result = validate_coupon(db, "USED10")
    assert result["valid"] is False
    assert "limit" in result["message"].lower()

def test_coupon_invalid_code():
    db = MockDBSession(None)
    result = validate_coupon(db, "INVALID")
    assert result["valid"] is False
    assert "not found" in result["message"].lower()

# Note: test_coupon_minimum_cart_not_met is skipped as the schema currently doesn't support min_cart_value

def test_use_coupon():
    now = datetime.now(timezone.utc)
    coupon = MockCoupon(
        code="USEME",
        valid_from=now - timedelta(days=1),
        valid_until=now + timedelta(days=1),
        usage_limit=10,
        times_used=0,
        discount_pct=0.10
    )
    db = MockDBSession(coupon)
    use_coupon(db, "USEME")
    assert coupon.times_used == 1
    assert db.committed is True
