"""
SQLAlchemy ORM models — mirrors the database schema from §3.1 of the roadmap.

Tables:
  - users (demographic schema)
  - products
  - reviews
  - sessions
  - events (sequential dataset — 19+ fields)
  - carts / cart_items
  - orders / order_items
  - coupons
"""

import uuid
from datetime import datetime, date

from sqlalchemy import (
    Column,
    String,
    Text,
    Integer,
    Float,
    Numeric,
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    JSON,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship

from app.database import Base


# ═══════════════════════════════════════════════════════════════════════
# USERS  (demographic schema)
# ═══════════════════════════════════════════════════════════════════════
class User(Base):
    __tablename__ = "users"

    customer_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String, unique=True, nullable=False, index=True)
    password_hash = Column(String, nullable=False)

    # ── Demographic fields ────────────────────────────────────────────
    age_group = Column(String(10))         # "18-24", "25-34", "35-44", "45+"
    gender = Column(String(2))             # "M" / "F"
    raw_city = Column(String(100))
    city_tier = Column(String(10))         # "Tier-1", "Tier-2", "Tier-3"
    account_age_days = Column(Integer, default=0)
    lifetime_order_count = Column(Integer, default=0)
    total_order_value = Column(Numeric(12, 2), default=0)
    avg_order_value = Column(Numeric(12, 2), default=0)
    loyalty_tier = Column(String(20), default="Bronze")  # Bronze/Silver/Gold/Platinum
    preferred_device = Column(String(30))  # "Mobile", "Desktop", "Tablet"
    payment_method_saved = Column(Boolean, default=False)
    last_purchase_date = Column(Date, nullable=True)

    # ── Wallet ────────────────────────────────────────────────────────
    credit_balance = Column(Numeric(12, 2), default=12000.00)

    # ── Raw signup inputs (kept for transparency page) ────────────────
    raw_age = Column(Integer)
    monthly_shopping_frequency = Column(Integer, default=0)

    # ── Metadata ──────────────────────────────────────────────────────
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # ── Relationships ─────────────────────────────────────────────────
    sessions = relationship("Session", back_populates="user")
    reviews = relationship("Review", back_populates="user")
    cart = relationship("Cart", back_populates="user", uselist=False)
    orders = relationship("Order", back_populates="user")


# ═══════════════════════════════════════════════════════════════════════
# PRODUCTS
# ═══════════════════════════════════════════════════════════════════════
class Product(Base):
    __tablename__ = "products"

    product_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(200), nullable=False)
    category = Column(String(50), nullable=False, index=True)
    price = Column(Numeric(10, 2), nullable=False)
    discount_rate = Column(Float, default=0.0)  # 0.0 – 0.3
    image_urls = Column(JSON, default=list)     # list of URL strings
    description = Column(Text)
    stock_simulated = Column(Integer, default=100)
    avg_rating = Column(Float, default=0.0)
    review_count = Column(Integer, default=0)

    reviews = relationship("Review", back_populates="product")


# ═══════════════════════════════════════════════════════════════════════
# REVIEWS
# ═══════════════════════════════════════════════════════════════════════
class Review(Base):
    __tablename__ = "reviews"

    review_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.product_id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.customer_id"), nullable=False)
    rating = Column(Integer, nullable=False)   # 1–5
    text = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    product = relationship("Product", back_populates="reviews")
    user = relationship("User", back_populates="reviews")


# ═══════════════════════════════════════════════════════════════════════
# SESSIONS
# ═══════════════════════════════════════════════════════════════════════
class Session(Base):
    __tablename__ = "sessions"

    session_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.customer_id"), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    ended_at = Column(DateTime(timezone=True), nullable=True)
    user_agent = Column(Text)
    abandonment_status = Column(Boolean, default=True)

    user = relationship("User", back_populates="sessions")
    events = relationship("Event", back_populates="session")


# ═══════════════════════════════════════════════════════════════════════
# EVENTS  (the sequential dataset — one row per event)
# ═══════════════════════════════════════════════════════════════════════
class Event(Base):
    __tablename__ = "events"

    event_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("sessions.session_id"), nullable=False)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.customer_id"), nullable=False)

    event_timestamp = Column(DateTime(timezone=True), server_default=func.now())
    event_type = Column(String(50), nullable=False, index=True)
    page_url = Column(String(500))
    product_id = Column(UUID(as_uuid=True), nullable=True)

    # ── Per-event metadata ────────────────────────────────────────────
    time_on_page_sec = Column(Float, default=0)
    product_price = Column(Numeric(10, 2), nullable=True)
    discount_rate = Column(Float, nullable=True)
    scroll_depth_pct = Column(Float, default=0)
    review_section_visited = Column(Boolean, default=False)
    images_viewed_count = Column(Integer, default=0)
    back_button_count = Column(Integer, default=0)
    cart_total_at_event = Column(Numeric(12, 2), default=0)
    items_in_cart = Column(Integer, default=0)
    exit_intent_triggered = Column(Boolean, default=False)
    cart_add_remove_count = Column(Integer, default=0)
    search_bar_used = Column(Boolean, default=False)
    coupon_applied = Column(Boolean, default=False)
    shipping_fee = Column(Numeric(8, 2), default=0)
    abandonment_status = Column(Boolean, nullable=True)

    session = relationship("Session", back_populates="events")


# ═══════════════════════════════════════════════════════════════════════
# CARTS  &  CART ITEMS
# ═══════════════════════════════════════════════════════════════════════
class Cart(Base):
    __tablename__ = "carts"

    cart_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.customer_id"), unique=True, nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    user = relationship("User", back_populates="cart")
    items = relationship("CartItem", back_populates="cart", cascade="all, delete-orphan")


class CartItem(Base):
    __tablename__ = "cart_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    cart_id = Column(UUID(as_uuid=True), ForeignKey("carts.cart_id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.product_id"), nullable=False)
    quantity = Column(Integer, default=1, nullable=False)

    cart = relationship("Cart", back_populates="items")
    product = relationship("Product")


# ═══════════════════════════════════════════════════════════════════════
# ORDERS  &  ORDER ITEMS
# ═══════════════════════════════════════════════════════════════════════
class Order(Base):
    __tablename__ = "orders"

    order_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    customer_id = Column(UUID(as_uuid=True), ForeignKey("users.customer_id"), nullable=False)
    total = Column(Numeric(12, 2), nullable=False)
    shipping_fee = Column(Numeric(8, 2), default=0)
    coupon_code = Column(String(50), nullable=True)
    discount_amount = Column(Numeric(10, 2), default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="orders")
    items = relationship("OrderItem", back_populates="order", cascade="all, delete-orphan")


class OrderItem(Base):
    __tablename__ = "order_items"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    order_id = Column(UUID(as_uuid=True), ForeignKey("orders.order_id"), nullable=False)
    product_id = Column(UUID(as_uuid=True), ForeignKey("products.product_id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)

    order = relationship("Order", back_populates="items")
    product = relationship("Product")


# ═══════════════════════════════════════════════════════════════════════
# COUPONS
# ═══════════════════════════════════════════════════════════════════════
class Coupon(Base):
    __tablename__ = "coupons"

    coupon_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    code = Column(String(50), unique=True, nullable=False, index=True)
    discount_pct = Column(Float, nullable=False)       # e.g., 0.10 = 10%
    valid_from = Column(DateTime(timezone=True), nullable=False)
    valid_until = Column(DateTime(timezone=True), nullable=False)
    usage_limit = Column(Integer, default=100)
    times_used = Column(Integer, default=0)
