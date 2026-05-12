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

directory = "frontend/public/products"
target_dir = "frontend/public/products/product_images"

mapping = {
    "Nikon Z6 III": "nikon-z6-iii.jpg",
    "OnePlus 13": "OnePlus-13-1.webp",
    "Samsung Galaxy Ring": "galaxy-ring-color-silver-mo.png",
    "CalDigit TS4 Thunderbolt 4 Dock": "TS4_HorizontalView_Back_WhiteBG.webp"
}

# Move and rename
final_mapping = {}
for prod_name, old_filename in mapping.items():
    old_path = os.path.join(directory, old_filename)
    if os.path.exists(old_path):
        new_filename = prod_name.replace(" ", "_") + os.path.splitext(old_filename)[1]
        new_path = os.path.join(target_dir, new_filename)
        os.rename(old_path, new_path)
        final_mapping[prod_name] = f"/products/product_images/{new_filename}"
        print(f"Moved and renamed {old_filename} to {new_filename}")

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
