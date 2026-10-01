import urllib.request
import re

req = urllib.request.Request("https://www.eczaneler.gen.tr/", headers={"User-Agent": "Mozilla/5.0"})
with urllib.request.urlopen(req, timeout=10) as r:
    html = r.read().decode("utf-8", errors="ignore")
    # All province links
    links = re.findall(r'href=["\'](/nobetci-([a-z-]+))["\']', html)
    print("Found province links:", len(links))
    print("Sample:", links[:5])

    # Check pharmacy directory (tüm eczaneler)
    dir_links = re.findall(r'href=["\'](/eczane-([a-z-]+))["\']', html)
    print("Found directory links:", len(dir_links))
