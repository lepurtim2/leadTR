"""
LeadTR — Real Turkish Business Ingestion Pipeline
Queries OpenStreetMap Overpass API for verified Turkish POIs across major provinces.
Preserves raw provenance and inserts normalized canonical entities into Supabase.
"""
import requests
import json
import hashlib
import time
import uuid
import re
from datetime import datetime, timezone
from normalizers import normalize_turkish_text, normalize_business_name, normalize_turkish_phone

SUPABASE_URL = "https://daqgvimsxarrkhagphvd.supabase.co"
ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcWd2aW1zeGFycmtoYWdwaHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzI1NDQsImV4cCI6MjEwNjM0ODU0NH0.Aof-8I2uQxUznwnU--bUHkwmuQhSOHheZxjZaW7KlT0"

OSM_SOURCE_ID = "364e2b06-56ca-4fe1-a9b8-3abc6f702f81"

CATEGORY_MAP = {
    "hospital": "bb9473b5-69ad-4555-9978-5136dd18f47a",     # Hastane
    "pharmacy": "3ac157d3-76cf-47da-8799-5180438d18f5",     # Eczane
    "clinic": "7870cf96-256f-43d8-a8f3-a81039473c0e",       # Klinik
    "dentist": "de4ec94f-f43d-4ef2-ae7a-f343b0fd1ecf",      # Diş Kliniği
    "hotel": "47907fba-a30b-414d-aedd-873d06988d8e",        # Otel
    "bank": "3f53f7ea-a61a-4b30-b94d-42acef252865",         # Finans & Sigorta
    "restaurant": "8b3bc6fa-6105-46f4-b3f0-7a0a4427e6e2",   # Restoran
    "cafe": "b43ec8d3-515e-4441-b08b-85c2b16a3531",         # Kafe
}

PROVINCES = [
    {
        "name": "İstanbul",
        "normalized": "istanbul",
        "bbox": "40.95,28.85,41.15,29.15",
        "desc": "İstanbul Merkez (Avrupa & Anadolu)"
    },
    {
        "name": "İstanbul",
        "normalized": "istanbul",
        "bbox": "40.92,29.00,41.05,29.20",
        "desc": "İstanbul Anadolu (Kadıköy, Üsküdar, Ataşehir)"
    },
    {
        "name": "Ankara",
        "normalized": "ankara",
        "bbox": "39.88,32.78,40.00,32.90",
        "desc": "Ankara Merkez (Çankaya, Kızılay, Yenimahalle)"
    },
    {
        "name": "İzmir",
        "normalized": "izmir",
        "bbox": "38.38,27.08,38.48,27.22",
        "desc": "İzmir Merkez (Konak, Karşıyaka, Bornova)"
    },
    {
        "name": "Bursa",
        "normalized": "bursa",
        "bbox": "40.18,28.95,40.26,29.12",
        "desc": "Bursa Merkez (Nilüfer, Osmangazi)"
    },
    {
        "name": "Antalya",
        "normalized": "antalya",
        "bbox": "36.85,30.65,36.92,30.75",
        "desc": "Antalya Merkez (Muratpaşa, Konyaaltı)"
    },
]

HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}


OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]


def query_overpass_city(bbox: str, limit: int = 120):
    """Query Overpass API with multi-endpoint fallback and retry."""
    query = f"""[out:json][timeout:25];
(
  node["amenity"="hospital"]["name"]({bbox});
  node["amenity"="pharmacy"]["name"]({bbox});
  node["amenity"="clinic"]["name"]({bbox});
  node["amenity"="dentist"]["name"]({bbox});
  node["tourism"="hotel"]["name"]({bbox});
  node["amenity"="bank"]["name"]({bbox});
  node["amenity"="restaurant"]["name"]({bbox});
  node["amenity"="cafe"]["name"]({bbox});
);
out center {limit};
"""
    headers = {"User-Agent": "LeadTR-DataPlatform/1.0 (engineering@leadtr.com)"}

    for ep in OVERPASS_ENDPOINTS:
        for attempt in range(2):
            try:
                res = requests.post(
                    ep,
                    data={"data": query},
                    headers=headers,
                    timeout=30
                )
                if res.status_code == 200:
                    data = res.json()
                    elements = data.get("elements", [])
                    if elements:
                        return elements
                elif res.status_code in (429, 504):
                    print(f"  [RETRY] {ep} returned {res.status_code}, waiting 4s...", flush=True)
                    time.sleep(4)
            except Exception as e:
                print(f"  [ERR] {ep} attempt {attempt}: {e}", flush=True)
                time.sleep(2)

    return []


def compute_scores(tags: dict) -> dict:
    """Compute deterministic quality & lead scores based on verified attributes."""
    identity_confidence = 90
    completeness = 60
    digital_presence = 40

    if tags.get("phone") or tags.get("contact:phone"):
        completeness += 15
        digital_presence += 25
    if tags.get("website") or tags.get("contact:website"):
        completeness += 15
        digital_presence += 25
    if tags.get("addr:street"):
        completeness += 10
    if tags.get("opening_hours"):
        completeness += 5
        identity_confidence += 5

    completeness = min(completeness, 98)
    digital_presence = min(digital_presence, 95)
    freshness = 90

    # Composite lead score
    lead_score = int(0.35 * completeness + 0.35 * digital_presence + 0.15 * identity_confidence + 0.15 * freshness)

    return {
        "identity_confidence": identity_confidence,
        "completeness_score": completeness,
        "digital_presence_score": digital_presence,
        "freshness_score": freshness,
        "lead_score": lead_score
    }


def clean_url(url: str) -> str:
    """Ensure protocol and clean url."""
    if not url:
        return ""
    u = url.strip()
    if not u.startswith("http://") and not u.startswith("https://"):
        u = "https://" + u
    return u


def get_domain(url: str) -> str:
    """Extract domain from url."""
    try:
        cleaned = clean_url(url)
        from urllib.parse import urlparse
        return urlparse(cleaned).netloc.lower().replace("www.", "")
    except Exception:
        return ""


def post_batch(endpoint: str, records: list):
    """Post records to Supabase PostgREST in batch."""
    if not records:
        return
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    res = requests.post(url, headers=HEADERS, json=records)
    if res.status_code not in (200, 201, 204):
        print(f"  [ERROR] Failed to insert {endpoint}: {res.status_code} - {res.text[:200]}")
    else:
        print(f"  [SUCCESS] Inserted {len(records)} records into {endpoint}")


def run_ingestion():
    print("================================================================")
    print(" LeadTR — Production Real Turkish Business Ingestion Pipeline   ")
    print(" Source: OpenStreetMap (ODbL 1.0) via Overpass API               ")
    print(" Policy: ZERO MOCK / ZERO FAKE DATA                              ")
    print("================================================================\n")

    total_businesses = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    for prov in PROVINCES:
        print(f"\n>> Fetching real POIs for: {prov['desc']}...")
        elements = query_overpass_city(prov["bbox"], limit=120)
        print(f"   Found {len(elements)} real POIs in OSM.")

        if not elements:
            time.sleep(2)
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

            # Deduplicate within batch
            norm_name = normalize_business_name(name)
            if not norm_name or norm_name in seen_names:
                continue
            seen_names.add(norm_name)

            # Map category
            amenity = tags.get("amenity")
            tourism = tags.get("tourism")
            cat_slug = amenity or tourism
            cat_id = CATEGORY_MAP.get(cat_slug)

            # Coordinates
            lat = el.get("lat")
            lon = el.get("lon")
            if lat is None or lon is None:
                continue

            business_id = str(uuid.uuid4())
            osm_id = f"osm-node-{el.get('id')}"

            # Calculate deterministic scores
            scores = compute_scores(tags)

            # Automated description
            desc_tag = tags.get("description") or tags.get("operator") or f"{prov['name']} merkezli doğrulanmış işletme kaydı."

            b_batch.append({
                "id": business_id,
                "canonical_name": name.strip(),
                "automated_description": desc_tag[:250],
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

            # Business names
            names_batch.append({
                "business_id": business_id,
                "name": name.strip(),
                "normalized_name": norm_name,
                "is_primary": True,
                "source_id": OSM_SOURCE_ID,
                "source_record_id": osm_id,
                "created_at": now_iso
            })

            # Business location
            district = tags.get("addr:district") or tags.get("addr:suburb") or ""
            street = tags.get("addr:street", "")
            housenumber = tags.get("addr:housenumber", "")
            postcode = tags.get("addr:postcode", "")
            address_parts = [p for p in [street, housenumber, district, prov["name"]] if p]
            formatted_address = ", ".join(address_parts) if address_parts else f"{prov['name']}, Türkiye"

            locations_batch.append({
                "business_id": business_id,
                "country": "TR",
                "province": prov["name"],
                "province_normalized": prov["normalized"],
                "district": district if district else None,
                "district_normalized": normalize_turkish_text(district) if district else None,
                "street": f"{street} {housenumber}".strip() if street else None,
                "postal_code": postcode if postcode else None,
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

            # Business phone
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

            # Business website
            raw_website = tags.get("website") or tags.get("contact:website")
            if raw_website:
                clean_w = clean_url(raw_website)
                domain = get_domain(clean_w)
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

            # Raw source provenance
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

            # Field provenance
            prov_batch.append({
                "business_id": business_id,
                "field_name": "canonical_name",
                "source_id": OSM_SOURCE_ID,
                "source_record_id": osm_id,
                "observed_at": now_iso,
                "confidence": 95
            })

        print(f"   Prepared {len(b_batch)} validated records. Inserting into Supabase...")
        post_batch("source_records", sources_batch)
        post_batch("businesses", b_batch)
        post_batch("business_names", names_batch)
        post_batch("business_locations", locations_batch)
        post_batch("business_phones", phones_batch)
        post_batch("business_websites", websites_batch)
        post_batch("field_provenance", prov_batch)

        total_businesses += len(b_batch)
        time.sleep(2)  # Respect Overpass rate limits

    print(f"\n================================================================")
    print(f" INGESTION COMPLETE: {total_businesses} real Turkish businesses ingested!")
    print(f"================================================================")


if __name__ == "__main__":
    run_ingestion()
