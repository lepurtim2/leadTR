"""
LeadTR — Custom Lead Ingestion Tool
Allows adding single or bulk custom businesses (e.g. newly discovered Google Maps listings)
directly into the DuckDB Parquet lake (sector_99_custom_leads.parquet).

Once added, the lead is immediately queryable across:
- Web Search & Table UI
- Cluster Map
- API Endpoints
- Excel / CSV Exports
- Background Continuous Social Enricher
"""

import os
import sys
import uuid
import datetime
import argparse
import duckdb
import pyarrow as pa
import pyarrow.parquet as pq

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARQUET_DIR = os.path.join(BASE_DIR, "parquets")
CUSTOM_PARQUET_PATH = os.path.join(PARQUET_DIR, "sector_99_custom_leads.parquet")
TEMPLATE_PARQUET_PATH = os.path.join(PARQUET_DIR, "sector_01_istanbul_marmara_dogu.parquet")


def get_schema():
    """Reads schema from sector_01 parquet to maintain 100% schema conformity."""
    template_table = pq.read_table(TEMPLATE_PARQUET_PATH)
    return template_table.schema


def calculate_scores(name, phone, website, address):
    """Calculates LeadTR standard lead and completeness scores."""
    comp = 40
    lead = 50
    dig = 10
    
    if phone and len(phone) >= 10:
        comp += 20
        lead += 20
    if website and len(website) > 4:
        comp += 25
        dig += 50
    else:
        lead += 25  # High sales opportunity for agencies
    if address and len(address) > 10:
        comp += 15
        
    return min(comp, 100), min(lead, 100), min(dig, 100)


def add_custom_lead(
    name: str,
    category: str = "Web Tasarım & Yazılım",
    province: str = "İstanbul",
    district: str = "Kadıköy",
    address: str = "",
    phone: str = "",
    website: str = "",
    email: str = "",
    lat: float = 40.9917,
    lng: float = 29.0270,
    source: str = "custom_lead"
):
    """Inserts a single verified business lead into sector_99_custom_leads.parquet."""
    schema = get_schema()
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()
    clean_digits = "".join(filter(str.isdigit, phone or ""))
    norm_phone = f"+90{clean_digits[-10:]}" if len(clean_digits) >= 10 else phone

    domain = ""
    if website:
        domain = website.replace("https://", "").replace("http://", "").split("/")[0].replace("www.", "")

    comp_score, lead_score, dig_score = calculate_scores(name, phone, website, address)

    new_row = {
        "id": f"leadtr-custom-{uuid.uuid4().hex[:12]}",
        "canonical_name": name.strip(),
        "category_name": category.strip(),
        "category_slug": category.lower().replace(" ", "-").replace("&", "ve"),
        "province": province.strip(),
        "province_normalized": province.strip().lower(),
        "district": district.strip(),
        "district_normalized": district.strip().lower(),
        "formatted_address": address.strip() if address else f"{district}, {province}",
        "latitude": float(lat) if lat else 40.9917,
        "longitude": float(lng) if lng else 29.0270,
        "phone": phone.strip(),
        "normalized_phone": norm_phone,
        "phone_type": "mobile" if norm_phone.startswith("+905") else "landline",
        "website": website.strip() if website else None,
        "domain": domain if domain else None,
        "email": email.strip() if email else None,
        "source_name": source,
        "source_record_id": f"manual-{uuid.uuid4().hex[:8]}",
        "lead_score": lead_score,
        "completeness_score": comp_score,
        "digital_presence_score": dig_score,
        "freshness_score": 100,
        "identity_confidence": 100,
        "first_seen_at": now_str,
        "last_seen_at": now_str,
        "last_verified_at": now_str,
        "created_at": now_str,
        "updated_at": now_str,
        "business_status": "active",
        "automated_description": f"{name} - {category}, {district}/{province}"
    }

    # Convert to PyArrow Table
    data_dict = {col.name: [new_row.get(col.name, None)] for col in schema}
    new_table = pa.Table.from_pydict(data_dict, schema=schema)

    if os.path.exists(CUSTOM_PARQUET_PATH):
        existing_table = pq.read_table(CUSTOM_PARQUET_PATH)
        combined_table = pa.concat_tables([existing_table, new_table])
        pq.write_table(combined_table, CUSTOM_PARQUET_PATH, compression="snappy")
        total_records = len(combined_table)
    else:
        pq.write_table(new_table, CUSTOM_PARQUET_PATH, compression="snappy")
        total_records = 1

    print(f"✅ Başarıyla Eklendi: '{name}'")
    print(f"📍 Konum: {district} / {province} | 📞 Tel: {phone} | 🌐 Web: {website or 'Yok'}")
    print(f"📦 Özel Veri Dosyası: {CUSTOM_PARQUET_PATH} (Toplam Özel Kayıt: {total_records})")
    print(f"⚡ LeadTR DuckDB gölüne ve web arayüzüne anında yansıdı!")
    return new_row


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LeadTR Özel İşletme Ekleme Aracı")
    parser.add_argument("--name", required=True, help="İşletme Unvanı")
    parser.add_argument("--category", default="Web Tasarım & Yazılım", help="Kategori")
    parser.add_argument("--province", default="İstanbul", help="İl")
    parser.add_argument("--district", default="Kadıköy", help="İlçe")
    parser.add_argument("--address", default="", help="Açık Adres")
    parser.add_argument("--phone", default="", help="Telefon Numarası")
    parser.add_argument("--website", default="", help="Web Sitesi")
    parser.add_argument("--email", default="", help="E-Posta")
    parser.add_argument("--lat", type=float, default=40.9917, help="Enlem (Latitude)")
    parser.add_argument("--lng", type=float, default=29.0270, help="Boylam (Longitude)")

    args = parser.parse_args()
    add_custom_lead(
        name=args.name,
        category=args.category,
        province=args.province,
        district=args.district,
        address=args.address,
        phone=args.phone,
        website=args.website,
        email=args.email,
        lat=args.lat,
        lng=args.lng
    )
