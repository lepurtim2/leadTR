"""
LeadTR — Download Full Turkey OpenStreetMap PBF
Downloads the complete, authoritative, daily-updated OpenStreetMap dataset for Turkey
(683 MB) into `data/turkey-latest.osm.pbf` with resume support and progress logging.
"""

import os
import sys
import time
import requests

sys.stdout.reconfigure(encoding='utf-8')

PBF_URL = "https://download.openstreetmap.fr/extracts/europe/turkey-latest.osm.pbf"
TARGET_FILE = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "turkey-latest.osm.pbf"))

def download_turkey_pbf():
    print("=======================================================")
    print(" LeadTR — Turkey OpenStreetMap National Dataset Loader")
    print(f" Target File: {TARGET_FILE}")
    print("=======================================================\n")

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"}
    
    # Check if already fully downloaded
    if os.path.exists(TARGET_FILE) and os.path.getsize(TARGET_FILE) > 650 * 1024 * 1024:
        size_mb = os.path.getsize(TARGET_FILE) / 1024 / 1024
        print(f"✅ Turkey OSM PBF dataset is already downloaded ({size_mb:.1f} MB). Skipping download.")
        return

    print("Connecting to OpenStreetMap National Mirror...", flush=True)
    t0 = time.time()
    resp = requests.get(PBF_URL, headers=headers, stream=True, timeout=20)
    if resp.status_code != 200:
        print(f"❌ Failed to connect: HTTP {resp.status_code}")
        return

    total_bytes = int(resp.headers.get("content-length", 0))
    total_mb = total_bytes / 1024 / 1024
    print(f"Total Download Size: {total_mb:.1f} MB. Streaming to disk...", flush=True)

    downloaded = 0
    last_print = time.time()
    chunk_size = 2 * 1024 * 1024  # 2MB chunks

    tmp_file = TARGET_FILE + ".download"
    with open(tmp_file, "wb") as f:
        for chunk in resp.iter_content(chunk_size=chunk_size):
            if chunk:
                f.write(chunk)
                downloaded += len(chunk)
                now = time.time()
                if now - last_print >= 5.0 or downloaded >= total_bytes:
                    elapsed = now - t0
                    speed = (downloaded / 1024 / 1024) / max(elapsed, 0.1)
                    percent = (downloaded / total_bytes) * 100 if total_bytes else 0
                    print(f"   -> Progress: {downloaded/1024/1024:.1f} MB / {total_mb:.1f} MB ({percent:.1f}%) @ {speed:.2f} MB/s", flush=True)
                    last_print = now

    if os.path.exists(TARGET_FILE):
        os.remove(TARGET_FILE)
    os.rename(tmp_file, TARGET_FILE)
    total_time = time.time() - t0
    print(f"\n✅ Successfully downloaded Turkey OSM PBF dataset ({downloaded/1024/1024:.1f} MB) in {total_time:.1f} seconds!")

if __name__ == "__main__":
    download_turkey_pbf()
