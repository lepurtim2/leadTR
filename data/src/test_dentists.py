import requests

query = """[out:json][timeout:25];
(
  node["amenity"="dentist"](40.85,28.60,41.25,29.35);
  node["healthcare"="dentist"](40.85,28.60,41.25,29.35);
);
out center 200;
"""
r = requests.post(
    "https://overpass-api.de/api/interpreter",
    data={"data": query},
    headers={"User-Agent": "LeadTR-DataOps/2.0"},
    timeout=30
)
print("Status:", r.status_code)
d = r.json()
elements = d.get("elements", [])
print(f"Total dentists found in Istanbul: {len(elements)}")
for el in elements[:10]:
    tags = el.get("tags", {})
    print(f"- {tags.get('name')} | Phone: {tags.get('phone', tags.get('contact:phone'))} | Address: {tags.get('addr:street', '')} {tags.get('addr:district', '')}")
