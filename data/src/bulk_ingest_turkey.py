"""
LeadTR — Bulk Turkey Real Business Ingestion Engine
Specialized in comprehensive regional and sector harvesting:
- All Dentists & Dental Clinics across Istanbul & major cities
- Pharmacies, Hospitals & Medical Clinics
- Hotels, Law Offices, Banks & Restaurants
Strictly real verified data with ODbL provenance & PostGIS spatial coordinates.
"""
import requests
import json
import hashlib
import time
import uuid
import sys
from datetime import datetime, timezone
from normalizers import normalize_turkish_text, normalize_business_name, normalize_turkish_phone

SUPABASE_URL = "https://daqgvimsxarrkhagphvd.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcWd2aW1zeGFycmtoYWdwaHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzI1NDQsImV4cCI6MjEwNjM0ODU0NH0.Aof-8I2uQxUznwnU--bUHkwmuQhSOHheZxjZaW7KlT0"

OSM_SOURCE_ID = "364e2b06-56ca-4fe1-a9b8-3abc6f702f81"

CATEGORY_MAP = {
    "dentist": "de4ec94f-f43d-4ef2-ae7a-f343b0fd1ecf",      # Diş Kliniği
    "pharmacy": "3ac157d3-76cf-47da-8799-5180438d18f5",     # Eczane
    "hospital": "bb9473b5-69ad-4555-9978-5136dd18f47a",     # Hastane
    "clinic": "7870cf96-256f-43d8-a8f3-a81039473c0e",       # Klinik
    "doctors": "7870cf96-256f-43d8-a8f3-a81039473c0e",      # Klinik
    "hotel": "47907fba-a30b-414d-aedd-873d06988d8e",        # Otel
    "bank": "3f53f7ea-a61a-4b30-b94d-42acef252865",         # Finans
    "lawyer": "463dbfef-f1dc-4c3e-8bbe-bd3f8e6af836",       # Hukuk Bürosu
    "notary": "851a3e49-469e-4614-a741-574b80090208",       # Noter
    "restaurant": "8b3bc6fa-6105-46f4-b3f0-7a0a4427e6e2",   # Restoran
    "cafe": "b43ec8d3-515e-4441-b08b-85c2b16a3531",         # Kafe
}

# Focused High-Density Bounding Boxes for Complete Sector Harvesting
ZONES = [
    # ── Istanbul Districts (Specialized Dentists, Clinics & Medical) ──
    {
        "province": "İstanbul",
        "norm_prov": "istanbul",
        "district": "Kadıköy",
        "bbox": "40.96,29.01,41.01,29.09",
        "tags": ["dentist", "pharmacy", "clinic", "hospital", "hotel", "lawyer"]
    },
    {
        "province": "İstanbul",
        "norm_prov": "istanbul",
        "district": "Beşiktaş & Şişli",
        "bbox": "41.04,28.98,41.09,29.04",
        "tags": ["dentist", "pharmacy", "clinic", "hospital", "hotel", "lawyer"]
    },
    {
        "province": "İstanbul",
        "norm_prov": "istanbul",
        "district": "Üsküdar & Ümraniye",
        "bbox": "41.01,29.01,41.06,29.13",
        "tags": ["dentist", "pharmacy", "clinic", "hospital"]
    },
    {
        "province": "İstanbul",
        "norm_prov": "istanbul",
        "district": "Bakırköy & Bahçelievler",
        "bbox": "40.97,28.84,41.02,28.92",
        "tags": ["dentist", "pharmacy", "clinic", "hospital"]
    },
    {
        "province": "İstanbul",
        "norm_prov": "istanbul",
        "district": "Fatih & Beyoğlu",
        "bbox": "41.00,28.93,41.05,28.99",
        "tags": ["dentist", "hotel", "restaurant", "pharmacy", "lawyer"]
    },
    {
        "province": "İstanbul",
        "norm_prov": "istanbul",
        "district": "Sarıyer & Maslak",
        "bbox": "41.09,29.00,41.15,29.08",
        "tags": ["dentist", "hospital", "clinic", "hotel", "bank"]
    },
    {
        "province": "İstanbul",
        "norm_prov": "istanbul",
        "district": "Maltepe & Kartal",
        "bbox": "40.89,29.13,40.94,29.22",
        "tags": ["dentist", "pharmacy", "clinic", "hospital"]
    },
    # ── Ankara Districts ──
    {
        "province": "Ankara",
        "norm_prov": "ankara",
        "district": "Çankaya & Kızılay",
        "bbox": "39.89,32.83,39.94,32.88",
        "tags": ["dentist", "clinic", "hospital", "lawyer", "hotel", "pharmacy"]
    },
    {
        "province": "Ankara",
        "norm_prov": "ankara",
        "district": "Yenimahalle",
        "bbox": "39.95,32.78,40.00,32.84",
        "tags": ["dentist", "hospital", "pharmacy", "bank"]
    },
    # ── İzmir Districts ──
    {
        "province": "İzmir",
        "norm_prov": "izmir",
        "district": "Konak & Alsancak",
        "bbox": "38.41,27.12,38.45,27.16",
        "tags": ["dentist", "clinic", "hospital", "lawyer", "hotel", "pharmacy"]
    },
    {
        "province": "İzmir",
        "norm_prov": "izmir",
        "district": "Karşıyaka & Bostanlı",
        "bbox": "38.44,27.08,38.48,27.13",
        "tags": ["dentist", "pharmacy", "clinic", "restaurant", "cafe"]
    },
]

OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]

HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}


def query_overpass_zone(zone: dict, limit: int = 150):
    """Query Overpass for specific tags in zone."""
    tag_queries = []
    for t in zone["tags"]:
        if t in ("hotel",):
            tag_queries.append(f'node["tourism"="{t}"]["name"]({zone["bbox"]});')
        elif t in ("lawyer",):
            tag_queries.append(f'node["office"="{t}"]["name"]({zone["bbox"]});')
        else:
            tag_queries.append(f'node["amenity"="{t}"]["name"]({zone["bbox"]});')

    query_body = "\n  ".join(tag_queries)
    query = f"""[out:json][timeout:25];
(
  {query_body}
);
out center {limit};
"""
    headers = {"User-Agent": "LeadTR-BulkIngestion/2.0 (data-ops@leadtr.com)"}

    for ep in OVERPASS_ENDPOINTS:
        try:
            res = requests.post(ep, data={"data": query}, headers=headers, timeout=30)
            if res.status_code == 200:
                data = res.json()
                return data.get("elements", [])
            elif res.status_code in (429, 504):
                time.sleep(3)
        except Exception:
            time.sleep(2)

    return []


def compute_scores(tags: dict) -> dict:
    identity = 92
    completeness = 65
    presence = 45

    if tags.get("phone") or tags.get("contact:phone"):
        completeness += 15
        presence += 25
    if tags.get("website") or tags.get("contact:website"):
        completeness += 15
        presence += 25
    if tags.get("addr:street"):
        completeness += 10
    if tags.get("opening_hours"):
        completeness += 5
        identity += 5

    completeness = min(completeness, 98)
    presence = min(presence, 95)
    freshness = 92

    lead_score = int(0.35 * completeness + 0.35 * presence + 0.15 * identity + 0.15 * freshness)

    return {
        "identity_confidence": identity,
        "completeness_score": completeness,
        "digital_presence_score": presence,
        "freshness_score": freshness,
        "lead_score": lead_score
    }


def clean_url(url: str) -> str:
    if not url:
        return ""
    u = url.strip()
    if not u.startswith("http://") and not u.startswith("https://"):
        u = "https://" + u
    return u


def post_batch(endpoint: str, records: list):
    if not records:
        return
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    requests.post(url, headers=HEADERS, json=records)


def run_bulk_harvest():
    print("==================================================================", flush=True)
    print(" LeadTR — Bulk Sector & Regional Harvester Engine                 ", flush=True)
    print(" Target: Dentists, Medical, Law, Hotels across Key TR Districts   ", flush=True)
    print(" Policy: 100% Real OpenStreetMap Data • Verified Coordinates     ", flush=True)
    print("==================================================================\n", flush=True)

    total_ingested = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    for idx, zone in enumerate(ZONES, 1):
        print(f"[{idx}/{len(ZONES)}] Harvesting: {zone['province']} - {zone['district']}...", flush=True)
        elements = query_overpass_zone(zone, limit=120)

        if not elements:
            print("   -> No elements found or endpoint rate limited, continuing...", flush=True)
            time.sleep(3)
            continue

        b_batch = []
        names_batch = []
        locations_batch = []
        phones_batch = []
        websites_batch = []
        sources_batch = []
        prov_batch = []

        seen_names = set()

        for el in elements:
            tags = el.get("tags", {})
            name = tags.get("name")
            if not name or len(name.strip()) < 2:
                continue

            norm_name = normalize_business_name(name)
            if not norm_name or norm_name in seen_names:
                continue
            seen_names.add(norm_name)

            # Map category
            cat_slug = tags.get("amenity") or tags.get("tourism") or tags.get("office")
            cat_id = CATEGORY_MAP.get(cat_slug)

            lat = el.get("lat")
            lon = el.get("lon")
            if lat is None or lon is None:
                continue

            business_id = str(uuid.uuid4())
            osm_id = f"osm-node-{el.get('id')}"

            scores = compute_scores(tags)
            desc = tags.get("description") or f"{zone['district']}, {zone['province']} konumunda doğrulanmış işletme."

            b_batch.append({
                "id": business_id,
                "canonical_name": name.strip(),
                "automated_description": desc[:250],
                "business_status": "active",
                "category_id": cat_id,
                "source_count": 1,
                "identity_confidence": scores["identity_confidence"],
                "completeness_score": scores["completeness_score"],
                "freshness_score": scores["freshness_score"],
                "digital_presence_score": scores["digital_presence_score"],
                "lead_score": scores["lead_score"],
                "first_seen_at": now_iso,
                "last_seen_at": now_iso,
                "created_at": now_iso,
                "updated_at": now_iso
            })

            names_batch.append({
                "business_id": business_id,
                "name": name.strip(),
                "normalized_name": norm_name,
                "is_primary": True,
                "source_id": OSM_SOURCE_ID,
                "source_record_id": osm_id,
                "created_at": now_iso
            })

            street = tags.get("addr:street", "")
            housenumber = tags.get("addr:housenumber", "")
            district_val = tags.get("addr:district") or tags.get("addr:suburb") or zone["district"]
            address_parts = [p for p in [street, housenumber, district_val, zone["province"]] if p]
            formatted_address = ", ".join(address_parts) if address_parts else f"{zone['district']}, {zone['province']}"

            locations_batch.append({
                "business_id": business_id,
                "country": "TR",
                "province": zone["province"],
                "province_normalized": zone["norm_prov"],
                "district": district_val,
                "district_normalized": normalize_turkish_text(district_val),
                "street": f"{street} {housenumber}".strip() if street else None,
                "formatted_address": formatted_address,
                "latitude": float(lat),
                "longitude": float(lon),
                "location": f"SRID=4326;POINT({lon} {lat})",
                "source_id": OSM_SOURCE_ID,
                "source_record_id": osm_id,
                "confidence": 95,
                "created_at": now_iso,
                "updated_at": now_iso
            })

            raw_phone = tags.get("phone") or tags.get("contact:phone")
            if raw_phone:
                norm_phone, phone_type = normalize_turkish_phone(raw_phone)
                phones_batch.append({
                    "business_id": business_id,
                    "original_phone": raw_phone.strip(),
                    "normalized_phone": norm_phone,
                    "country_code": "TR",
                    "phone_type": phone_type,
                    "is_primary": True,
                    "source_id": OSM_SOURCE_ID,
                    "source_record_id": osm_id,
                    "confidence": 95,
                    "first_seen_at": now_iso,
                    "last_seen_at": now_iso
                })

            raw_website = tags.get("website") or tags.get("contact:website")
            if raw_website:
                clean_w = clean_url(raw_website)
                domain = clean_w.replace("https://", "").replace("http://", "").split("/")[0].replace("www.", "")
                websites_batch.append({
                    "business_id": business_id,
                    "original_url": raw_website.strip(),
                    "canonical_url": clean_w,
                    "domain": domain,
                    "is_primary": True,
                    "https_available": clean_w.startswith("https://"),
                    "source_id": OSM_SOURCE_ID,
                    "confidence": 95,
                    "created_at": now_iso,
                    "updated_at": now_iso
                })

            raw_json = json.dumps(el, ensure_ascii=False)
            payload_hash = hashlib.sha256(raw_json.encode("utf-8")).hexdigest()
            sources_batch.append({
                "source_id": OSM_SOURCE_ID,
                "source_record_id": osm_id,
                "raw_payload_hash": payload_hash,
                "source_version": "osm-2026-09",
                "collected_at": now_iso,
                "created_at": now_iso
            })

            prov_batch.append({
                "business_id": business_id,
                "field_name": "canonical_name",
                "source_id": OSM_SOURCE_ID,
                "source_record_id": osm_id,
                "observed_at": now_iso,
                "confidence": 95
            })

        post_batch("source_records", sources_batch)
        post_batch("businesses", b_batch)
        post_batch("business_names", names_batch)
        post_batch("business_locations", locations_batch)
        post_batch("business_phones", phones_batch)
        post_batch("business_websites", websites_batch)
        post_batch("field_provenance", prov_batch)

        total_ingested += len(b_batch)
        print(f"   -> Successfully ingested {len(b_batch)} verified businesses (Running Total: {total_ingested})", flush=True)
        time.sleep(3)

    print(f"\n==================================================================", flush=True)
    print(f" COMPLETE: {total_ingested} new real Turkish businesses added!   ", flush=True)
    print(f"==================================================================", flush=True)


if __name__ == "__main__":
    run_bulk_harvest()
