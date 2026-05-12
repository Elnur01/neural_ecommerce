import csv
import json
import time
from sqlalchemy.orm import Session
from app.database import SessionLocal
from app.models.models import Product

def export_prices_to_confirm():
    db: Session = SessionLocal()
    products = db.query(Product).all()
    
    with open('prices_to_confirm.csv', 'w', newline='', encoding='utf-8') as f:
        writer = csv.writer(f)
        writer.writerow(['product_id', 'category', 'name', 'current_price', 'suggested_price', 'notes'])
        for p in products:
            writer.writerow([p.product_id, p.category, p.name, p.price, '', ''])
            
    print(f"Exported {len(products)} products to prices_to_confirm.csv for manual review.")
    db.close()

if __name__ == "__main__":
    print("WP-3: Exporting catalog for pricing realism audit...")
    export_prices_to_confirm()
