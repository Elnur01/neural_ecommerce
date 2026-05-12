"""
Pydantic schemas for request/response validation.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field


# ═══════════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════════
class SignupRequest(BaseModel):
    email: str
    password: str
    age: int = Field(..., ge=18, le=100)
    gender: str = Field(..., pattern="^(M|F)$")
    city: str
    monthly_shopping_frequency: int = Field(..., ge=0)
    last_online_purchase_date: date
    save_card: str = Field(..., pattern="^(yes|no)$")
    device_fingerprint: Optional[str] = None
    lang: str = "en"


class LoginRequest(BaseModel):
    email: str
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserProfile(BaseModel):
    customer_id: uuid.UUID
    email: str
    age_group: Optional[str] = None
    gender: Optional[str] = None
    raw_city: Optional[str] = None
    city_tier: Optional[str] = None
    account_age_days: int = 0
    lifetime_order_count: int = 0
    total_order_value: float = 0
    avg_order_value: float = 0
    loyalty_tier: str = "Bronze"
    preferred_device: Optional[str] = None
    payment_method_saved: bool = False
    last_purchase_date: Optional[date] = None
    credit_balance: float = 12000.00
    raw_age: Optional[int] = None
    monthly_shopping_frequency: int = 0
    created_at: Optional[datetime] = None
    
    # WP-4 Scenario fields
    scenario_id: Optional[str] = None
    scenario_label: Optional[str] = None
    scenario_intent_level: Optional[str] = None
    scenario_text_shown: Optional[str] = None
    scenario_text_lang: Optional[str] = None
    scenario_text_version: Optional[str] = None

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════
# PRODUCTS
# ═══════════════════════════════════════════════════════════════════════
class ProductOut(BaseModel):
    product_id: uuid.UUID
    name: str
    category: str
    price: float
    discount_rate: float = 0.0
    image_urls: list[str] = []
    description: Optional[str] = None
    stock_simulated: int = 100
    avg_rating: float = 0.0
    review_count: int = 0

    model_config = {"from_attributes": True}


class ProductListResponse(BaseModel):
    products: list[ProductOut]
    total: int
    page: int
    page_size: int


# ═══════════════════════════════════════════════════════════════════════
# REVIEWS
# ═══════════════════════════════════════════════════════════════════════
class ReviewCreate(BaseModel):
    product_id: uuid.UUID
    rating: int = Field(..., ge=1, le=5)
    text: Optional[str] = None


class ReviewOut(BaseModel):
    review_id: uuid.UUID
    product_id: uuid.UUID
    customer_id: uuid.UUID
    rating: int
    text: Optional[str] = None
    created_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════
# CART
# ═══════════════════════════════════════════════════════════════════════
class CartItemCreate(BaseModel):
    product_id: uuid.UUID
    quantity: int = Field(1, ge=1)


class CartItemUpdate(BaseModel):
    quantity: int = Field(..., ge=1)


class CartItemOut(BaseModel):
    id: uuid.UUID
    product_id: uuid.UUID
    product_name: Optional[str] = None
    product_price: Optional[float] = None
    product_discount_rate: Optional[float] = None
    product_image_url: Optional[str] = None
    quantity: int

    model_config = {"from_attributes": True}


class CartOut(BaseModel):
    cart_id: uuid.UUID
    items: list[CartItemOut] = []
    subtotal: float = 0
    shipping_fee: float = 0
    total: float = 0

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════
# ORDERS
# ═══════════════════════════════════════════════════════════════════════
class OrderCreate(BaseModel):
    coupon_code: Optional[str] = None


class OrderItemOut(BaseModel):
    product_id: uuid.UUID
    product_name: Optional[str] = None
    product_image_url: Optional[str] = None
    quantity: int
    unit_price: float

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    order_id: uuid.UUID
    total: float
    shipping_fee: float
    coupon_code: Optional[str] = None
    discount_amount: float = 0
    created_at: Optional[datetime] = None
    items: list[OrderItemOut] = []

    model_config = {"from_attributes": True}


# ═══════════════════════════════════════════════════════════════════════
# EVENTS
# ═══════════════════════════════════════════════════════════════════════
class EventCreate(BaseModel):
    session_id: uuid.UUID
    event_type: str
    page_url: Optional[str] = None
    product_id: Optional[uuid.UUID] = None
    time_on_page_sec: float = 0
    product_price: Optional[float] = None
    discount_rate: Optional[float] = None
    scroll_depth_pct: float = 0
    review_section_visited: bool = False
    images_viewed_count: int = 0
    back_button_count: int = 0
    cart_total_at_event: float = 0
    items_in_cart: int = 0
    exit_intent_triggered: bool = False
    cart_add_remove_count: int = 0
    search_bar_used: bool = False
    coupon_applied: bool = False
    shipping_fee: float = 0
    scenario_id: Optional[str] = None
    abandonment_stage: Optional[str] = None
    budget_utilization_pct: Optional[float] = None
    time_since_session_start_sec: Optional[float] = None
    image_index: Optional[int] = None
    total_images_available: Optional[int] = None


class EventBatchCreate(BaseModel):
    events: list[EventCreate]


# ═══════════════════════════════════════════════════════════════════════
# COUPONS
# ═══════════════════════════════════════════════════════════════════════
class CouponValidateRequest(BaseModel):
    code: str


class CouponValidateResponse(BaseModel):
    valid: bool
    discount_pct: Optional[float] = None
    message: str = ""


# ═══════════════════════════════════════════════════════════════════════
# SESSIONS
# ═══════════════════════════════════════════════════════════════════════
class SessionCreate(BaseModel):
    session_id: uuid.UUID
    user_agent: Optional[str] = None
