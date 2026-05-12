import json
import os
import re
import urllib.request
from PIL import Image
from io import BytesIO

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

with open("backend/seed/products.json", "r") as f:
    all_products = json.load(f)

filename_map = {}
for p in all_products:
    if p["name"] in products_to_download:
        url = p["image_urls"][0]
        filename = url.split("/")[-1]
        filename_map[p["name"]] = filename

out_dir = "frontend/public/products"
os.makedirs(out_dir, exist_ok=True)

def download_bing_image(query):
    encoded_query = urllib.parse.quote(f"{query} product photography white background")
    url = f"https://www.bing.com/images/search?q={encoded_query}&form=HDRSC2"
    
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
    try:
        html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8')
        # Find image URLs in the HTML
        matches = re.findall(r'murl&quot;:&quot;(http[^&]+)&quot;', html)
        if not matches:
            return None
            
        # Try up to 3 links in case some are dead
        for img_url in matches[:3]:
            try:
                img_req = urllib.request.Request(img_url, headers={'User-Agent': 'Mozilla/5.0'})
                img_data = urllib.request.urlopen(img_req, timeout=10).read()
                return img_data
            except:
                continue
    except:
        return None
    return None

for product in products_to_download:
    filename = filename_map.get(product)
    if not filename:
        continue
        
    print(f"\n🔍 Searching Bing for: {product}")
    img_data = download_bing_image(product)
    
    if not img_data:
        print(f"❌ Failed to download image for {product}")
        continue
        
    try:
        img = Image.open(BytesIO(img_data))
        if img.mode in ("RGBA", "P"):
            bg = Image.new("RGB", img.size, (255, 255, 255))
            if img.mode == "RGBA":
                bg.paste(img, mask=img.split()[3])
            else:
                img = img.convert("RGB")
                bg.paste(img)
            img = bg
        else:
            img = img.convert("RGB")
            
        width, height = img.size
        new_side = max(width, height)
        result = Image.new("RGB", (new_side, new_side), (255, 255, 255))
        result.paste(img, ((new_side - width) // 2, (new_side - height) // 2))
        
        final_path = os.path.join(out_dir, filename)
        result.resize((1000, 1000), Image.Resampling.LANCZOS).save(final_path, "WEBP", quality=95)
        print(f"✅ Successfully processed and saved {filename}")
    except Exception as e:
        print(f"❌ Error processing {product}: {e}")

print("\n🎉 Finished downloading requested images!")
