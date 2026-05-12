import json
import os
import urllib.request
import urllib.error
import io

try:
    from PIL import Image
except ImportError:
    os.system("pip3 install Pillow --break-system-packages -q")
    from PIL import Image

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)",
    "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
}

PRODUCTS_TO_DOWNLOAD = [
    {
        "name": "Sony ZV-E10 II",
        "filename": "sony_zv_e10_ii.webp",
        "urls": [
            "https://alphauniverseglobal.media.zestyio.com/Alpha-Universe-ZV-E10-II_SEL16502_front_black.jpg",
            "https://www.bhphotovideo.com/images/images2500x2500/sony_zv_e10m2_b_zv_e10_ii_mirrorless_camera_1838825.jpg",
        ],
    },
    {
        "name": "Fujifilm X-T50",
        "filename": "fujifilm_xt50.webp",
        "urls": [
            "https://fujifilm-x.com/wp-content/uploads/2024/05/xt50_black_front.jpg",
            "https://asset.fujifilm.com/www/us/files/2024-05/xt50_main_black.jpg",
        ],
    },
    {
        "name": "Sony Xperia 1 VI",
        "filename": "sony_xperia_1_vi.webp",
        "urls": [
            "https://www.gsmarena.com/imgroot/news/24/05/xperia-1-vi-announced/-1024x/gsmarena_001.jpg",
        ],
    },
    {
        "name": "Nothing Ear (3)",
        "filename": "nothing_ear_3.webp",
        "urls": [
            "https://in.nothing.tech/cdn/shop/files/ear3_black_pdp_1.jpg",
            "https://global.nothing.tech/cdn/shop/files/ear3_black_front.jpg",
        ],
    },
    {
        "name": "Beyerdynamic DT 900 Pro X",
        "filename": "beyerdynamic_dt900prox.webp",
        "urls": [
            "https://north-america.beyerdynamic.com/media/catalog/product/d/t/dt-900-pro-x-product-picture-front.png",
        ],
    },
    {
        "name": "Huawei Watch GT 5 Pro",
        "filename": "huawei_watch_gt5_pro.webp",
        "urls": [
            "https://consumer.huawei.com/content/dam/huawei-cbg-site/common/mkt/pdp/wearables/huawei-watch-gt5-pro/img/HUAWEI-WATCH-GT-5-Pro-kv.jpg",
        ],
    },
    {
        "name": "ASUS ROG Zephyrus G16",
        "filename": "asus_rog_zephyrus_g16.webp",
        "urls": [
            "https://rog.asus.com/media/1707904990-GU605MY-G16.png",
        ],
    },
    {
        "name": "Apple iPad Pro M4 13\"",
        "filename": "apple_ipad_pro_m4.webp",
        "urls": [
            "https://cdsassets.apple.com/live/7WUAS350/images/ipad/2024/ipad-pro-m4-13-inch/ipad-pro-m4-13-chip-202405.png",
        ],
    },
    {
        "name": "Anker Prime 27,650mAh Power Bank",
        "filename": "anker_prime_powerbank.webp",
        "urls": [
            "https://m.media-amazon.com/images/I/71nSXIqwZxL._AC_SL1500_.jpg",
        ],
    },
    {
        "name": "DJI Osmo Action 5 Pro",
        "filename": "dji_osmo_action5_pro.webp",
        "urls": [
            "https://dji-official-fe.djicdn.com/dps/e714ec4b5ac1c5c5a8a58e35a5b0a4ba.jpg",
            "https://store.dji.com/cdn/shop/files/osmo-action-5-pro-front-image.jpg",
        ],
    },
    {
        "name": "Apple AirPods Max (2025)",
        "filename": "apple_airpods_max_2025.webp",
        "urls": [
            "https://cdsassets.apple.com/live/7WUAS350/images/airpods/airpods-max/airpods-max-2024.png",
        ],
    },
    {
        "name": "Sony WH-1000XM6",
        "filename": "sony_wh1000xm6.webp",
        "urls": [
            "https://www.sony.com/image/WH-1000XM6-black-front.jpg",
        ],
    },
    {
        "name": "Canon PowerShot V10",
        "filename": "canon_powershot_v10.webp",
        "urls": [
            "https://global.canon/ja/c-museum/wp-content/uploads/2025/12/dcc909_b.jpg",
        ],
    },
    {
        "name": "Google Pixel 9 Pro",
        "filename": "google_pixel_9_pro.webp",
        "urls": [
            "https://lh3.googleusercontent.com/pixel-9-pro-product-image-obsidian.png",
            "https://store.google.com/product/images/pixel_9_pro/obsidian/pixel_9_pro_obsidian_front.jpg",
        ],
    },
    {
        "name": "Garmin Fenix 8",
        "filename": "garmin_fenix8.webp",
        "urls": [
            "https://res.garmin.com/en/products/010-02905-01/v/cf-lg.jpg",
        ],
    },
]

OUTPUT_DIR = "frontend/public/products"

def process_image(data, size=800):
    img = Image.open(io.BytesIO(data)).convert("RGB")
    w, h = img.size
    side = min(w, h)
    left = (w - side) // 2
    top = (h - side) // 2
    img = img.crop((left, top, left + side, top + side))
    img = img.resize((size, size), Image.LANCZOS)
    return img

print("Downloading images...")
for p in PRODUCTS_TO_DOWNLOAD:
    out_path = os.path.join(OUTPUT_DIR, p["filename"])
    if os.path.exists(out_path):
        print(f"Skipping {p['filename']} (already exists)")
        continue
        
    for url in p["urls"]:
        try:
            req = urllib.request.Request(url, headers=HEADERS)
            data = urllib.request.urlopen(req, timeout=10).read()
            img = process_image(data, 1000)
            img.save(out_path, "WEBP", quality=90)
            print(f"Downloaded {p['filename']}")
            break
        except Exception as e:
            print(f"Failed {url}: {e}")

# Update products.json
print("\nUpdating products.json...")
with open("backend/seed/products.json", "r") as f:
    all_products = json.load(f)

updated_count = 0
for p in all_products:
    for target in PRODUCTS_TO_DOWNLOAD:
        if p["name"] == target["name"]:
            # Update image url
            new_url = f"/products/{target['filename']}"
            if p["image_urls"] != [new_url]:
                p["image_urls"] = [new_url]
                updated_count += 1

with open("backend/seed/products.json", "w") as f:
    json.dump(all_products, f, indent=2)

print(f"✅ Updated {updated_count} products in products.json!")

