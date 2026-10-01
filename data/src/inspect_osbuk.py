import urllib.request
import re

req = urllib.request.Request('https://osbuk.org', headers={'User-Agent': 'Mozilla/5.0'})
with urllib.request.urlopen(req, timeout=10) as r:
    html = r.read().decode('utf-8', errors='ignore')
    links = set(re.findall(r'href=["\'](/[^"\'>]+)["\']', html))
    osb_links = [l for l in links if any(k in l.lower() for k in ['osb', 'liste', 'firma', 'bolge', 'harita'])]
    print('OSBUK links:', sorted(osb_links))
