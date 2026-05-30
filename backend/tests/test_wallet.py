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
    setup_cart_and_product(db_session, test_user, 1000.00, 1)
    initial_balance = test_user.credit_balance

    # Execute checkout
    response = auth_client.post("/orders", json={})
    
    assert response.status_code == 201
    data = response.json()
    db_session.refresh(test_user)
    
    shipping = data["shipping_fee"]
    tax = data["tax"]
    assert shipping in [40.0, 50.0, 60.0, 80.0, 100.0]
    assert tax == 200.00  # 20% of 1000
    expected_total = 1000.00 + tax + shipping
    assert data["total"] == expected_total
    assert test_user.credit_balance == initial_balance - Decimal(str(expected_total))

def test_checkout_fails_when_balance_insufficient(auth_client, db_session, test_user):
    # Setup: user has 10000 balance. Product costs 11000.
    setup_cart_and_product(db_session, test_user, 11000.00, 1)

    # Execute checkout
    response = auth_client.post("/orders", json={})
    
    assert response.status_code == 400
    assert "Insufficient balance" in response.json()["detail"]

def test_checkout_with_coupon_applies_discount(auth_client, db_session, test_user):
    # Setup
    setup_cart_and_product(db_session, test_user, 2000.00, 1)
    setup_coupon(db_session, "SAVE20", 0.20)
    initial_balance = test_user.credit_balance

    # Execute checkout
    response = auth_client.post("/orders", json={"coupon_code": "SAVE20"})
    
    assert response.status_code == 201
    data = response.json()
    db_session.refresh(test_user)
    
    shipping = data["shipping_fee"]
    tax = data["tax"]
    discount = data["discount_amount"]
    assert shipping in [40.0, 50.0, 60.0, 80.0, 100.0]
    assert tax == 400.00  # 20% of 2000
    assert discount == 400.00  # 20% of 2000
    expected_total = 2000.00 + tax + shipping - discount
    assert data["total"] == expected_total
    assert test_user.credit_balance == initial_balance - Decimal(str(expected_total))

def test_balance_never_goes_negative(auth_client, db_session, test_user):
    # Setup: item exactly equal to balance + 1
    balance = test_user.credit_balance
    setup_cart_and_product(db_session, test_user, balance + 100, 1)

    response = auth_client.post("/orders", json={})
    
    assert response.status_code == 400
    db_session.refresh(test_user)
    assert test_user.credit_balance == balance
    assert test_user.credit_balance >= 0
