"""
Wallet and Checkout tests.
"""

import pytest
from uuid import uuid4
from decimal import Decimal
from app.models.models import Cart, CartItem, Product, Coupon
from datetime import datetime, timedelta, timezone

def setup_cart_and_product(db_session, user, price, qty=1):
    product = Product(
        product_id=uuid4(),
        name="Test Product",
        category="Test",
        price=price,
        discount_rate=0.0
    )
    db_session.add(product)
    
    cart = Cart(customer_id=user.customer_id)
    db_session.add(cart)
    db_session.flush()

    cart_item = CartItem(
        cart_id=cart.cart_id,
        product_id=product.product_id,
        quantity=qty
    )
    db_session.add(cart_item)
    db_session.commit()
    return product

def setup_coupon(db_session, code, discount_pct):
    now = datetime.now(timezone.utc)
    coupon = Coupon(
        coupon_id=uuid4(),
        code=code,
        discount_pct=discount_pct,
        valid_from=now - timedelta(days=1),
        valid_until=now + timedelta(days=1),
        usage_limit=10,
        times_used=0
    )
    db_session.add(coupon)
    db_session.commit()

def test_checkout_deducts_correct_amount(auth_client, db_session, test_user):
    # Setup
    setup_cart_and_product(db_session, test_user, 1000.00, 1) # Total 1000 + 50 shipping = 1050
    initial_balance = test_user.credit_balance

    # Execute checkout
    response = auth_client.post("/orders", json={})
    
    assert response.status_code == 201
    db_session.refresh(test_user)
    
    # 1000 + 50 shipping = 1050
    assert test_user.credit_balance == initial_balance - Decimal("1050.00")

def test_checkout_fails_when_balance_insufficient(auth_client, db_session, test_user):
    # Setup: user has 10000 balance. Product costs 11000.
    setup_cart_and_product(db_session, test_user, 11000.00, 1) # Total 11000 + 0 shipping = 11000

    # Execute checkout
    response = auth_client.post("/orders", json={})
    
    assert response.status_code == 400
    assert "Insufficient balance" in response.json()["detail"]

def test_checkout_with_coupon_applies_discount(auth_client, db_session, test_user):
    # Setup
    setup_cart_and_product(db_session, test_user, 2000.00, 1) # Total 2000 + 0 shipping = 2000
    setup_coupon(db_session, "SAVE20", 0.20)
    initial_balance = test_user.credit_balance

    # Execute checkout
    response = auth_client.post("/orders", json={"coupon_code": "SAVE20"})
    
    assert response.status_code == 201
    db_session.refresh(test_user)
    
    # Subtotal 2000. Discount 20% = 400. Shipping 0. Total = 1600.
    assert response.json()["total"] == 1600.00
    assert test_user.credit_balance == initial_balance - Decimal("1600.00")

def test_balance_never_goes_negative(auth_client, db_session, test_user):
    # Setup: item exactly equal to balance + 1
    balance = test_user.credit_balance
    setup_cart_and_product(db_session, test_user, balance + 100, 1)

    response = auth_client.post("/orders", json={})
    
    assert response.status_code == 400
    db_session.refresh(test_user)
    assert test_user.credit_balance == balance
    assert test_user.credit_balance >= 0
