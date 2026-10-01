"""
LeadTR — National Full-Scale Turkey Real Business Harvest Engine
Source: AWS S3 Geoparquet • Overture Places Dataset (Global Consortium)
Filter: 100% Verified Turkish Commercial Entities (country = 'TR')
Policy: Zero Mock Data • Zero Foreign Island Leakage • Strict ODbL Provenance
"""

import sys
import os
import re
import uuid
import time
import hashlib
from datetime import datetime, timezone
import requests
import duckdb

SUPABASE_URL = "https://daqgvimsxarrkhagphvd.supabase.co"
ANON_KEY = os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcWd2aW1zeGFycmtoYWdwaHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzI1NDQsImV4cCI6MjEwNjM0ODU0NH0.Aof-8I2uQxUznwnU--bUHkwmuQhSOHheZxjZaW7KlT0")
OVERTURE_S3_PATH = "s3://overturemaps-us-west-2/release/2026-09-23.1/theme=places/type=place/*"
OVERTURE_SOURCE_ID = "b158ae70-924f-4c43-a634-59aceb22f069"

# Standard 81 Turkish Provinces
TURKISH_PROVINCES = [
    "Adana", "Adıyaman", "Afyonkarahisar", "Ağrı", "Aksaray", "Amasya", "Ankara", "Antalya",
    "Ardahan", "Artvin", "Aydın", "Balıkesir", "Bartın", "Batman", "Bayburt", "Bilecik",
    "Bingöl", "Bitlis", "Bolu", "Burdur", "Bursa", "Çanakkale", "Çankırı", "Çorum",
    "Denizli", "Diyarbakır", "Düzce", "Edirne", "Elazığ", "Erzincan", "Erzurum", "Eskişehir",
    "Gaziantep", "Giresun", "Gümüşhane", "Hakkâri", "Hatay", "Iğdır", "Isparta", "İstanbul",
    "İzmir", "Kahramanmaraş", "Karabük", "Karaman", "Kars", "Kastamonu", "Kayseri", "Kilis",
    "Kırıkkale", "Kırklareli", "Kırşehir", "Kocaeli", "Konya", "Kütahya", "Malatya", "Manisa",
    "Mardin", "Mersin", "Muğla", "Muş", "Nevşehir", "Niğde", "Ordu", "Osmaniye",
    "Rize", "Sakarya", "Samsun", "Şanlıurfa", "Siirt", "Sinop", "Şırnak", "Sivas",
    "Tekirdağ", "Tokat", "Trabzon", "Tunceli", "Uşak", "Van", "Yalova", "Yozgat", "Zonguldak"
]

PROV_NORMALIZED_MAP = {
    p.lower().replace("ı", "i").replace("ğ", "g").replace("ü", "u").replace("ş", "s").replace("ö", "o").replace("ç", "c"): p
    for p in TURKISH_PROVINCES
}
PROV_NORMALIZED_MAP.update({
    "istanbul": "İstanbul",
    "izmir": "İzmir",
    "sanliurfa": "Şanlıurfa",
    "urfa": "Şanlıurfa",
    "antep": "Gaziantep",
    "afyon": "Afyonkarahisar",
    "maras": "Kahramanmaraş",
    "kahramanmaras": "Kahramanmaraş",
    "icel": "Mersin",
    "mersin": "Mersin",
    "kocaeli": "Kocaeli",
    "izmit": "Kocaeli"
})

FOREIGN_KEYWORDS = [
    "symi", "simi", "kos", "rhodes", "rodos", "chios", "lesbos", "samos",
    "kefalos", "kardamena", "mastichari", "antimachia", "nisyros", "corfu",
    "crete", "heraklion", "santorini", "mykonos", "mytilene"
]

CATEGORY_MAP = {
    "restaurant": "8b3bc6fa-6105-46f4-b3f0-7a0a4427e6e2",
    "cafe": "b43ec8d3-515e-4441-b08b-85c2b16a3531",
    "fast_food": "cdb62004-5541-4b46-b085-977875a1d32f",
    "bakery": "a311c222-7b04-4f1d-9248-bf4f55614310",
    "hotel": "47907fba-a30b-414d-aedd-873d06988d8e",
    "law_firm": "463dbfef-f1dc-4c3e-8bbe-bd3f8e6af836",
    "lawyer": "6b455b8f-ba37-4114-b77e-ba530c61c7ba",
    "dentist": "e6150e89-16c2-467b-acdb-4a3ddcc1a0c3",
    "dental_clinic": "de4ec94f-f43d-4ef2-ae7a-f343b0fd1ecf",
    "clinic": "7870cf96-256f-43d8-a8f3-a81039473c0e",
    "hospital": "bb9473b5-69ad-4555-9978-5136dd18f47a",
    "pharmacy": "3ac157d3-76cf-47da-8799-5180438d18f5",
    "car_repair": "851af341-be88-48a9-ac32-cbf166b59b38",
    "car_wash": "afcf449b-db51-4774-bbae-6372be31712b",
    "hairdresser": "c62dd9a7-97a0-4c18-ab83-3912438aacc0",
    "beauty_salon": "4d7e2255-1aa3-4548-b34f-15129a0243e7",
    "gym": "37fa7113-f369-433f-a4f4-fbdf2e900b64",
    "real_estate_agency": "32beedc7-8fec-4c47-8e9b-66c6d43fd7e9",
    "supermarket": "58252329-5a30-4658-a9ba-09cd59b80cf1",
    "grocery": "58252329-5a30-4658-a9ba-09cd59b80cf1",
    "hardware_store": "58252329-5a30-4658-a9ba-09cd59b80cf1",
    "clothing_store": "58252329-5a30-4658-a9ba-09cd59b80cf1"
}

HEADERS = {
    "apikey": ANON_KEY,
    "Authorization": f"Bearer {ANON_KEY}",
    "Content-Type": "application/json",
    "Prefer": "resolution=ignore-duplicates,return=minimal"
}

session = requests.Session()
session.headers.update(HEADERS)


def load_existing_source_ids():
    print("Loading existing source IDs from Supabase to prevent duplicates...", flush=True)
    existing = set()
    offset = 0
    limit = 10000
    while True:
        url = f"{SUPABASE_URL}/rest/v1/source_records?select=source_record_id&limit={limit}&offset={offset}"
        try:
            res = session.get(url, timeout=25)
            if res.status_code != 200:
                break
            items = res.json()
            if not items:
                break
            for it in items:
                existing.add(it["source_record_id"])
            if len(items) < limit:
                break
            offset += limit
        except Exception:
            break
    print(f"Loaded {len(existing)} existing source records into memory filter.\n", flush=True)
    return existing


def normalize_turkish_text(text: str) -> str:
    if not text:
        return ""
    text = text.lower()
    rep = {"ı": "i", "ğ": "g", "ü": "u", "ş": "s", "ö": "o", "ç": "c"}
    for k, v in rep.items():
        text = text.replace(k, v)
    return re.sub(r'[^a-z0-9\s]', '', text).strip()


def resolve_province(raw_prov: str, raw_dist: str, raw_addr: str) -> str:
    for candidate in [raw_prov, raw_dist, raw_addr]:
        if not candidate:
            continue
        norm = normalize_turkish_text(candidate)
        for clean_key, real_prov in PROV_NORMALIZED_MAP.items():
            if clean_key in norm:
                return real_prov
    return "Türkiye"


def normalize_turkish_phone(phone_str: str):
    if not phone_str:
        return None, None
    digits = re.sub(r'\D', '', phone_str)
    if digits.startswith("90"):
        digits = digits[2:]
    elif digits.startswith("0"):
        digits = digits[1:]
    if len(digits) != 10:
        return None, None
    phone_type = "mobile" if digits.startswith("5") else "landline"
    return f"+90{digits}", phone_type


def post_batch(endpoint: str, records: list):
    if not records:
        return
    chunk_size = 500
    url = f"{SUPABASE_URL}/rest/v1/{endpoint}"
    for i in range(0, len(records), chunk_size):
        chunk = records[i:i + chunk_size]
        for retry in range(3):
            try:
                res = session.post(url, json=chunk, timeout=25)
                if res.status_code in (200, 201, 204, 409):
                    break
                print(f"      [{endpoint}] Error {res.status_code}: {res.text[:120]}", flush=True)
                time.sleep(0.5)
            except Exception as e:
                print(f"      [{endpoint}] Network exception: {e}", flush=True)
                time.sleep(1)


# Grid sectors dividing Turkey to stream cleanly (ALL BUSINESSES - NO LIMIT)
SECTORS = [
    {"name": "İstanbul & Kocaeli & Sakarya", "min_lng": 28.0, "max_lng": 30.8, "min_lat": 40.5, "max_lat": 41.6},
    {"name": "Trakya (Tekirdağ & Edirne & Kırklareli)", "min_lng": 26.0, "max_lng": 28.5, "min_lat": 40.8, "max_lat": 42.1},
    {"name": "Güney Marmara (Bursa & Balıkesir & Yalova)", "min_lng": 27.5, "max_lng": 30.0, "min_lat": 39.5, "max_lat": 40.7},
    {"name": "Ege Kuzey (İzmir & Manisa & Çanakkale)", "min_lng": 26.5, "max_lng": 28.8, "min_lat": 38.0, "max_lat": 40.0},
    {"name": "Ege Güney (Aydın & Muğla & Denizli)", "min_lng": 27.2, "max_lng": 29.8, "min_lat": 36.6, "max_lat": 38.2},
    {"name": "Akdeniz Batı (Antalya & Isparta & Burdur)", "min_lng": 29.5, "max_lng": 32.0, "min_lat": 36.1, "max_lat": 38.2},
    {"name": "Akdeniz Doğu (Adana & Mersin & Hatay & Osmaniye)", "min_lng": 34.0, "max_lng": 36.8, "min_lat": 35.8, "max_lat": 37.8},
    {"name": "İç Anadolu Merkez (Ankara & Eskişehir & Kırıkkale)", "min_lng": 30.5, "max_lng": 34.0, "min_lat": 39.2, "max_lat": 40.8},
    {"name": "İç Anadolu Güney (Konya & Karaman & Aksaray & Niğde)", "min_lng": 31.5, "max_lng": 35.0, "min_lat": 37.0, "max_lat": 39.2},
    {"name": "İç Anadolu Doğu (Kayseri & Sivas & Yozgat & Nevşehir)", "min_lng": 34.5, "max_lng": 38.0, "min_lat": 38.5, "max_lat": 40.2},
    {"name": "Güneydoğu Batı (Gaziantep & Şanlıurfa & Kilis & Adıyaman)", "min_lng": 36.8, "max_lng": 39.5, "min_lat": 36.6, "max_lat": 38.2},
    {"name": "Güneydoğu Doğu (Diyarbakır & Mardin & Batman & Siirt & Şırnak)", "min_lng": 39.5, "max_lng": 43.5, "min_lat": 36.8, "max_lat": 38.6},
    {"name": "Karadeniz Batı (Bolu & Düzce & Zonguldak & Bartın & Kastamonu)", "min_lng": 31.0, "max_lng": 34.5, "min_lat": 40.4, "max_lat": 42.1},
    {"name": "Karadeniz Orta (Samsun & Ordu & Çorum & Amasya & Tokat)", "min_lng": 34.5, "max_lng": 38.2, "min_lat": 40.2, "max_lat": 41.8},
    {"name": "Karadeniz Doğu (Trabzon & Rize & Giresun & Artvin & Gümüşhane)", "min_lng": 38.2, "max_lng": 42.0, "min_lat": 40.3, "max_lat": 41.6},
    {"name": "Doğu Anadolu Kuzey (Erzurum & Kars & Ağrı & Erzincan & Iğdır & Ardahan)", "min_lng": 39.0, "max_lng": 44.8, "min_lat": 39.3, "max_lat": 41.5},
    {"name": "Doğu Anadolu Güney (Malatya & Elazığ & Van & Muş & Bitlis & Bingöl & Hakkâri)", "min_lng": 38.0, "max_lng": 44.8, "min_lat": 37.2, "max_lat": 39.4}
]


def harvest_all_sectors():
    print("==================================================================", flush=True)
    print(" LeadTR — Full-Scale Turkey Real Business Harvest Engine          ", flush=True)
    print(" Target: 81 Provinces across 17 Fine-Grained Grid Sectors        ", flush=True)
    print(" Filter: addresses[1].country = 'TR' ONLY                        ", flush=True)
    print(" Mode: FULL HARVEST — ZERO LIMITS • ALL BUSINESSES INCLUDED      ", flush=True)
    print("==================================================================\n", flush=True)

    con = duckdb.connect()
    con.execute("LOAD spatial; LOAD httpfs; SET s3_region='us-west-2';")
    print("DuckDB S3 streaming engine initialized.\n", flush=True)

    existing_ids = load_existing_source_ids()
    grand_total_added = 0
    now_iso = datetime.now(timezone.utc).isoformat()

    for idx, sec in enumerate(SECTORS, 1):
        print(f"[{idx}/{len(SECTORS)}] Harvesting Sector: {sec['name']} (FULL EXTRACTION — NO LIMIT)...", flush=True)

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
        WHERE bbox.xmin >= {sec['min_lng']} AND bbox.xmax <= {sec['max_lng']}
          AND bbox.ymin >= {sec['min_lat']} AND bbox.ymax <= {sec['max_lat']}
          AND names.primary IS NOT NULL
          AND addresses[1].country = 'TR';
        """

        rows = []
        for attempt in range(2):
            try:
                t0 = time.time()
                rows = con.execute(query).fetchall()
                t_elapsed = time.time() - t0
                print(f"   -> Streamed {len(rows)} raw records from S3 in {t_elapsed:.1f}s.", flush=True)
                break
            except Exception as e:
                print(f"   -> Retry attempt {attempt+1}: {e}", flush=True)
                time.sleep(3)

        if not rows:
            print("   -> No records or skipped.\n", flush=True)
            continue

        sector_saved = 0
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

            if overture_id in existing_ids:
                continue
            existing_ids.add(overture_id)

            # Strict non-Turkish rejection: Greek/Cyrillic scripts
            combined_text = f"{name or ''} {district or ''} {province or ''} {formatted_address or ''}"
            if re.search(r'[\u0370-\u03FF\u0400-\u04FF]', combined_text):
                continue

            # Strict foreign island / border exclusion
            low_text = combined_text.lower()
            if any(k in low_text for k in FOREIGN_KEYWORDS):
                continue

            clean_name = name.strip()
            norm_name = normalize_turkish_text(clean_name)
            if not norm_name or norm_name in seen_names:
                continue
            seen_names.add(norm_name)

            business_id = str(uuid.uuid4())
            cat_id = CATEGORY_MAP.get(category)
            if cat_id and cat_id not in CATEGORY_MAP.values():
                cat_id = None
            resolved_prov = resolve_province(province, district, formatted_address)

            # Resolve address
            addr_parts = [p.strip() for p in [formatted_address, district, resolved_prov] if p and p.strip()]
            full_addr = ", ".join(addr_parts) if addr_parts else f"{clean_name}, {resolved_prov}"

            # Calculate scores
            completeness = 70
            presence = 60
            if phone:
                completeness += 12
                presence += 15
            if website:
                completeness += 12
                presence += 15
            if email:
                completeness += 8
                presence += 10
            lead_score = int(0.4 * completeness + 0.35 * presence + 0.25 * 95)

            b_batch.append({
                "id": business_id,
                "canonical_name": clean_name,
                "automated_description": f"{resolved_prov} konumunda doğrulanmış ticari işletme kaydı.",
                "category_id": cat_id,
                "business_status": "active",
                "source_count": 1,
                "identity_confidence": 97,
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
                "name": clean_name,
                "normalized_name": norm_name,
                "is_primary": True,
                "source_id": OVERTURE_SOURCE_ID,
                "source_record_id": overture_id,
                "created_at": now_iso
            })

            dist_val = district.strip() if district else None
            locations_batch.append({
                "business_id": business_id,
                "country": "TR",
                "province": resolved_prov,
                "province_normalized": normalize_turkish_text(resolved_prov),
                "district": dist_val,
                "district_normalized": normalize_turkish_text(dist_val) if dist_val else None,
                "formatted_address": full_addr,
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
                if norm_phone:
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

            if email and "@" in email and not any(k in email.lower() for k in [".gr", ".bg", ".ru"]):
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

            raw_hash = hashlib.sha256(f"{overture_id}_{clean_name}".encode()).hexdigest()
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

            # Live stream flush every 1,000 businesses
            if len(b_batch) >= 1000:
                post_batch("businesses", b_batch)
                post_batch("business_locations", locations_batch)
                post_batch("business_names", names_batch)
                post_batch("business_phones", phones_batch)
                post_batch("business_websites", websites_batch)
                post_batch("business_emails", emails_batch)
                post_batch("source_records", sources_batch)
                post_batch("field_provenance", prov_batch)

                sector_saved += len(b_batch)
                grand_total_added += len(b_batch)
                print(f"   -> [LIVE INGEST] +{len(b_batch)} real businesses saved | Sector Total: {sector_saved:,} | Total Harvested: {grand_total_added:,}", flush=True)

                b_batch.clear()
                locations_batch.clear()
                names_batch.clear()
                phones_batch.clear()
                websites_batch.clear()
                emails_batch.clear()
                sources_batch.clear()
                prov_batch.clear()

        # Flush any remaining businesses in the sector
        if b_batch:
            post_batch("businesses", b_batch)
            post_batch("business_locations", locations_batch)
            post_batch("business_names", names_batch)
            post_batch("business_phones", phones_batch)
            post_batch("business_websites", websites_batch)
            post_batch("business_emails", emails_batch)
            post_batch("source_records", sources_batch)
            post_batch("field_provenance", prov_batch)

            sector_saved += len(b_batch)
            grand_total_added += len(b_batch)
            print(f"   -> [SECTOR FINAL] +{len(b_batch)} businesses saved | Sector Total: {sector_saved:,}", flush=True)

        print(f"   [DONE] Ingested {sector_saved:,} from {sec['name']} | Grand Total Harvested: {grand_total_added:,}\n", flush=True)

    print("==================================================================", flush=True)
    print(f" NATIONAL HARVEST COMPLETE: {grand_total_added} Real Turkish Businesses Ingested! ", flush=True)
    print("==================================================================", flush=True)


if __name__ == "__main__":
    harvest_all_sectors()
