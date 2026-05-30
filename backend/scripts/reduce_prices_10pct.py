import json
import sys
from pathlib import Path
from decimal import Decimal

# Adjust path for running script directly
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal
from app.models.models import Product


def reduce_database_prices():
    db = SessionLocal()
    try:
        products = db.query(Product).all()
        print(f"Updating {len(products)} products in the database...")
        for p in products:
            old_price = p.price
            p.price = round(p.price * Decimal("0.90"), 2)
            print(f"  - {p.name}: {old_price} -> {p.price}")
        db.commit()
        print("✅ Database prices updated successfully.")
    except Exception as e:
        db.rollback()
        print(f"❌ Failed to update database prices: {e}")
        raise
    finally:
        db.close()


def reduce_seed_json_prices():
    products_path = Path(__file__).resolve().parent.parent / "seed" / "products.json"
    if not products_path.exists():
        print(f"⚠️  {products_path} not found. Skipping seed JSON update.")
        return

    try:
        with open(products_path, "r", encoding="utf-8") as f:
            products = json.load(f)

        print(f"Updating {len(products)} products in seed/products.json...")
        for p in products:
            old_price = p["price"]
            p["price"] = round(p["price"] * 0.90, 2)

        with open(products_path, "w", encoding="utf-8") as f:
            json.dump(products, f, indent=2, ensure_ascii=False)
        print("✅ seed/products.json prices updated successfully.")
    except Exception as e:
        print(f"❌ Failed to update seed JSON: {e}")
        raise


if __name__ == "__main__":
    print("📉 Reducing all product prices by 10%...")
    reduce_database_prices()
    reduce_seed_json_prices()
    print("🎉 Done!")
