"""
Reviews router — create and list product reviews.
"""

import uuid
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session as DBSession
from sqlalchemy import func

from app.database import get_db
from app.models.models import Review, Product, User
from app.schemas.schemas import ReviewCreate, ReviewOut
from app.routers.auth import get_current_user

router = APIRouter()


@router.post("", response_model=ReviewOut, status_code=status.HTTP_201_CREATED)
def create_review(
    body: ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db),
):
    product = db.query(Product).filter(Product.product_id == body.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found.")

    review = Review(
        product_id=body.product_id,
        customer_id=current_user.customer_id,
        rating=body.rating,
        text=body.text,
    )
    db.add(review)
    db.flush()

    # Update product avg_rating and review_count
    stats = db.query(
        func.avg(Review.rating), func.count(Review.review_id)
    ).filter(Review.product_id == body.product_id).first()

    product.avg_rating = round(float(stats[0]), 2) if stats[0] else 0
    product.review_count = stats[1] or 0

    db.commit()
    db.refresh(review)
    return review


@router.get("/product/{product_id}", response_model=list[ReviewOut])
def list_product_reviews(
    product_id: uuid.UUID,
    db: DBSession = Depends(get_db),
):
    reviews = (
        db.query(Review)
        .filter(Review.product_id == product_id)
        .order_by(Review.created_at.desc())
        .all()
    )
    return reviews
