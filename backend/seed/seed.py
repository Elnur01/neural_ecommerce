"""
Seed script — populates the products and coupons tables from JSON files.

Usage:
    cd backend
    source .venv/bin/activate
    python -m seed.seed
"""

import json
import uuid
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Adjust import path for running as module
import sys
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import settings
from app.database import Base
from app.models.models import Product, Coupon


def seed_products(session, products_path: Path):
    """Insert products from JSON file."""
    with open(products_path) as f:
        products = json.load(f)

    count = 0
    for p in products:
        existing = session.query(Product).filter(Product.name == p["name"]).first()
        if existing:
            print(f"  ⏭  Skipping existing: {p['name']}")
            continue

        product = Product(
            product_id=uuid.uuid4(),
            name=p["name"],
            category=p["category"],
            price=p["price"],
            discount_rate=p.get("discount_rate", 0),
            image_urls=p.get("image_urls", []),
            description=p.get("description", ""),
            stock_simulated=p.get("stock_simulated", 100),
            avg_rating=p.get("avg_rating", 0),
            review_count=p.get("review_count", 0),
        )
        session.add(product)
        count += 1

    session.commit()
    print(f"  ✅ Inserted {count} products.")


def seed_coupons(session):
    """Insert default coupon codes."""
    now = datetime.now(timezone.utc)
    coupons = [
        {"code": "WELCOME10", "discount_pct": 0.10, "usage_limit": 500,
         "valid_from": now, "valid_until": now + timedelta(days=180)},
        {"code": "TECH15", "discount_pct": 0.15, "usage_limit": 200,
         "valid_from": now, "valid_until": now + timedelta(days=90)},
        {"code": "FLASH20", "discount_pct": 0.20, "usage_limit": 100,
         "valid_from": now, "valid_until": now + timedelta(days=30)},
        {"code": "STUDENT5", "discount_pct": 0.05, "usage_limit": 1000,
         "valid_from": now, "valid_until": now + timedelta(days=365)},
        {"code": "LOYALTY25", "discount_pct": 0.25, "usage_limit": 50,
         "valid_from": now, "valid_until": now + timedelta(days=60)},
        {"code": "SUMMER10", "discount_pct": 0.10, "usage_limit": 300,
         "valid_from": now, "valid_until": now + timedelta(days=120)},
        {"code": "RESEARCH30", "discount_pct": 0.30, "usage_limit": 20,
         "valid_from": now, "valid_until": now + timedelta(days=14)},
        {"code": "EXPIRED99", "discount_pct": 0.99, "usage_limit": 100,
         "valid_from": now - timedelta(days=60), "valid_until": now - timedelta(days=1)},
    ]

    count = 0
    for c in coupons:
        existing = session.query(Coupon).filter(Coupon.code == c["code"]).first()
        if existing:
            print(f"  ⏭  Skipping existing coupon: {c['code']}")
            continue

        coupon = Coupon(coupon_id=uuid.uuid4(), **c)
        session.add(coupon)
        count += 1

    session.commit()
    print(f"  ✅ Inserted {count} coupons.")


def main():
    print("🌱 Neural E-commerce — Seed Script")
    print("=" * 50)

    engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
    Base.metadata.create_all(engine)  # Create tables if they don't exist
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        products_path = Path(__file__).parent / "products.json"
        print(f"\n📦 Seeding products from {products_path}...")
        seed_products(session, products_path)

        print(f"\n🎟️  Seeding coupons...")
        seed_coupons(session)

        print(f"\n✅ Seed complete!")
    except Exception as e:
        session.rollback()
        print(f"\n❌ Seed failed: {e}")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    main()
