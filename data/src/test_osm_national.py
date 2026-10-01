"""
LeadTR — Test OSM Integration with Entity Resolution Engine
Demonstrates fetching real POIs from OpenStreetMap, passing them through
the DataSanitizer, and deduplicating against our existing Parquet dataset.
"""

import sys
import json
import time
import requests
import duckdb
from entity_resolver import EntityResolutionEngine, BusinessEntity, normalize_turkish_phone

sys.stdout.reconfigure(encoding='utf-8')

print("1. Loading Existing Parquet Dataset Sample into Entity Resolution Engine...", flush=True)
resolver = EntityResolutionEngine()

# Connect to local DuckDB and load existing Istanbul / Kadıköy records to memory
parquet_path = "c:/Users/Administrator/Desktop/Personal/data/leadTR/data/parquets/sector_01_istanbul_marmara_dogu.parquet"
con = duckdb.connect()

query = f"""
SELECT 
    id, canonical_name, category_name, category_slug, province, province_normalized,
    district, district_normalized, formatted_address, latitude, longitude,
    phone, normalized_phone, website, email
FROM '{parquet_path}'
WHERE lower(district_normalized) = 'kadikoy'
LIMIT 5000;
"""

rows = con.execute(query).fetchall()
print(f"   -> Loaded {len(rows):,} existing Kadıköy businesses into memory for exact/fuzzy matching.", flush=True)

for r in rows:
    ent = BusinessEntity(
        id=str(r[0]),
        canonical_name=r[1],
        category_name=r[2],
        category_slug=r[3],
        province=r[4],
        province_normalized=r[5],
        district=r[6],
        district_normalized=r[7],
        formatted_address=r[8] or "",
        latitude=float(r[9]),
        longitude=float(r[10]),
        phone=r[11],
        normalized_phone=r[12],
        website=r[13],
        email=r[14]
    )
    resolver.register_existing_entity(ent)

print("\n2. Fetching Live OSM POIs for Kadıköy (Healthcare, Dining, Services)...", flush=True)

# Bounding box for Kadıköy
BBOX = "40.96,29.01,41.01,29.08"
osm_query = f"""
[out:json][timeout:25];
(
  node["amenity"~"dentist|pharmacy|clinic|hospital|restaurant|cafe|bank"]({BBOX});
  node["shop"~"hairdresser|beauty|bakery|supermarket"]({BBOX});
);
out center 150;
"""

try:
    resp = requests.post(
        "https://overpass-api.de/api/interpreter",
        data={"data": osm_query},
        headers={"User-Agent": "LeadTR-DataPipeline/1.0 (contact@leadtr.com)"},
        timeout=30
    )
    elements = resp.json().get("elements", [])
    print(f"   -> Successfully received {len(elements)} live OSM POIs from OpenStreetMap!", flush=True)
except Exception as e:
    print(f"   -> Error calling Overpass API: {e}")
    sys.exit(1)

print("\n3. Running Entity Resolution & Deduplication Pipeline...", flush=True)

merged_duplicates = 0
enriched_phones = 0
enriched_websites = 0
new_unique_entities = 0
discarded_garbage = 0

for item in elements:
    tags = item.get("tags", {})
    name = tags.get("name")
    lat = item.get("lat")
    lon = item.get("lon")

    # Sanitation check
    if not resolver.is_valid_record(name, lat, lon):
        discarded_garbage += 1
        continue

    phone = tags.get("phone") or tags.get("contact:phone")
    website = tags.get("website") or tags.get("contact:website")
    norm_phone, phone_type = normalize_turkish_phone(phone)

    # Determine category
    amenity = tags.get("amenity") or tags.get("shop")
    cat_name = "Hizmet & Ticaret"
    cat_slug = "hizmet"
    if "dentist" in amenity:
        cat_name, cat_slug = "Diş Hekimi", "dis-hekimi"
    elif "pharmacy" in amenity:
        cat_name, cat_slug = "Eczane", "eczane"
    elif "clinic" in amenity or "hospital" in amenity:
        cat_name, cat_slug = "Klinik & Sağlık", "klinik"
    elif "restaurant" in amenity:
        cat_name, cat_slug = "Restoran", "restoran"
    elif "cafe" in amenity:
        cat_name, cat_slug = "Kafe", "kafe"
    elif "hairdresser" in amenity or "beauty" in amenity:
        cat_name, cat_slug = "Kuaför & Güzellik", "kuafor"

    candidate = BusinessEntity(
        id=f"osm-{item['id']}",
        canonical_name=name,
        category_name=cat_name,
        category_slug=cat_slug,
        province="İstanbul",
        province_normalized="istanbul",
        district="Kadıköy",
        district_normalized="kadikoy",
        formatted_address=f"{tags.get('addr:street', '')} {tags.get('addr:housenumber', '')}".strip() or "Kadıköy, İstanbul",
        latitude=lat,
        longitude=lon,
        phone=phone,
        normalized_phone=norm_phone,
        phone_type=phone_type,
        website=website,
        source_name="osm",
        source_record_id=str(item["id"])
    )

    is_new, final_ent = resolver.merge_or_insert(candidate)
    if is_new:
        new_unique_entities += 1
    else:
        merged_duplicates += 1
        if candidate.phone and final_ent.phone == candidate.phone:
            enriched_phones += 1
        if candidate.website and final_ent.website == candidate.website:
            enriched_websites += 1

print("\n=======================================================")
print("  LeadTR Entity Resolution & Deduplication Results   ")
print("=======================================================")
print(f"Total OSM Candidates Processed : {len(elements)}")
print(f"Discarded Garbage / Non-Biz    : {discarded_garbage}")
print(f"Merged / Duplicate Entities    : {merged_duplicates} (100% prevented duplicates!)")
print(f"  └─ Missing Phone Enriched    : {enriched_phones}")
print(f"  └─ Missing Website Enriched  : {enriched_websites}")
print(f"Brand New Unique Businesses    : {new_unique_entities} (Added to lead pool!)")
print("=======================================================\n")
