"""
Products router — list, filter, sort, and detail endpoints.
"""

import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import asc, desc

from app.database import get_db
from app.models.models import Product
from app.schemas.schemas import ProductOut, ProductListResponse

router = APIRouter()


@router.get("", response_model=ProductListResponse)
def list_products(
    category: Optional[str] = Query(None, description="Filter by category"),
    sort_by: Optional[str] = Query(
        "newest",
        description="Sort field",
        pattern="^(price_asc|price_desc|rating|newest)$",
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None, description="Search products by name"),
    db: DBSession = Depends(get_db),
):
    """List products with optional category filter, search, sorting, and pagination."""
    query = db.query(Product)

    # ── Filters ───────────────────────────────────────────────────────
    if category:
        query = query.filter(Product.category == category)
    if search:
        query = query.filter(Product.name.ilike(f"%{search}%"))

    # ── Total count (before pagination) ───────────────────────────────
    total = query.count()

    # ── Sorting ───────────────────────────────────────────────────────
    if sort_by == "price_asc":
        query = query.order_by(asc(Product.price))
    elif sort_by == "price_desc":
        query = query.order_by(desc(Product.price))
    elif sort_by == "rating":
        query = query.order_by(desc(Product.avg_rating))
    else:  # newest
        query = query.order_by(desc(Product.product_id))

    # ── Pagination ────────────────────────────────────────────────────
    offset = (page - 1) * page_size
    products = query.offset(offset).limit(page_size).all()

    return ProductListResponse(
        products=[ProductOut.model_validate(p) for p in products],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/categories", response_model=list[str])
def list_categories(db: DBSession = Depends(get_db)):
    """Return distinct product categories."""
    results = db.query(Product.category).distinct().all()
    return sorted([r[0] for r in results])


@router.get("/{product_id}", response_model=ProductOut)
def get_product(product_id: uuid.UUID, db: DBSession = Depends(get_db)):
    """Get a single product by ID."""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product not found.",
        )
    return product
