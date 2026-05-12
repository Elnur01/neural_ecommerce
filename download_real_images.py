import json
import os
import shutil
from PIL import Image
from bing_image_downloader import downloader

products_to_download = [
    "Sony ZV-E10 II",
    "Fujifilm X-T50",
    "Sony Xperia 1 VI",
    "Nothing Ear (3)",
    "Beyerdynamic DT 900 Pro X",
    "Huawei Watch GT 5 Pro",
    "ASUS ROG Zephyrus G16",
    "Apple iPad Pro M4 13\"",
    "Anker Prime 27,650mAh Power Bank",
    "DJI Osmo Action 5 Pro",
    "Apple AirPods Max (2025)",
    "Sony WH-1000XM6",
    "Canon PowerShot V10",
    "Google Pixel 9 Pro",
    "Garmin Fenix 8"
]

# Load seed data to find the exact filenames needed
with open("backend/seed/products.json", "r") as f:
    all_products = json.load(f)

# Build a map of product name to filename
filename_map = {}
for p in all_products:
    if p["name"] in products_to_download:
        url = p["image_urls"][0]
        filename = url.split("/")[-1]
        filename_map[p["name"]] = filename

out_dir = "frontend/public/products"
temp_dir = "temp_downloads"
os.makedirs(out_dir, exist_ok=True)

for product in products_to_download:
    filename = filename_map.get(product)
    if not filename:
        print(f"⚠️ Could not find {product} in products.json. Skipping.")
        continue
        
    print(f"\n🔍 Searching Bing for: {product}")
    query = f"{product} product photography white background"
    
    # Download 1 image
    try:
        downloader.download(query, limit=1, output_dir=temp_dir, force_replace=False, timeout=10, verbose=False)
        
        # bing-image-downloader creates a subfolder named after the query
        downloaded_folder = os.path.join(temp_dir, query)
        files = os.listdir(downloaded_folder)
        
        if not files:
            print(f"❌ Failed to download image for {product}")
            continue
            
        img_path = os.path.join(downloaded_folder, files[0])
        
        # Process image with Pillow (make square, RGB, WebP)
        img = Image.open(img_path)
        if img.mode in ("RGBA", "P"):
            # Create a white background
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "RGBA":
                bg.paste(img, mask=img.split()[3]) # paste using alpha channel
            else:
                img = img.convert("RGB")
                bg.paste(img)
            img = bg
        else:
            img = img.convert("RGB")
            
        # Make Square
        width, height = img.size
        new_side = max(width, height)
        result = Image.new("RGB", (new_side, new_side), (255, 255, 255))
        result.paste(img, ((new_side - width) // 2, (new_side - height) // 2))
        
        # Save to final directory
        final_path = os.path.join(out_dir, filename)
        result.resize((1000, 1000), Image.Resampling.LANCZOS).save(final_path, "WEBP", quality=95)
        print(f"✅ Successfully processed and saved {filename}")
        
    except Exception as e:
        print(f"❌ Error processing {product}: {e}")

# Cleanup temp dir
if os.path.exists(temp_dir):
    shutil.rmtree(temp_dir)

print("\n🎉 Finished downloading requested images!")
