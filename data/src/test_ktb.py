import urllib.request
import re

url = "https://yigm.ktb.gov.tr/TR-9579/turizm-tesisleri.html"
req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
try:
    with urllib.request.urlopen(req, timeout=10) as r:
        html = r.read().decode("utf-8", errors="ignore")
        excel_links = re.findall(r'href=["\']([^"\']+\.xlsx?[^"\']*)["\']', html, re.I)
        print("KTB Excel links found:", excel_links)
except Exception as e:
    print("KTB err:", e)
