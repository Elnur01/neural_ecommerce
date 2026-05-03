"""
Orders router — checkout (balance validation + deduction) and order history.
"""

import uuid
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models.models import Cart, CartItem, Order, OrderItem, Product, User, Coupon
from app.schemas.schemas import OrderCreate, OrderOut, OrderItemOut
from app.routers.auth import get_current_user
from app.services.coupons import validate_coupon, use_coupon

router = APIRouter()


@router.post("", response_model=OrderOut, status_code=status.HTTP_201_CREATED)
def create_order(
    body: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """
    Place an order: validate balance ≥ total + shipping - discount,
    deduct credit atomically, create order + items, clear cart.
    """
    cart = db.query(Cart).filter(Cart.customer_id == current_user.customer_id).first()
    if not cart or not cart.items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart is empty.",
        )

    # ── Calculate totals ──────────────────────────────────────────────
    subtotal = Decimal("0")
    order_items_data = []

    for item in cart.items:
        product = db.query(Product).filter(Product.product_id == item.product_id).first()
        if not product:
            raise HTTPException(status_code=400, detail=f"Product {item.product_id} not found.")

        effective_price = product.price * Decimal(str(1 - product.discount_rate))
        line_total = effective_price * item.quantity
        subtotal += line_total

        order_items_data.append({
            "product_id": item.product_id,
            "quantity": item.quantity,
            "unit_price": effective_price,
            "product_name": product.name,
        })

    shipping_fee = Decimal("0") if subtotal >= 1500 else Decimal("50")

    # ── Apply coupon if provided ──────────────────────────────────────
    discount_amount = Decimal("0")
    if body.coupon_code:
        coupon_result = validate_coupon(db, body.coupon_code)
        if not coupon_result["valid"]:
            raise HTTPException(status_code=400, detail=coupon_result["message"])
        discount_amount = subtotal * Decimal(str(coupon_result["discount_pct"]))

    total = subtotal + shipping_fee - discount_amount

    # ── Validate balance ──────────────────────────────────────────────
    if current_user.credit_balance < total:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Insufficient balance. Need {total:.2f} TL, have {current_user.credit_balance:.2f} TL.",
        )

    # ── Create order (atomic) ─────────────────────────────────────────
    order = Order(
        customer_id=current_user.customer_id,
        total=total,
        shipping_fee=shipping_fee,
        coupon_code=body.coupon_code,
        discount_amount=discount_amount,
    )
    db.add(order)
    db.flush()  # get order_id

    for oi_data in order_items_data:
        order_item = OrderItem(
            order_id=order.order_id,
            product_id=oi_data["product_id"],
            quantity=oi_data["quantity"],
            unit_price=oi_data["unit_price"],
        )
        db.add(order_item)

    # Deduct balance
    current_user.credit_balance -= total

    # Increment lifetime stats
    current_user.lifetime_order_count += 1
    current_user.total_order_value = (current_user.total_order_value or 0) + total
    if current_user.lifetime_order_count > 0:
        current_user.avg_order_value = (
            current_user.total_order_value / current_user.lifetime_order_count
        )

    # Use coupon
    if body.coupon_code:
        use_coupon(db, body.coupon_code)

    # Clear cart
    for item in cart.items:
        db.delete(item)

    db.commit()
    db.refresh(order)

    # Build response
    items_out = []
    for oi_data in order_items_data:
        items_out.append(OrderItemOut(
            product_id=oi_data["product_id"],
            product_name=oi_data["product_name"],
            quantity=oi_data["quantity"],
            unit_price=float(oi_data["unit_price"]),
        ))

    return OrderOut(
        order_id=order.order_id,
        total=float(order.total),
        shipping_fee=float(order.shipping_fee),
        coupon_code=order.coupon_code,
        discount_amount=float(order.discount_amount),
        created_at=order.created_at,
        items=items_out,
    )


@router.get("", response_model=list[OrderOut])
def list_orders(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """List all orders for the authenticated user."""
    orders = (
        db.query(Order)
        .filter(Order.customer_id == current_user.customer_id)
        .order_by(Order.created_at.desc())
        .all()
    )

    result = []
    for order in orders:
        items_out = []
        for oi in order.items:
            product = db.query(Product).filter(Product.product_id == oi.product_id).first()
            items_out.append(OrderItemOut(
                product_id=oi.product_id,
                product_name=product.name if product else "Unknown",
                quantity=oi.quantity,
                unit_price=float(oi.unit_price),
            ))
        result.append(OrderOut(
            order_id=order.order_id,
            total=float(order.total),
            shipping_fee=float(order.shipping_fee),
            coupon_code=order.coupon_code,
            discount_amount=float(order.discount_amount),
            created_at=order.created_at,
            items=items_out,
        ))

    return result
