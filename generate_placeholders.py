import json
import os
import random
from PIL import Image, ImageDraw, ImageFont

# Load products
with open("backend/seed/products.json", "r") as f:
    products = json.load(f)

# Ensure directory exists
out_dir = "frontend/public/products"
os.makedirs(out_dir, exist_ok=True)

# Generate a placeholder for each product
for p in products:
    name = p["name"]
    category = p["category"]
    
    # The filename should match what's in image_urls
    # e.g., ["/products/iphone16promax.webp"] -> iphone16promax.webp
    url = p["image_urls"][0]
    filename = url.split("/")[-1]
    
    # Create a simple 1000x1000 image
    img = Image.new("RGB", (1000, 1000), color=(240, 245, 250))
    draw = ImageDraw.Draw(img)
    
    # Draw some placeholder graphics
    draw.rectangle([100, 100, 900, 900], fill=(220, 230, 245), outline=(200, 210, 230), width=10)
    
    # Load a default font
    try:
        font_large = ImageFont.truetype("Arial", 60)
        font_small = ImageFont.truetype("Arial", 40)
    except:
        font_large = ImageFont.load_default(size=60)
        font_small = ImageFont.load_default(size=40)
        
    # Draw text
    draw.text((500, 450), category, fill=(100, 120, 150), font=font_small, anchor="mm")
    
    # Handle long names
    if len(name) > 20:
        name = name[:20] + "..."
    draw.text((500, 520), name, fill=(50, 60, 80), font=font_large, anchor="mm")
    
    # Save
    path = os.path.join(out_dir, filename)
    img.save(path, "WEBP", quality=90)
    print(f"Generated {filename}")

print("✅ Generated all placeholders!")
