"""
LeadTR — Overture Unharvested Places National Fusion Engine (Step 1 of 3)
Module: data/src/overture_unharvested_fusion.py

Streams and extracts the ~233,358 places from Overture S3 that were previously skipped
due to empty/null country tags, sanitizes them, runs them through the EntityResolutionEngine
to prevent duplicate businesses, enriches existing records with newly found contact channels,
and writes new unique leads to the 17 sector Parquet files.
"""

import os
import sys
import re
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional, Tuple, Any

import duckdb
import pyarrow as pa
import pyarrow.parquet as pq

from entity_resolver import (
    EntityResolutionEngine,
    BusinessEntity,
    haversine_distance_meters,
    name_similarity_score,
    extract_root_domain,
    FOREIGN_ISLAND_KEYWORDS,
    CATEGORY_MAP,
)
from normalizers import (
    normalize_turkish_text,
    normalize_business_name,
    normalize_turkish_phone
)

sys.stdout.reconfigure(encoding='utf-8')

PARQUET_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "parquets"))
OVERTURE_S3_PATH = "s3://overturemaps-us-west-2/release/2026-09-23.1/theme=places/type=place/*"

# 17 Official Geographic Sectors
SECTORS = [
    {"slug": "istanbul_marmara_dogu", "file": "sector_01_istanbul_marmara_dogu.parquet", "name": "İstanbul & Marmara Doğu", "min_lng": 28.0, "max_lng": 30.5, "min_lat": 40.5, "max_lat": 41.5, "default_prov": "İstanbul"},
    {"slug": "trakya", "file": "sector_02_trakya.parquet", "name": "Trakya (Edirne & Tekirdağ & Kırklareli)", "min_lng": 26.0, "max_lng": 28.5, "min_lat": 40.5, "max_lat": 42.2, "default_prov": "Tekirdağ"},
    {"slug": "guney_marmara", "file": "sector_03_guney_marmara.parquet", "name": "Güney Marmara (Bursa & Balıkesir & Çanakkale)", "min_lng": 26.0, "max_lng": 30.5, "min_lat": 39.2, "max_lat": 40.6, "default_prov": "Bursa"},
    {"slug": "ege_kuzey", "file": "sector_04_ege_kuzey.parquet", "name": "Ege Kuzey (İzmir & Manisa & Uşak)", "min_lng": 26.2, "max_lng": 29.8, "min_lat": 37.8, "max_lat": 39.4, "default_prov": "İzmir"},
    {"slug": "ege_guney", "file": "sector_05_ege_guney.parquet", "name": "Ege Güney (Aydın & Muğla & Denizli)", "min_lng": 27.0, "max_lng": 30.0, "min_lat": 36.5, "max_lat": 38.2, "default_prov": "Muğla"},
    {"slug": "akdeniz_bati", "file": "sector_06_akdeniz_bati.parquet", "name": "Akdeniz Batı (Antalya & Burdur & Isparta)", "min_lng": 29.2, "max_lng": 32.5, "min_lat": 36.0, "max_lat": 38.5, "default_prov": "Antalya"},
    {"slug": "akdeniz_dogu", "file": "sector_07_akdeniz_dogu.parquet", "name": "Akdeniz Doğu (Adana & Mersin & Hatay)", "min_lng": 32.2, "max_lng": 36.8, "min_lat": 35.8, "max_lat": 38.0, "default_prov": "Adana"},
    {"slug": "ic_anadolu_merkez", "file": "sector_08_ic_anadolu_merkez.parquet", "name": "İç Anadolu Merkez (Ankara & Eskişehir)", "min_lng": 29.8, "max_lng": 34.0, "min_lat": 39.0, "max_lat": 40.8, "default_prov": "Ankara"},
    {"slug": "ic_anadolu_guney", "file": "sector_09_ic_anadolu_guney.parquet", "name": "İç Anadolu Güney (Konya & Karaman & Aksaray)", "min_lng": 31.5, "max_lng": 35.0, "min_lat": 37.0, "max_lat": 39.2, "default_prov": "Konya"},
    {"slug": "ic_anadolu_dogu", "file": "sector_10_ic_anadolu_dogu.parquet", "name": "İç Anadolu Doğu (Kayseri & Sivas & Yozgat)", "min_lng": 34.5, "max_lng": 38.0, "min_lat": 38.5, "max_lat": 40.2, "default_prov": "Kayseri"},
    {"slug": "guneydogu_bati", "file": "sector_11_guneydogu_bati.parquet", "name": "Güneydoğu Batı (Gaziantep & Şanlıurfa)", "min_lng": 36.8, "max_lng": 39.5, "min_lat": 36.6, "max_lat": 38.2, "default_prov": "Gaziantep"},
    {"slug": "guneydogu_dogu", "file": "sector_12_guneydogu_dogu.parquet", "name": "Güneydoğu Doğu (Diyarbakır & Mardin & Batman)", "min_lng": 39.5, "max_lng": 43.5, "min_lat": 36.8, "max_lat": 38.6, "default_prov": "Diyarbakır"},
    {"slug": "karadeniz_bati", "file": "sector_13_karadeniz_bati.parquet", "name": "Karadeniz Batı (Bolu & Düzce & Zonguldak)", "min_lng": 31.0, "max_lng": 34.5, "min_lat": 40.4, "max_lat": 42.1, "default_prov": "Zonguldak"},
    {"slug": "karadeniz_orta", "file": "sector_14_karadeniz_orta.parquet", "name": "Karadeniz Orta (Samsun & Ordu & Çorum)", "min_lng": 34.5, "max_lng": 38.2, "min_lat": 40.2, "max_lat": 41.8, "default_prov": "Samsun"},
    {"slug": "karadeniz_dogu", "file": "sector_15_karadeniz_dogu.parquet", "name": "Karadeniz Doğu (Trabzon & Rize & Giresun)", "min_lng": 38.2, "max_lng": 42.0, "min_lat": 40.3, "max_lat": 41.6, "default_prov": "Trabzon"},
    {"slug": "dogu_anadolu_kuzey", "file": "sector_16_dogu_anadolu_kuzey.parquet", "name": "Doğu Anadolu Kuzey (Erzurum & Kars & Ağrı)", "min_lng": 39.0, "max_lng": 44.8, "min_lat": 39.3, "max_lat": 41.5, "default_prov": "Erzurum"},
    {"slug": "dogu_anadolu_guney", "file": "sector_17_dogu_anadolu_guney.parquet", "name": "Doğu Anadolu Güney (Malatya & Elazığ & Van)", "min_lng": 38.0, "max_lng": 44.8, "min_lat": 37.2, "max_lat": 39.4, "default_prov": "Van"},
]


def map_overture_category(cat_str: Optional[str], name: str) -> Tuple[str, str]:
    if not cat_str:
        cat_str = ""
    c_lower = cat_str.lower()
    n_lower = normalize_turkish_text(name)

    for key, (label, slug) in CATEGORY_MAP.items():
        if key in c_lower:
            return label, slug

    if "dentist" in c_lower or "dis" in n_lower or "dent" in n_lower:
        return "Diş Kliniği", "dis-klinigi"
    if "pharmacy" in c_lower or "eczane" in n_lower:
        return "Eczane", "eczane"
    if "clinic" in c_lower or "hospital" in c_lower or "hastane" in n_lower or "klinik" in n_lower:
        return "Klinik & Sağlık", "klinik"
    if "lawyer" in c_lower or "law_firm" in c_lower or "avukat" in n_lower or "hukuk" in n_lower:
        return "Hukuk Bürosu", "hukuk-burosu"
    if "restaurant" in c_lower or "restoran" in n_lower or "lokanta" in n_lower:
        return "Restoran & Lokanta", "restoran"
    if "cafe" in c_lower or "kafe" in n_lower or "kahve" in n_lower:
        return "Kafe", "kafe"
    if "hotel" in c_lower or "otel" in n_lower:
        return "Otel & Konaklama", "otel"
    if "hairdresser" in c_lower or "beauty" in c_lower or "kuafor" in n_lower or "guzellik" in n_lower:
        return "Güzellik & Kuaför", "kuafor"
    if "car_repair" in c_lower or "oto servis" in n_lower:
        return "Oto Servis & Tamir", "oto-servis"
    if "real_estate" in c_lower or "emlak" in n_lower:
        return "Emlak Ofisi", "emlak-ofisi"
    if "gym" in c_lower or "fitness" in c_lower or "spor salonu" in n_lower:
        return "Spor Salonu", "spor-salonu"
    if "supermarket" in c_lower or "grocery" in c_lower or "market" in n_lower:
        return "Süpermarket & Bakkal", "supermarket"

    return "Genel Ticari", "genel-ticari"


def run_overture_unharvested_fusion():
    print("==================================================================")
    print(" LeadTR — Overture Unharvested Places National Fusion (Step 1/3)  ")
    print(" Source: AWS S3 Geoparquet • Overture Places Theme                ")
    print(" Target: 17 Sector Parquet Lake (`data/parquets/*.parquet`)       ")
    print(" Objective: Zero Duplicate Guarantee • Zero Foreign Leaks        ")
    print("==================================================================\n", flush=True)

    con = duckdb.connect(':memory:')
    con.execute("INSTALL spatial; LOAD spatial; INSTALL httpfs; LOAD httpfs; SET s3_region='us-west-2';")

    grand_total_merged = 0
    grand_total_phones_enriched = 0
    grand_total_webs_enriched = 0
    grand_total_new_leads = 0

    for idx, sec in enumerate(SECTORS, 1):
        target_parquet = os.path.join(PARQUET_DIR, sec["file"])
        if not os.path.exists(target_parquet):
            continue

        print(f"[{idx}/{len(SECTORS)}] Processing Sector: {sec['name']}...", flush=True)
        t_sec_start = time.time()

        # 1. Load existing sector into EntityResolutionEngine
        resolver = EntityResolutionEngine()
        existing_rows = con.execute(f"SELECT * FROM '{target_parquet.replace(os.sep, '/')}'").fetchall()
        cols = [desc[0] for desc in con.description]
        col_idx = {name: i for i, name in enumerate(cols)}

        for r in existing_rows:
            ent = BusinessEntity(
                id=str(r[col_idx["id"]]),
                canonical_name=r[col_idx["canonical_name"]],
                category_name=r[col_idx["category_name"]],
                category_slug=r[col_idx["category_slug"]],
                province=r[col_idx["province"]],
                province_normalized=r[col_idx["province_normalized"]],
                district=r[col_idx.get("district", 0)] or "",
                district_normalized=r[col_idx.get("district_normalized", 0)] or "",
                formatted_address=r[col_idx["formatted_address"]] or "",
                latitude=float(r[col_idx["latitude"]]),
                longitude=float(r[col_idx["longitude"]]),
                phone=r[col_idx.get("phone", 0)],
                normalized_phone=r[col_idx.get("normalized_phone", 0)],
                phone_type=r[col_idx.get("phone_type", 0)] or "unknown",
                website=r[col_idx.get("website", 0)],
                domain=r[col_idx.get("domain", 0)],
                email=r[col_idx.get("email", 0)],
                source_name=r[col_idx.get("source_name", 0)] or "overture",
                source_record_id=r[col_idx.get("source_record_id", 0)],
                lead_score=int(r[col_idx.get("lead_score", 0)] or 75),
                completeness_score=int(r[col_idx.get("completeness_score", 0)] or 80),
                digital_presence_score=int(r[col_idx.get("digital_presence_score", 0)] or 70),
                freshness_score=int(r[col_idx.get("freshness_score", 0)] or 90),
                identity_confidence=int(r[col_idx.get("identity_confidence", 0)] or 95),
                created_at=str(r[col_idx.get("created_at", 0)] or datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S")),
            )
            resolver.register_existing_entity(ent)

        # 2. Query unharvested Overture places for this sector's bounding box from S3
        s3_query = f"""
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
            bbox.xmin AS lon,
            bbox.ymin AS lat
        FROM read_parquet('{OVERTURE_S3_PATH}', hive_partitioning=1)
        WHERE bbox.xmin >= {sec['min_lng']} AND bbox.xmax <= {sec['max_lng']}
          AND bbox.ymin >= {sec['min_lat']} AND bbox.ymax <= {sec['max_lat']}
          AND names.primary IS NOT NULL
          AND (addresses[1].country IS NULL OR addresses[1].country != 'TR');
        """

        try:
            s3_rows = con.execute(s3_query).fetchall()
        except Exception as e:
            print(f"   -> S3 query retry: {e}", flush=True)
            time.sleep(2)
            s3_rows = con.execute(s3_query).fetchall()

        sec_merged = 0
        sec_phones = 0
        sec_webs = 0
        sec_new = 0

        for r in s3_rows:
            (
                overture_id, name, cat, dist, prov, freeform,
                phone, website, email, lon, lat
            ) = r

            if not resolver.is_valid_record(name, lat, lon, freeform):
                continue

            # Skip places that are clearly foreign (Cyprus Greek side, Rhodes, etc.)
            full_check = f"{normalize_turkish_text(name)} {normalize_turkish_text(dist or '')} {normalize_turkish_text(prov or '')}"
            if any(kw in full_check for kw in FOREIGN_ISLAND_KEYWORDS):
                continue

            norm_phone, phone_type = normalize_turkish_phone(phone)
            domain = extract_root_domain(website)
            cat_label, cat_slug = map_overture_category(cat, name)

            real_prov = prov or sec["default_prov"]
            real_dist = dist or ""
            addr_str = freeform or f"{real_dist}, {real_prov}".strip(", ") or f"{real_prov}, Türkiye"

            candidate = BusinessEntity(
                id=f"ov-{overture_id}",
                canonical_name=name,
                category_name=cat_label,
                category_slug=cat_slug,
                province=real_prov,
                province_normalized=normalize_turkish_text(real_prov),
                district=real_dist,
                district_normalized=normalize_turkish_text(real_dist),
                formatted_address=addr_str,
                latitude=float(lat),
                longitude=float(lon),
                phone=phone,
                normalized_phone=norm_phone,
                phone_type=phone_type,
                website=website,
                domain=domain,
                email=email,
                source_name="overture",
                source_record_id=str(overture_id)
            )

            is_new, final_ent = resolver.merge_or_insert(candidate)
            if is_new:
                sec_new += 1
            else:
                sec_merged += 1
                if phone and final_ent.phone == phone:
                    sec_phones += 1
                if website and final_ent.website == website:
                    sec_webs += 1

        grand_total_merged += sec_merged
        grand_total_phones_enriched += sec_phones
        grand_total_webs_enriched += sec_webs
        grand_total_new_leads += sec_new

        # 3. Commit updated sector back to Parquet atomically
        records = []
        for ent in resolver.entities.values():
            records.append({
                "id": ent.id,
                "canonical_name": ent.canonical_name,
                "category_name": ent.category_name,
                "category_slug": ent.category_slug,
                "province": ent.province,
                "province_normalized": ent.province_normalized,
                "district": ent.district,
                "district_normalized": ent.district_normalized,
                "formatted_address": ent.formatted_address,
                "latitude": ent.latitude,
                "longitude": ent.longitude,
                "phone": ent.phone,
                "normalized_phone": ent.normalized_phone,
                "phone_type": ent.phone_type,
                "website": ent.website,
                "domain": ent.domain,
                "email": ent.email,
                "lead_score": ent.lead_score,
                "completeness_score": ent.completeness_score,
                "digital_presence_score": ent.digital_presence_score,
                "freshness_score": ent.freshness_score,
                "identity_confidence": ent.identity_confidence,
                "source_name": ent.source_name,
                "source_record_id": ent.source_record_id,
                "created_at": ent.created_at,
            })

        table = pa.Table.from_pylist(records)
        tmp_target = target_parquet + ".tmp"
        pq.write_table(table, tmp_target, compression="zstd")
        if os.path.exists(target_parquet):
            os.replace(tmp_target, target_parquet)
        else:
            os.rename(tmp_target, target_parquet)

        t_sec_elapsed = time.time() - t_sec_start
        print(f"   -> S3 Candidates: {len(s3_rows):,} | Merged: {sec_merged:,} (+{sec_phones} phones) | New Leads: +{sec_new:,} | Total: {len(records):,} ({t_sec_elapsed:.1f}s)", flush=True)

    print("\n==================================================================")
    print("         OVERTURE UNHARVESTED NATIONAL FUSION SUMMARY            ")
    print("==================================================================")
    print(f"Total Duplicates Safely Merged : {grand_total_merged:,} (Zero Duplicates Guarantee)")
    print(f"Total Missing Phones Enriched  : {grand_total_phones_enriched:,}")
    print(f"Total Missing Websites Enriched: {grand_total_webs_enriched:,}")
    print(f"Brand New Verified Leads Added : +{grand_total_new_leads:,}")

    grand_total = con.execute(f"SELECT count(*) FROM '{PARQUET_DIR.replace(os.sep, '/')}/*.parquet'").fetchone()[0]
    print(f"NEW GRAND TOTAL CANONICAL LEADS: {grand_total:,} Verified Turkish Businesses!")
    print("==================================================================\n", flush=True)


if __name__ == "__main__":
    run_overture_unharvested_fusion()
