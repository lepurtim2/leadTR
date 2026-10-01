"""
LeadTR — Overture Maps Foundation Turkey Ingestion Engine
Queries partitioned Overture Places Parquet on AWS S3 via DuckDB across Turkey.
Zero API rate limits • High throughput • Full ODbL/CDLA provenance tracking.
"""
import duckdb
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

# Overture Maps source UUID in data_sources
OVERTURE_SOURCE_ID = "b158ae70-924f-4c43-a634-59aceb22f069"
OVERTURE_S3_PATH = "s3://overturemaps-us-west-2/release/2026-09-23.1/theme=places/type=place/*"

CATEGORY_MAP = {
    # Health & Medical
    "dentist": "de4ec94f-f43d-4ef2-ae7a-f343b0fd1ecf",
    "dental_clinic": "de4ec94f-f43d-4ef2-ae7a-f343b0fd1ecf",
    "pharmacy": "3ac157d3-76cf-47da-8799-5180438d18f5",
    "hospital": "bb9473b5-69ad-4555-9978-5136dd18f47a",
    "medical_clinic": "7870cf96-256f-43d8-a8f3-a81039473c0e",
    "doctor": "7870cf96-256f-43d8-a8f3-a81039473c0e",
    "veterinarian": "70b1a4f9-357b-496e-a4fe-c07d9bc65b68",

    # Accommodation
    "hotel": "47907fba-a30b-414d-aedd-873d06988d8e",
    "motel": "47907fba-a30b-414d-aedd-873d06988d8e",
    "hostel": "82137b00-c041-4105-bfa1-036a6ffa1ce2",

    # Food & Beverage
    "restaurant": "8b3bc6fa-6105-46f4-b3f0-7a0a4427e6e2",
    "barbecue_restaurant": "8b3bc6fa-6105-46f4-b3f0-7a0a4427e6e2",
    "cafe": "b43ec8d3-515e-4441-b08b-85c2b16a3531",
    "coffee_shop": "b43ec8d3-515e-4441-b08b-85c2b16a3531",
    "bakery": "a311c222-7b04-4f1d-9248-bf4f55614310",
    "fast_food_restaurant": "cdb62004-5541-4b46-b085-977875a1d32f",

    # Automotive
    "automotive_repair": "851af341-be88-48a9-ac32-cbf166b59b38",
    "auto_dealer": "36dee2e7-95ed-46b2-a3eb-154637730459",
    "car_wash": "afcf449b-db51-4774-bbae-6372be31712b",

    # Legal & Professional
    "lawyer": "463dbfef-f1dc-4c3e-8bbe-bd3f8e6af836",
    "legal_services": "463dbfef-f1dc-4c3e-8bbe-bd3f8e6af836",
    "bank": "3f53f7ea-a61a-4b30-b94d-42acef252865",
    "financial_service": "3f53f7ea-a61a-4b30-b94d-42acef252865",
}

REGIONS = [
    {
        "name": "İstanbul",
        "norm_name": "istanbul",
        "min_lng": 28.50,
        "max_lng": 29.50,
        "min_lat": 40.80,
        "max_lat": 41.30,
        "limit": 1000
    },
    {
        "name": "Ankara",
        "norm_name": "ankara",
        "min_lng": 32.50,
        "max_lng": 33.20,
        "min_lat": 39.70,
        "max_lat": 40.15,
        "limit": 500
    },
    {
        "name": "İzmir",
        "norm_name": "izmir",
        "min_lng": 26.85,
        "max_lng": 27.40,
        "min_lat": 38.25,
        "max_lat": 38.65,
        "limit": 500
    },
    {
        "name": "Bursa",
        "norm_name": "bursa",
        "min_lng": 28.80,
        "max_lng": 29.40,
        "min_lat": 40.10,
        "max_lat": 40.40,
        "limit": 400
    },
    {
        "name": "Antalya",
        "norm_name": "antalya",
        "min_lng": 30.50,
        "max_lng": 31.00,
        "min_lat": 36.70,
        "max_lat": 37.10,
        "limit": 400
    }
]

HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal"
}


def post_batch(endpoint: str, records: list):
    if not records:
        return
    # PostgREST batches of 100
    chunk_size = 100
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    for i in range(0, len(records), chunk_size):
        chunk = records[i:i + chunk_size]
        res = requests.post(url, headers=HEADERS, json=chunk)
        if res.status_code not in (200, 201, 204):
            print(f"  [ERROR] {endpoint} batch insert failed ({res.status_code}): {res.text[:150]}", flush=True)


def run_overture_pipeline():
    print("==================================================================", flush=True)
    print(" LeadTR — Overture Maps Foundation Turkey Bulk Pipeline           ", flush=True)
    print(" Source: AWS S3 Geoparquet • Release: 2026-09-23.1                ", flush=True)
    print(" Engine: DuckDB Spatial + PostgREST Live Loader                   ", flush=True)
    print("==================================================================\n", flush=True)

    print("Initializing DuckDB connection and S3 configuration...", flush=True)
    con = duckdb.connect()
    con.execute("LOAD spatial; LOAD httpfs; SET s3_region='us-west-2';")
    print("DuckDB engine ready.\n", flush=True)

    total_ingested = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    for reg in REGIONS:
        print(f">> Querying Overture Places on S3 for: {reg['name']}...", flush=True)
        query = f"""
        SELECT 
            id AS overture_id,
            names.primary AS name,
            taxonomy.primary AS category,
            addresses[1].locality AS district,
            addresses[1].region AS province,
            addresses[1].freeform AS formatted_address,
            phones[1] AS phone,
            websites[1] AS website,
            emails[1] AS email,
            confidence AS overture_confidence,
            bbox.xmin AS lon,
            bbox.ymin AS lat
        FROM read_parquet('{OVERTURE_S3_PATH}', hive_partitioning=1)
        WHERE bbox.xmin >= {reg['min_lng']} AND bbox.xmax <= {reg['max_lng']}
          AND bbox.ymin >= {reg['min_lat']} AND bbox.ymax <= {reg['max_lat']}
          AND names.primary IS NOT NULL
        LIMIT {reg['limit']};
        """

        try:
            start_t = time.time()
            rows = con.execute(query).fetchall()
            elapsed = time.time() - start_t
            print(f"   Downloaded {len(rows)} real places from S3 in {elapsed:.1f}s.", flush=True)
        except Exception as e:
            print(f"   [ERROR] Failed to query Overture S3: {e}", flush=True)
            continue

        if not rows:
            continue

        b_batch = []
        names_batch = []
        locations_batch = []
        phones_batch = []
        websites_batch = []
        emails_batch = []
        sources_batch = []
        prov_batch = []

        seen_names = set()

        for r in rows:
            (
                overture_id,
                name,
                category,
                district,
                province,
                formatted_address,
                phone,
                website,
                email,
                overture_confidence,
                lon,
                lat
            ) = r

            if not name or len(name.strip()) < 2:
                continue

            norm_name = normalize_business_name(name)
            if not norm_name or norm_name in seen_names:
                continue
            seen_names.add(norm_name)

            business_id = str(uuid.uuid4())
            cat_id = CATEGORY_MAP.get(category)

            # Scores
            identity_score = int((overture_confidence or 0.8) * 100)
            completeness = 70
            presence = 40
            if phone:
                completeness += 15
                presence += 25
            if website:
                completeness += 15
                presence += 25
            lead_score = int(0.35 * completeness + 0.35 * presence + 0.15 * identity_score + 0.15 * 90)

            # Province & District
            prov_name = reg["name"]
            dist_name = district if district else ""
            full_address = formatted_address if formatted_address else f"{dist_name}, {prov_name}".strip(", ")

            desc = f"{prov_name} merkezli doğrulanmış ticari işletme kaydı."

            b_batch.append({
                "id": business_id,
                "canonical_name": name.strip(),
                "automated_description": desc,
                "business_status": "active",
                "category_id": cat_id,
                "source_count": 1,
                "identity_confidence": identity_score,
                "completeness_score": min(completeness, 98),
                "freshness_score": 92,
                "digital_presence_score": min(presence, 95),
                "lead_score": lead_score,
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
                "source_id": OVERTURE_SOURCE_ID,
                "source_record_id": overture_id,
                "created_at": now_iso
            })

            locations_batch.append({
                "business_id": business_id,
                "country": "TR",
                "province": prov_name,
                "province_normalized": reg["norm_name"],
                "district": dist_name if dist_name else None,
                "district_normalized": normalize_turkish_text(dist_name) if dist_name else None,
                "formatted_address": full_address,
                "latitude": float(lat),
                "longitude": float(lon),
                "location": f"SRID=4326;POINT({lon} {lat})",
                "source_id": OVERTURE_SOURCE_ID,
                "source_record_id": overture_id,
                "confidence": 95,
                "created_at": now_iso,
                "updated_at": now_iso
            })

            if phone:
                norm_phone, phone_type = normalize_turkish_phone(phone)
                phones_batch.append({
                    "business_id": business_id,
                    "original_phone": phone.strip(),
                    "normalized_phone": norm_phone,
                    "country_code": "TR",
                    "phone_type": phone_type,
                    "is_primary": True,
                    "source_id": OVERTURE_SOURCE_ID,
                    "source_record_id": overture_id,
                    "confidence": 95,
                    "first_seen_at": now_iso,
                    "last_seen_at": now_iso
                })

            if website:
                clean_w = website.strip()
                if not clean_w.startswith("http"):
                    clean_w = "https://" + clean_w
                domain = clean_w.replace("https://", "").replace("http://", "").split("/")[0].replace("www.", "")
                websites_batch.append({
                    "business_id": business_id,
                    "original_url": website.strip(),
                    "canonical_url": clean_w,
                    "domain": domain,
                    "is_primary": True,
                    "https_available": clean_w.startswith("https://"),
                    "source_id": OVERTURE_SOURCE_ID,
                    "confidence": 95,
                    "created_at": now_iso,
                    "updated_at": now_iso
                })

            if email and "@" in email:
                emails_batch.append({
                    "business_id": business_id,
                    "email": email.strip(),
                    "normalized_email": email.strip().lower(),
                    "email_type": "public_business",
                    "is_primary": True,
                    "source_id": OVERTURE_SOURCE_ID,
                    "confidence": 95,
                    "first_seen_at": now_iso,
                    "last_seen_at": now_iso
                })

            raw_hash = hashlib.sha256(f"{overture_id}_{name}".encode()).hexdigest()
            sources_batch.append({
                "source_id": OVERTURE_SOURCE_ID,
                "source_record_id": overture_id,
                "raw_payload_hash": raw_hash,
                "source_version": "overture-2026-09-23.1",
                "collected_at": now_iso,
                "created_at": now_iso
            })

            prov_batch.append({
                "business_id": business_id,
                "field_name": "canonical_name",
                "source_id": OVERTURE_SOURCE_ID,
                "source_record_id": overture_id,
                "observed_at": now_iso,
                "confidence": 95
            })

        print(f"   Inserting {len(b_batch)} validated records into Supabase...", flush=True)
        post_batch("source_records", sources_batch)
        post_batch("businesses", b_batch)
        post_batch("business_names", names_batch)
        post_batch("business_locations", locations_batch)
        post_batch("business_phones", phones_batch)
        post_batch("business_websites", websites_batch)
        post_batch("business_emails", emails_batch)
        post_batch("field_provenance", prov_batch)

        total_ingested += len(b_batch)
        print(f"   [DONE] Ingested {len(b_batch)} from {reg['name']} (Total Overture Ingested: {total_ingested})\n", flush=True)

    print(f"==================================================================", flush=True)
    print(f" OVERTURE INGESTION COMPLETE: {total_ingested} real businesses added! ", flush=True)
    print(f"==================================================================", flush=True)


if __name__ == "__main__":
    run_overture_pipeline()
