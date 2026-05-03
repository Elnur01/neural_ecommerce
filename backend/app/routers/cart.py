"""
Cart router — CRUD operations for the user's shopping cart.
"""

import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession

from app.database import get_db
from app.models.models import Cart, CartItem, Product, User
from app.schemas.schemas import CartItemCreate, CartItemUpdate, CartItemOut, CartOut
from app.routers.auth import get_current_user

router = APIRouter()


def _build_cart_response(cart: Cart, db: DBSession) -> CartOut:
    """Build a full cart response with computed totals."""
    items_out = []
    subtotal = 0.0

    for item in cart.items:
        product = db.query(Product).filter(Product.product_id == item.product_id).first()
        effective_price = float(product.price) * (1 - product.discount_rate) if product else 0
        line_total = effective_price * item.quantity
        subtotal += line_total

        items_out.append(
            CartItemOut(
                id=item.id,
                product_id=item.product_id,
                product_name=product.name if product else None,
                product_price=float(product.price) if product else None,
                product_discount_rate=product.discount_rate if product else None,
                quantity=item.quantity,
            )
        )

    shipping_fee = 0.0 if subtotal >= 1500 else 50.0
    total = subtotal + shipping_fee

    return CartOut(
        cart_id=cart.cart_id,
        items=items_out,
        subtotal=round(subtotal, 2),
        shipping_fee=shipping_fee,
        total=round(total, 2),
    )


@router.get("", response_model=CartOut)
def get_cart(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Get the current user's cart with computed totals."""
    cart = db.query(Cart).filter(Cart.customer_id == current_user.customer_id).first()
    if not cart:
        cart = Cart(customer_id=current_user.customer_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)

    return _build_cart_response(cart, db)


@router.post("/items", response_model=CartOut, status_code=status.HTTP_201_CREATED)
def add_to_cart(
    body: CartItemCreate,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Add a product to the cart (or increment quantity if already present)."""
    # Verify product exists
    product = db.query(Product).filter(Product.product_id == body.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    cart = db.query(Cart).filter(Cart.customer_id == current_user.customer_id).first()
    if not cart:
        cart = Cart(customer_id=current_user.customer_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)

    # Check if item already in cart
    existing_item = (
        db.query(CartItem)
        .filter(CartItem.cart_id == cart.cart_id, CartItem.product_id == body.product_id)
        .first()
    )

    if existing_item:
        existing_item.quantity += body.quantity
    else:
        new_item = CartItem(
            cart_id=cart.cart_id,
            product_id=body.product_id,
            quantity=body.quantity,
        )
        db.add(new_item)

    db.commit()
    db.refresh(cart)

    return _build_cart_response(cart, db)


@router.patch("/items/{item_id}", response_model=CartOut)
def update_cart_item(
    item_id: uuid.UUID,
    body: CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Update quantity of a cart item."""
    cart = db.query(Cart).filter(Cart.customer_id == current_user.customer_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found.")

    item = (
        db.query(CartItem)
        .filter(CartItem.id == item_id, CartItem.cart_id == cart.cart_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found.")

    item.quantity = body.quantity
    db.commit()
    db.refresh(cart)

    return _build_cart_response(cart, db)


@router.delete("/items/{item_id}", response_model=CartOut)
def remove_from_cart(
    item_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    """Remove an item from the cart."""
    cart = db.query(Cart).filter(Cart.customer_id == current_user.customer_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found.")

    item = (
        db.query(CartItem)
        .filter(CartItem.id == item_id, CartItem.cart_id == cart.cart_id)
        .first()
    )
    if not item:
        raise HTTPException(status_code=404, detail="Cart item not found.")

    db.delete(item)
    db.commit()
    db.refresh(cart)

    return _build_cart_response(cart, db)
