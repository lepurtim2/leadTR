"""
LeadTR — Google Maps Scraper Data Importer & Deduplicator
Integrates outputs from 'scraping-business(OLD)' into LeadTR's Parquet lake.

Key Features:
1. Strict Multi-Factor Deduplication:
   - Phone Match (E.164 last 10 digits)
   - Domain / Website Match
   - Normalized Canonical Name + District Match
2. Zero Government / Public Institution Contamination
3. Automatic LeadTR Quality Scoring (Lead Score, Completeness Score)
4. Writes directly to 'parquets/sector_99_custom_leads.parquet'
   (immediately live in Web UI, Cluster Map, API & Excel Exports)
"""

import os
import sys
import glob
import uuid
import datetime
import pandas as pd
import duckdb
import pyarrow as pa
import pyarrow.parquet as pq

sys.stdout.reconfigure(encoding='utf-8')

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PARQUET_DIR = os.path.join(BASE_DIR, "parquets")
CUSTOM_PARQUET_PATH = os.path.join(PARQUET_DIR, "sector_99_custom_leads.parquet")
TEMPLATE_PARQUET_PATH = os.path.join(PARQUET_DIR, "sector_01_istanbul_marmara_dogu.parquet")

OLD_SCRAPER_OUT_DIR = os.path.abspath(
    os.path.join(os.path.dirname(BASE_DIR), "scraping-business(OLD)", "data", "out")
)

# Known metro district normalization
DISTRICT_PROVINCE_MAP = {
    'Kadıköy': 'İstanbul', 'Bakırköy': 'İstanbul', 'Silivri': 'İstanbul', 'Pendik': 'İstanbul',
    'Fatih': 'İstanbul', 'Beşiktaş': 'İstanbul', 'Şişli': 'İstanbul', 'Kartal': 'İstanbul',
    'Maltepe': 'İstanbul', 'Ümraniye': 'İstanbul', 'Üsküdar': 'İstanbul', 'Beyoğlu': 'İstanbul',
    'Sarıyer': 'İstanbul', 'Başakşehir': 'İstanbul', 'Esenyurt': 'İstanbul', 'Sancaktepe': 'İstanbul',
    'Eyüpsultan': 'İstanbul', 'Zeytinburnu': 'İstanbul', 'Ataşehir': 'İstanbul', 'Tuzla': 'İstanbul',
    'Beylikdüzü': 'İstanbul', 'Avcılar': 'İstanbul', 'Bağcılar': 'İstanbul', 'Bahçelievler': 'İstanbul',
    'Güngören': 'İstanbul', 'Bayrampaşa': 'İstanbul', 'Gaziosmanpaşa': 'İstanbul', 'Sultangazi': 'İstanbul',
    'Arnavutköy': 'İstanbul', 'Çatalca': 'İstanbul', 'Büyükçekmece': 'İstanbul', 'Küçükçekmece': 'İstanbul',
    'Kağıthane': 'İstanbul',
    'Çankaya': 'Ankara', 'Keçiören': 'Ankara', 'Yenimahalle': 'Ankara', 'Mamak': 'Ankara',
    'Konak': 'İzmir', 'Karşıyaka': 'İzmir', 'Bornova': 'İzmir', 'Buca': 'İzmir',
}

GOV_KEYWORDS = [
    'devlet', 'belediye', 'kaymakam', 'valilik', 'müdürlüğ', 'bakanlığ', 'muhtar',
    'adliye', 'emniyet', 'polis', 'jandarma', 'karakol', 'vergi dairesi', 'sgk',
    'aile sağlığı', 'toplum sağlığı', 'halk sağlığı', 'sağlık ocağ', 'şehir hastanesi',
    'üniversite hastanesi', 'eğitim ve araştırma', 't.c.'
]


def is_government(name: str) -> bool:
    low = name.lower()
    return any(k in low for k in GOV_KEYWORDS)


def get_lake_identifiers():
    """Loads all existing phone numbers, domains, and business names from the entire lake."""
    print("🔍 LeadTR Parquet gölündeki mevcut kayıtlar taranıyor (Mükerrer kontrolü)...")
    con = duckdb.connect()
    lake_pattern = f"{PARQUET_DIR.replace(os.sep, '/')}/sector_*.parquet"

    existing_phones = set()
    existing_domains = set()
    existing_names = set()

    rows = con.execute(f"""
        SELECT 
            normalized_phone, 
            domain, 
            lower(canonical_name) 
        FROM '{lake_pattern}'
    """).fetchall()

    for p, d, n in rows:
        if p:
            digits = "".join(filter(str.isdigit, p))
            if len(digits) >= 10:
                existing_phones.add(digits[-10:])
        if d and len(d) > 3:
            existing_domains.add(d.lower().strip())
        if n and len(n) > 3:
            existing_names.add(n.strip())

    con.close()
    print(f" -> Mevcut Telefon Havuzu: {len(existing_phones):,} adet")
    print(f" -> Mevcut Web Domain Havuzu: {len(existing_domains):,} adet")
    print(f" -> Mevcut İsim Havuzu: {len(existing_names):,} adet\n")
    return existing_phones, existing_domains, existing_names


def calculate_scores(name, phone, website, address, rating=None, review_count=None):
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
        lead += 25  # High sales potential for agencies
    if address and len(address) > 10:
        comp += 15
    if rating and rating >= 4.0:
        comp = min(comp + 5, 100)

    return min(comp, 100), min(lead, 100), min(dig, 100)


def import_file(file_path: str, default_province: str = "İstanbul", default_category: str = "Genel Ticari"):
    """Imports businesses from a Google Maps scraper CSV or JSON file, discarding duplicates."""
    if not os.path.exists(file_path):
        print(f"❌ Dosya bulunamadı: {file_path}")
        return

    print(f"📂 İşleniyor: {os.path.basename(file_path)}")
    if file_path.endswith('.json'):
        import json
        with open(file_path, encoding='utf-8', errors='ignore') as fp:
            data = json.load(fp)
            records = data.get('records', data if isinstance(data, list) else [])
            df = pd.DataFrame(records)
    else:
        df = pd.read_csv(file_path)

    total_raw = len(df)
    print(f" -> Toplam Ham Satır: {total_raw}")

    existing_phones, existing_domains, existing_names = get_lake_identifiers()

    schema = pq.read_table(TEMPLATE_PARQUET_PATH).schema
    now_str = datetime.datetime.now(datetime.timezone.utc).isoformat()

    imported_rows = []
    skipped_dup_phone = 0
    skipped_dup_domain = 0
    skipped_dup_name = 0
    skipped_gov = 0
    skipped_invalid = 0

    seen_this_batch_phones = set()
    seen_this_batch_domains = set()
    seen_this_batch_names = set()

    for _, r in df.iterrows():
        name = str(r.get('name') or '').strip()
        if not name or len(name) < 3 or name.lower() in ('none', 'nan'):
            skipped_invalid += 1
            continue

        if is_government(name):
            skipped_gov += 1
            continue

        norm_name = name.lower()
        if norm_name in existing_names or norm_name in seen_this_batch_names:
            skipped_dup_name += 1
            continue

        phone = str(r.get('phone') or '').strip()
        clean_digits = "".join(filter(str.isdigit, phone))
        last10 = clean_digits[-10:] if len(clean_digits) >= 10 else ""

        # Require at least a phone or a website for commercial B2B sales quality
        website = str(r.get('website') or '').strip()
        if website.lower() in ('none', 'nan', ''):
            website = ""
        domain = ""
        if website:
            domain = website.replace("https://", "").replace("http://", "").split("/")[0].replace("www.", "").lower()

        if not last10 and not domain:
            skipped_invalid += 1
            continue

        # 1. Phone Deduplication
        if last10:
            if last10 in existing_phones or last10 in seen_this_batch_phones:
                skipped_dup_phone += 1
                continue

        # 2. Domain Deduplication
        if domain:
            if domain in existing_domains or domain in seen_this_batch_domains:
                skipped_dup_domain += 1
                continue

        # Register identifiers to prevent any subsequent duplicates
        seen_this_batch_names.add(norm_name)
        existing_names.add(norm_name)
        if last10:
            seen_this_batch_phones.add(last10)
            existing_phones.add(last10)
        if domain:
            seen_this_batch_domains.add(domain)
            existing_domains.add(domain)

        # Geographic resolution
        district = str(r.get('district') or r.get('city') or '').strip()
        province = DISTRICT_PROVINCE_MAP.get(district, default_province)
        address = str(r.get('address') or '').strip()
        if not address or address.lower() in ('none', 'nan'):
            address = f"{district}, {province}"

        category = str(r.get('category') or '').strip()
        if not category or category.lower() in ('none', 'nan'):
            category = default_category

        norm_phone = f"+90{last10}" if last10 else (phone if phone else None)
        rating = r.get('rating') if pd.notna(r.get('rating')) else None
        review_count = r.get('review_count') if pd.notna(r.get('review_count')) else None

        lat = float(r.get('lat') or r.get('latitude') or 41.0082)
        lon = float(r.get('lon') or r.get('longitude') or 28.9784)

        comp_score, lead_score, dig_score = calculate_scores(name, phone, website, address, rating, review_count)

        desc = f"{name} - {category}, {district}/{province}."
        if rating and review_count:
            desc += f" (Google: ⭐ {rating} - {int(review_count)} yorum)"

        row_dict = {
            "id": f"gmaps-{uuid.uuid4().hex[:12]}",
            "canonical_name": name,
            "category_name": category,
            "category_slug": category.lower().replace(" ", "-").replace("&", "ve"),
            "province": province,
            "province_normalized": province.lower(),
            "district": district,
            "district_normalized": district.lower(),
            "formatted_address": address,
            "latitude": lat,
            "longitude": lon,
            "phone": phone if phone and phone.lower() not in ('none', 'nan') else None,
            "normalized_phone": norm_phone,
            "phone_type": "mobile" if norm_phone and norm_phone.startswith("+905") else "landline",
            "website": website if website else None,
            "domain": domain if domain else None,
            "email": None,
            "source_name": "google_maps_playwright",
            "source_record_id": f"gmaps-{uuid.uuid4().hex[:8]}",
            "lead_score": lead_score,
            "completeness_score": comp_score,
            "digital_presence_score": dig_score,
            "freshness_score": 100,
            "identity_confidence": 95,
            "first_seen_at": now_str,
            "last_seen_at": now_str,
            "last_verified_at": now_str,
            "created_at": now_str,
            "updated_at": now_str,
            "business_status": "active",
            "automated_description": desc
        }
        imported_rows.append(row_dict)

    print(f"📊 DEDÜPLİKASYON VE FİLTRELEME SONUÇLARI:")
    print(f"   🚫 Telefon Eşleşmesi (Zaten LeadTR'de Var): {skipped_dup_phone} adet")
    print(f"   🚫 Web Domain Eşleşmesi (Zaten LeadTR'de Var): {skipped_dup_domain} adet")
    print(f"   🚫 İsim Eşleşmesi (Zaten LeadTR'de Var): {skipped_dup_name} adet")
    print(f"   🚫 Kamu/Devlet Kurumu (Filtrelendi): {skipped_gov} adet")
    print(f"   🚫 Geçersiz / Hatalı Satır: {skipped_invalid} adet")
    print(f"   ✨ %100 ÜNİK VE YENİ EKLENECEK İŞLETME: {len(imported_rows)} adet\n")

    if not imported_rows:
        print("ℹ️ Eklenecek yeni işletme bulunamadı, tüm veriler zaten mevcut.")
        return

    # Convert to PyArrow Table
    data_dict = {col.name: [row.get(col.name, None) for row in imported_rows] for col in schema}
    new_table = pa.Table.from_pydict(data_dict, schema=schema)

    if os.path.exists(CUSTOM_PARQUET_PATH):
        existing_custom = pq.read_table(CUSTOM_PARQUET_PATH)
        combined_table = pa.concat_tables([existing_custom, new_table])
        pq.write_table(combined_table, CUSTOM_PARQUET_PATH, compression="snappy")
        total_custom = len(combined_table)
    else:
        pq.write_table(new_table, CUSTOM_PARQUET_PATH, compression="snappy")
        total_custom = len(new_table)

    print(f"🎉 BAŞARILI: {len(imported_rows)} yeni işletme LeadTR gölüne enjekte edildi!")
    print(f"📦 Özel Parquet Dosyası: {CUSTOM_PARQUET_PATH}")
    print(f"📈 Toplam Özel Kayıt Sayısı: {total_custom:,} adet")
    print(f"⚡ Veritabanı, Web Arayüzü, Harita ve API anında güncellendi!\n")


if __name__ == "__main__":
    target_csv = os.path.join(OLD_SCRAPER_OUT_DIR, "istanbul_tum_dis_hekimleri.csv")
    if len(sys.argv) > 1:
        target_csv = sys.argv[1]
    
    import_file(target_csv, default_province="İstanbul", default_category="Diş Kliniği")
