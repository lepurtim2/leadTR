import requests
import time

url = "https://download.openstreetmap.fr/extracts/europe/turkey-latest.osm.pbf"
headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}

t0 = time.time()
r = requests.get(url, headers=headers, stream=True, timeout=10)
print(f"Status: {r.status_code}, Headers: {dict(r.headers.items())}")

chunk_size = 1024 * 1024  # 1MB
downloaded = 0
for chunk in r.iter_content(chunk_size=chunk_size):
    downloaded += len(chunk)
    if downloaded >= 10 * 1024 * 1024:  # test 10MB
        break

t_elapsed = time.time() - t0
speed_mb = (downloaded / (1024 * 1024)) / t_elapsed
print(f"Downloaded {downloaded / 1024 / 1024:.1f} MB in {t_elapsed:.2f}s ({speed_mb:.2f} MB/s)")
