import os
import re
import urllib.request
from PIL import Image
from io import BytesIO

product = "Garmin Fenix 8 smartwatch"
query = "Garmin Fenix 8 smartwatch"
encoded_query = urllib.parse.quote(query)
url = f"https://www.bing.com/images/search?q={encoded_query}&form=HDRSC2"

req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'})
html = urllib.request.urlopen(req, timeout=10).read().decode('utf-8')
matches = re.findall(r'murl&quot;:&quot;(http[^&]+)&quot;', html)

for img_url in matches[:5]:
    try:
        img_req = urllib.request.Request(img_url, headers={'User-Agent': 'Mozilla/5.0'})
        img_data = urllib.request.urlopen(img_req, timeout=10).read()
        
        img = Image.open(BytesIO(img_data)).convert("RGB")
        width, height = img.size
        new_side = max(width, height)
        result = Image.new("RGB", (new_side, new_side), (255, 255, 255))
        result.paste(img, ((new_side - width) // 2, (new_side - height) // 2))
        
        result.resize((1000, 1000), Image.Resampling.LANCZOS).save("frontend/public/products/garminfenix8.webp", "WEBP", quality=95)
        print("✅ Success Garmin Fenix 8!")
        break
    except Exception as e:
        print("Error", e)
        continue
