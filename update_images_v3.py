import os
import json
import sys
from pathlib import Path
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add backend to path for imports
sys.path.insert(0, str(Path("backend").resolve()))
from app.config import settings
from app.models.models import Product

target_dir = "frontend/public/products/product_images"

mapping = {
    "Realme GT 7 Pro": "gt-pro-7.jpg",
    "Amazfit T-Rex 3": "amazfit t-rex 3.webp",
    "Apple Magic Keyboard with Touch ID": "magic_keyboard_with_touch_id.jpeg",
    "DJI Mini 4 Pro": "dji mini 4 pro.jpeg"
}

# Move and rename
final_mapping = {}
for prod_name, old_filename in mapping.items():
    old_path = os.path.join(target_dir, old_filename)
    if os.path.exists(old_path):
        new_filename = prod_name.replace(" ", "_") + os.path.splitext(old_filename)[1]
        new_path = os.path.join(target_dir, new_filename)
        os.rename(old_path, new_path)
        final_mapping[prod_name] = f"/products/product_images/{new_filename}"
        print(f"Renamed {old_filename} to {new_filename}")

# Update products.json
with open("backend/seed/products.json", "r") as f:
    products = json.load(f)

for p in products:
    if p["name"] in final_mapping:
        p["image_urls"] = [final_mapping[p["name"]]]

with open("backend/seed/products.json", "w") as f:
    json.dump(products, f, indent=2)

# Update DB
engine = create_engine(settings.DATABASE_URL, pool_pre_ping=True)
Session = sessionmaker(bind=engine)
session = Session()

count = 0
for prod_name, img_url in final_mapping.items():
    product = session.query(Product).filter(Product.name == prod_name).first()
    if product:
        product.image_urls = [img_url]
        count += 1

session.commit()
print(f"Updated {count} products in DB.")
session.close()
