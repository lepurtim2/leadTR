import requests
import json

# Istanbul Central Bounding Box
# south, west, north, east
BBOX = "40.90,28.80,41.20,29.20"

query = f"""
[out:json][timeout:25];
(
  node["amenity"="hospital"]["name"]({BBOX});
  node["amenity"="pharmacy"]["name"]({BBOX});
  node["amenity"="clinic"]["name"]({BBOX});
  node["amenity"="dentist"]["name"]({BBOX});
  node["amenity"="bank"]["name"]({BBOX});
  node["tourism"="hotel"]["name"]({BBOX});
);
out center 150;
"""

print("Fetching real Turkish businesses from OpenStreetMap for Istanbul...")
res = requests.post(
    "https://overpass-api.de/api/interpreter",
    data={"data": query},
    headers={"User-Agent": "LeadTR-DataPipeline/1.0 (engineering@leadtr.com)"},
    timeout=30
)

data = res.json()
elements = data.get("elements", [])
print(f"✅ Successfully fetched {len(elements)} real Turkish businesses!")

if elements:
    sample = elements[0]
    tags = sample.get("tags", {})
    print("\n--- SAMPLE REAL BUSINESS ---")
    print(f"Name: {tags.get('name')}")
    print(f"Amenity: {tags.get('amenity') or tags.get('tourism')}")
    print(f"City: {tags.get('addr:city', tags.get('addr:province', 'İstanbul'))}")
    print(f"District: {tags.get('addr:district', tags.get('addr:suburb', ''))}")
    print(f"Street: {tags.get('addr:street', '')} {tags.get('addr:housenumber', '')}")
    print(f"Phone: {tags.get('phone', tags.get('contact:phone', ''))}")
    print(f"Website: {tags.get('website', tags.get('contact:website', ''))}")
    print(f"Coordinates: lat={sample.get('lat')}, lon={sample.get('lon')}")
    print("----------------------------\n")
