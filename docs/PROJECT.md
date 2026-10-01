# Türkiye Business Data Platform

> **Proje kod adı:** `LeadTR`
>
> **Amaç:** Türkiye'deki işletmeleri farklı, kullanım hakkı açık veya ayrıca lisanslanmış kaynaklardan toplayan; normalize eden, duplicate kayıtları birleştiren, web verileriyle zenginleştiren, kalite/doğrulama skorları üreten ve B2B müşterilere CSV/XLSX/API/abonelik olarak sunan bir işletme veri platformu.
>
> **Belge tarihi:** 30 Eylül 2026
>
> **Ana hedef:** “Google Maps scraper” yapmak değil; kaynağı ve kullanım hakkı yönetilen, güncel ve filtrelenebilir **Türkiye işletme veri ürünü** oluşturmak.

---

## 1. Proje Özeti

Bu proje, Türkiye'deki işletmeleri sektör, il, ilçe, mahalle ve çeşitli dijital özelliklerine göre sorgulanabilen bir veri tabanına dönüştürür.

Örnek kullanım:

- İstanbul'daki diş kliniklerini bulmak
- Web sitesi olmayan hukuk bürolarını ayırmak
- WhatsApp kullanan güzellik merkezlerini bulmak
- Instagram hesabı bulunan ama online randevusu olmayan klinikleri filtrelemek
- Belirli bir şehirde 4.5+ puan ve yüksek yorum sayısına sahip işletmeleri incelemek
- Bir ajansın satış ekibine hedef işletme listesi hazırlamak
- Bir CRM/SaaS ürününün işletmeleri API üzerinden çekmesini sağlamak

Temel veri akışı:

```text
Veri Kaynakları
      |
      v
Ingestion / Collector
      |
      v
Raw Data Lake
      |
      v
Normalization
      |
      v
Entity Resolution / Deduplication
      |
      v
Enrichment
      |
      v
Verification + Quality Scoring
      |
      +--------------------+
      |                    |
      v                    v
PostgreSQL/PostGIS     Search Index
      |                    |
      +---------+----------+
                |
                v
          REST API / Dashboard
                |
       +--------+---------+
       |        |         |
       v        v         v
      CSV      XLSX      API
                |
                v
        Billing / Credits
```

---

# 2. En önemli stratejik karar

## Google Maps verisini ana veri deposu yapma

Bu projenin başlangıç fikri Google Maps'teki işletmeleri toplamak olsa da ürün mimarisi Google Maps içeriğini kalıcı şekilde kopyalayıp yeniden satmaya bağımlı olmamalıdır.

Google'ın güncel Places API politikasında Places API içeriğinin önceden çekilmesi, cache edilmesi veya saklanması genel olarak kısıtlanır; `place_id` ayrı bir istisnadır. Ayrıca uygulamaların Google Maps Platform şartları ve ilgili atıf/görüntüleme kurallarına uyması gerekir. Bu nedenle Google Places/Maps içeriğini kalıcı, bağımsız bir satış veritabanı olarak tasarlamak yerine yalnızca ürünün şartlara uygun olduğu kullanım senaryolarında kullanmak gerekir.

Resmi kaynak:
- https://developers.google.com/maps/documentation/places/web-service/policies
- https://developers.google.com/maps/terms

Bu projede önerilen ana yaklaşım:

1. Lisansı ve kullanım hakkı net kaynaklardan temel işletme dataset'i oluştur.
2. İşletmelerin herkese açık kurumsal web varlıklarından, kullanım amacına ve kaynağın şartlarına uygun biçimde zenginleştirme yap.
3. Gerekli alanları ayrıca lisanslanan veri sağlayıcılardan satın al.
4. Kaynak başına lisans bilgisini veritabanında sakla.
5. Google verisini ürünün kalıcı veri gövdesine dönüştürmeden, şartlara uygun yardımcı entegrasyon olarak ele al.

---

# 3. Overture Maps neden önemli?

Overture Places veri seti gerçek dünyadaki işletmeler, okullar, hastaneler, servisler ve diğer POI'ler için küresel kapsama sahiptir. Eylül 2026 dokümantasyonuna göre Places teması yaklaşık 81 milyon kayıt ölçeğindedir; veri farklı sağlayıcılardan birleştirilir ve aylık yayınlanır.

Overture Places dokümantasyonu:
- https://docs.overturemaps.org/guides/places/
- https://docs.overturemaps.org/attribution/
- https://docs.overturemaps.org/schema/reference/places/place/

Önemli nokta: Overture Places dokümantasyonu, dataset'in farklı lisanslı kaynaklardan oluştuğunu ve kaynağa göre CDLA Permissive 2.0, Apache 2.0 ve CC0 gibi lisansların bulunduğunu belirtir. Ayrıca Overture, kayıtların duplicate ve eksik alanlar içerebileceğini de açıkça belirtir. Bu nedenle Overture'yi “ham veri geldi, bitti” değil, ilk kaynak ve seed dataset olarak görmek gerekir.

---

# 4. Ürünün değer önerisi

Ham veri:

> “İşletme adı + telefon + adres”

Düşük farklılaşma ve düşük marj.

Asıl ürün:

> “Güncellenmiş, normalize edilmiş, duplicate temizlenmiş, zenginleştirilmiş ve filtrelenebilir işletme intelligence database.”

Bu nedenle her kayıtta mümkün olduğunca şu metrikler oluşturulmalıdır:

```text
source_count
source_confidence
identity_confidence
phone_confidence
website_confidence
email_confidence
location_confidence
last_verified_at
last_seen_at
freshness_score
completeness_score
digital_presence_score
lead_score
```

---

# 5. Hedef müşteri segmentleri

## 5.1 Web ajansları

İhtiyaç:
- Website olmayan işletmeler
- Eski teknoloji kullanan siteler
- SSL problemi bulunan siteler
- Online randevu olmayan işletmeler

## 5.2 SEO ajansları

İhtiyaç:
- Yerel SEO fırsatları
- Zayıf website sinyalleri
- Eksik işletme bilgileri
- Dijital görünürlüğü düşük işletmeler

## 5.3 Reklam ajansları

İhtiyaç:
- Sektör + şehir bazlı hedef işletmeler
- Site sahibi olan ama gelişmiş dönüşüm altyapısı olmayan işletmeler
- Bölgesel satış listeleri

## 5.4 CRM/SaaS şirketleri

API ile işletme keşfi ve müşteri oluşturma.

## 5.5 Pazar araştırma şirketleri

Sektör, coğrafya ve işletme büyüklüğü bazlı dataset.

## 5.6 Satış ekipleri / outbound ekipleri

Filtrelenmiş B2B prospect listeleri.

## 5.7 Franchise ve zincir işletmeler

Rakip ve pazar haritalaması.

---

# 6. Ürün modülleri

```text
1. Data Ingestion
2. Raw Storage
3. Normalization
4. Deduplication / Entity Resolution
5. Website Enrichment
6. Social Discovery
7. Contact Extraction
8. Technology Detection
9. Verification Engine
10. Quality Scoring
11. Search API
12. Customer Dashboard
13. CSV/XLSX Export
14. Credits / Billing
15. Public API
16. Admin Panel
17. Monitoring
18. Audit / Source Licensing
```

---

# 7. Veri modeli

Ana işletme kaydı mümkün olduğunca normalize tutulmalıdır.

## 7.1 `businesses`

```text
id
canonical_name
normalized_name
category_id
subcategory_id
business_status
source_count
confidence_score
completeness_score
freshness_score
digital_presence_score
lead_score
first_seen_at
last_seen_at
last_verified_at
created_at
updated_at
```

## 7.2 `business_locations`

```text
id
business_id
country
province
province_normalized
district
district_normalized
neighborhood
address_full
postal_code
latitude
longitude
geohash
location_source
location_confidence
created_at
updated_at
```

PostGIS kullanılacağı için `latitude/longitude` alanlarının yanında mümkün olduğunca:

```sql
location GEOGRAPHY(POINT, 4326)
```

tutulabilir.

## 7.3 `business_contacts`

```text
id
business_id
contact_type
value
normalized_value
is_primary
is_public
source_id
confidence_score
verified_at
created_at
updated_at
```

`contact_type` örnekleri:

```text
phone
mobile
landline
email
whatsapp
contact_form
```

## 7.4 `business_websites`

```text
id
business_id
url
normalized_domain
is_primary
is_https
http_status
site_title
site_language
cms
technology_stack
has_booking
has_whatsapp
has_contact_form
has_ssl
website_quality_score
last_checked_at
created_at
updated_at
```

## 7.5 `business_socials`

```text
id
business_id
platform
url
username
is_verified
source_id
confidence_score
last_seen_at
created_at
updated_at
```

Platformlar:

```text
instagram
facebook
linkedin
youtube
tiktok
x
```

## 7.6 `business_categories`

```text
id
parent_id
name
slug
external_category_id
created_at
updated_at
```

Örnek:

```text
Sağlık
  -> Diş Hekimi
  -> Diş Kliniği
  -> Ortodonti
  -> Ağız ve Diş Sağlığı

Hukuk
  -> Avukat
  -> Hukuk Bürosu

Otomotiv
  -> Oto Servis
  -> Lastikçi
  -> Oto Ekspertiz
```

---

# 8. Kaynak izleme

Her veri parçasının nereden geldiği bilinmelidir.

## `sources`

```text
id
name
provider
source_type
license_type
license_url
terms_url
attribution_required
allowed_for_storage
allowed_for_redistribution
allowed_for_commercial_use
notes
created_at
updated_at
```

## `business_sources`

```text
id
business_id
source_id
external_id
source_url
first_seen_at
last_seen_at
raw_reference
confidence_score
created_at
updated_at
```

Bu yapı ileride veri kaynaklarını değiştirmeyi çok kolaylaştırır.

---

# 9. Raw data katmanı

Raw veriyi ilk geldiği şekliyle koru.

Önerilen storage:

```text
Cloudflare R2
veya
AWS S3
```

Örnek:

```text
/raw/
  overture/
    2026-09/
      places/
        turkey.parquet

/raw/
  provider-x/
    2026-09-30/
      batch-00001.jsonl

/raw/
  enrichment/
    2026-09-30/
      websites/
        batch-001.jsonl
```

Neden raw layer?

- Hatalı parser düzeltilebilir.
- ETL tekrar çalıştırılabilir.
- Veri kaynağı kanıtlanabilir.
- Eski sürümler karşılaştırılabilir.
- Yeni kolonları geçmiş veriye yeniden uygulayabilirsin.

---

# 10. ETL / veri işleme pipeline'ı

## Aşama 1 — Ingestion

```text
Source
  -> Download / Fetch
  -> Validate
  -> Store Raw
  -> Register Batch
```

## Aşama 2 — Parsing

```text
Raw JSON / CSV / Parquet
  -> parser
  -> canonical object
```

## Aşama 3 — Normalization

Örnek işletme adları:

```text
ABC DİŞ KLİNİĞİ
ABC Diş Kliniği
Abc Dis Klinigi
ABC DIS KLINIGI
```

Normalize edilmiş değer:

```text
abc dis klinigi
```

Ancak orijinal gösterim mutlaka korunmalıdır.

---

# 11. Türkçe normalization

Türkçe için özel normalize fonksiyonu kullanılmalıdır.

Örnek:

```text
ç -> c
ğ -> g
ı -> i
İ -> i
ö -> o
ş -> s
ü -> u
```

Ancak bunu sadece arama/karşılaştırma anahtarı için kullan.

Orijinal isim:

```text
Diş Hekimi Dr. Ahmet Yılmaz
```

korunmalı.

Normalization key:

```text
dis hekimi dr ahmet yilmaz
```

---

# 12. Telefon normalize etme

Türkiye için canonical format:

```text
+905321234567
```

Normalize edilecek örnekler:

```text
0532 123 45 67
+90 532 123 45 67
0532-123-45-67
5321234567
```

Bunların tamamı mümkün olduğunca aynı canonical numaraya dönüştürülmelidir.

Telefon dedupe için güçlü sinyaldir.

---

# 13. Website normalize etme

Örnek:

```text
http://www.example.com/
https://example.com
https://www.example.com/contact
```

Canonical domain:

```text
example.com
```

Ancak URL'nin kendisi de ayrıca saklanmalıdır.

---

# 14. Entity Resolution / Deduplication

Bu projenin en kritik teknik kısmıdır.

Aynı işletme farklı kaynaklarda şu şekilde gelebilir:

```text
ABC Dental
ABC Dental Kliniği
ABC Diş Kliniği
Dr. Ahmet ABC Dental
```

Tek kayıt altında birleştirmek gerekir.

## Güçlü matching sinyalleri

Ağırlık örneği:

```text
Phone exact match       35%
Website domain match    25%
Location proximity      15%
Normalized name         15%
Address similarity       7%
Social profile            3%
```

Bu yüzdeler örnek başlangıç parametreleridir; gerçek veride benchmark edilmelidir.

## Matching skoru

```text
score =
  phone_similarity * 0.35 +
  domain_similarity * 0.25 +
  location_similarity * 0.15 +
  name_similarity * 0.15 +
  address_similarity * 0.07 +
  social_similarity * 0.03
```

Örnek eşik:

```text
>= 0.90  -> automatic merge
0.75-0.90 -> review queue
< 0.75 -> separate records
```

Bunlar ilk sürüm için başlangıç eşikleridir; gerçek precision/recall sonuçlarına göre ayarlanmalıdır.

---

# 15. Coğrafi duplicate detection

PostGIS ile:

```sql
ST_DWithin(location, other_location, 100)
```

gibi sorgular kullanılabilir.

Aynı isim ve çok yakın koordinat:

```text
ABC Dental
ABC Dental
distance = 14m
```

yüksek duplicate adayıdır.

Fakat aynı markanın farklı şubelerini yanlışlıkla birleştirmemek gerekir.

Bu nedenle:

```text
same phone + same domain + nearby
```

çok daha güçlü sinyaldir.

---

# 16. Website enrichment

İşletme bulunduğunda bir sonraki aşama web sitesini incelemektir.

Toplanabilecek kurumsal alanlar:

```text
website
homepage title
description
phone
public email
address
opening hours
booking URL
WhatsApp URL
social links
language
CMS
analytics technologies
payment technologies
forms
SSL
HTTP status
```

Amaç spam üretmek değil; işletmenin kendi kamuya açık kurumsal bilgisini yapılandırmak ve veri kalitesini artırmaktır.

---

# 17. Website crawler mimarisi

Basit siteler:

```text
HTTP fetch
 -> HTML parser
 -> extraction
```

JS ağırlıklı siteler:

```text
Playwright
 -> render
 -> DOM extraction
```

Queue:

```text
Redis
  -> BullMQ
       -> crawler workers
```

Örnek job:

```json
{
  "business_id": "123",
  "url": "https://example.com",
  "priority": "normal",
  "attempt": 1
}
```

---

# 18. Crawler güvenlik ve kalite kuralları

Crawler tarafında mutlaka:

```text
request timeout
retry limit
exponential backoff
robots / site policy değerlendirmesi
rate limiting
per-domain concurrency limit
content-type kontrolü
maximum response size
redirect limit
SSRF protection
private IP blocking
malicious URL filtering
```

uygulanmalıdır.

Özellikle SSRF için crawler'ın şunlara erişmesi engellenmelidir:

```text
localhost
127.0.0.1
0.0.0.0
169.254.169.254
10.0.0.0/8
172.16.0.0/12
192.168.0.0/16
```

ve IPv6 local/private blokları da ele alınmalıdır.

---

# 19. Email extraction

Öncelik sırası:

```text
mailto link
contact page
about page
footer
schema.org JSON-LD
```

Canonicalization:

```text
lowercase
trim
Unicode normalize
duplicate remove
```

Email için ayrı kalite durumu tutulabilir:

```text
public_business_email
role_based_email
personal_email
unknown
```

Ürün tarafında kişisel nitelikteki veriler ile işletmenin kurumsal iletişim bilgileri birbirinden ayrılmalıdır.

---

# 20. Social discovery

Web sitesindeki sosyal linkleri parse et:

```text
Instagram
Facebook
LinkedIn
YouTube
TikTok
X
```

Önce kendi sitesindeki açık linkleri bulmak, tahmini username üretmeye göre daha güvenilir yöntemdir.

---

# 21. Technology detection

İşletme websitesinde:

```text
WordPress
WooCommerce
Shopify
Webflow
Wix
Next.js
React
Cloudflare
Google Analytics
Meta Pixel
Tag Manager
Booking systems
Payment providers
```

gibi teknolojiler tespit edilebilir.

Kaynaklar:

```text
HTML
headers
scripts
meta tags
DNS
TLS certificate
known technology signatures
```

Bu alan özellikle web ajansları için değerlidir.

---

# 22. Digital Presence Score

Örnek skor:

```text
Website                     +20
HTTPS                       +10
Instagram                   +10
Facebook                    +5
WhatsApp                    +10
Online booking              +15
Contact form                 +5
Analytics                    +5
Modern technology            +5
Up-to-date metadata          +5

Total = 100
```

Bu sadece başlangıç formülüdür.

Daha gelişmiş sürümde:

```text
site accessibility
mobile performance
SEO metadata
structured data
page speed
SSL validity
broken links
freshness
```

de eklenebilir.

---

# 23. Lead Score

Lead score bir “işletme kaliteli/kötü” puanı olmamalıdır.

Buradaki amaç satın alma fırsatı sinyali üretmektir.

Örneğin web ajansı için:

```text
No website                  +35
Old/weak website            +20
No booking                  +15
Instagram present           +10
Business active             +10
Phone present                +5
Public email                 +5
```

Sonuç:

```text
Lead score = 0..100
```

Aynı işletmenin farklı kullanım senaryoları için farklı skorları olabilir:

```text
web_agency_score
seo_score
ads_score
crm_score
```

---

# 24. Veri doğrulama sistemi

Her kayda:

```text
first_seen_at
last_seen_at
last_verified_at
```

ekle.

Örneğin:

```text
ACTIVE
STALE
NEEDS_RECHECK
CLOSED
```

durumları.

## Telefon doğrulama

Aşama 1:
- format kontrolü
- ülke kodu
- numara uzunluğu

Aşama 2:
- kaynaktan tekrar doğrulama

Aşama 3:
- gerekiyorsa ayrı doğrulama sağlayıcısı

## Website doğrulama

```text
DNS resolves
HTTP 200/3xx
HTTPS valid
Domain exists
Page content relevant
```

## Email doğrulama

Mümkün olduğunda:

```text
syntax
MX
provider checks
```

Ancak pahalı doğrulama hizmetlerini tüm dataset'e uygulamak yerine high-value kayıtlar için kullanmak daha ekonomik olabilir.

---

# 25. Freshness sistemi

İşletme verisinin güncelliğini ölç.

Örnek:

```text
0-7 days      = 100
8-30 days     = 90
31-90 days    = 75
91-180 days   = 50
181-365 days  = 30
365+ days     = 10
```

Bu da yine ilk parametre setidir.

Ürün ekranında:

```text
Last verified: 3 days ago
```

gösterilebilir.

---

# 26. Search altyapısı

İlk sürüm:

```text
PostgreSQL
+
PostGIS
```

Yeterlidir.

Kayıt sayısı ve sorgu hacmi arttığında:

```text
Typesense
```

veya:

```text
OpenSearch
```

eklenebilir.

Önerilen yaklaşım:

```text
PostgreSQL = source of truth
Typesense = search/read optimization
```

Search index yeniden üretilebilir olmalıdır; tek gerçek veri deposu index olmamalıdır.

---

# 27. Filtreleme

Kullanıcı aşağıdaki filtreleri birleştirebilmelidir:

```text
Category
Subcategory
Province
District
Neighborhood
Postal code
Radius
Business status
Rating
Review count
Website exists
HTTPS
Public email exists
Phone exists
WhatsApp exists
Instagram exists
Facebook exists
LinkedIn exists
Online booking exists
CMS
Technology
Digital presence score
Lead score
Last verified
```

Örnek sorgu:

```text
Diş Kliniği
İstanbul
Kadıköy
Website var
Booking yok
WhatsApp var
4.5+
100+ reviews
Verified < 30 days
```

---

# 28. Dashboard

## Ana sayfa

```text
Total Businesses
Active Businesses
New This Month
Verified Last 30 Days
Data Freshness
Coverage by Province
Coverage by Category
```

## Business Search

Liste:

```text
Name
Category
Province
District
Phone
Website
Rating
Review Count
Status
Lead Score
Last Verified
```

## Business Detail

```text
Basic Information
Location
Contacts
Website
Socials
Technologies
Data Sources
Verification
Scores
History
```

---

# 29. CSV export

Export alanları:

```text
business_name
category
subcategory
province
district
neighborhood
address
postal_code
latitude
longitude
phone
email
website
instagram
facebook
linkedin
whatsapp
rating
review_count
business_status
website_quality_score
digital_presence_score
lead_score
last_verified_at
```

Müşteriye export sırasında kolon seçtirmek iyi olur.

Örneğin:

```text
[ x ] Phone
[ x ] Website
[   ] Latitude
[ x ] Instagram
[ x ] Lead Score
```

---

# 30. XLSX export

Excel içinde ayrı sheet'ler oluşturulabilir:

```text
Businesses
Contacts
Websites
Socials
Metadata
```

Büyük datasetlerde dosyayı tek seferde RAM'e almak yerine stream/chunk ile üret.

---

# 31. API

REST API başlangıç için yeterli.

## Authentication

```http
POST /v1/auth/login
POST /v1/auth/register
POST /v1/auth/refresh
```

## Businesses

```http
GET /v1/businesses
GET /v1/businesses/:id
```

Örnek:

```http
GET /v1/businesses?category=dentist&province=istanbul&district=kadikoy&hasWebsite=false
```

## Categories

```http
GET /v1/categories
```

## Exports

```http
POST /v1/exports
GET /v1/exports
GET /v1/exports/:id
```

## Usage

```http
GET /v1/usage
GET /v1/credits
```

---

# 32. API pagination

Offset pagination yerine büyük tabloda cursor pagination tercih edilmeli.

Örneğin:

```text
GET /v1/businesses?limit=100&cursor=eyJpZCI6...
```

Bu büyük datasetlerde daha stabil çalışır.

---

# 33. Rate limiting

Örnek:

```text
Unauthenticated: very low
Free: 60 requests/min
Pro: 300 requests/min
Agency: 1000 requests/min
Enterprise: custom
```

Müşteri bazında:

```text
requests_per_minute
records_per_day
records_per_month
export_limit
```

tutulmalıdır.

---

# 34. Credit sistemi

API ve export için kredi sistemi kullanılabilir.

Örnek:

```text
1 record = 1 credit
1000 credits = 1 export package
```

Daha gelişmiş yapı:

```text
Business basic = 1 credit
Website enrichment = +1
Email enrichment = +2
Deep verification = +3
```

Bu sayede düşük maliyetli sorgu ile pahalı enrichment'i ayırabilirsin.

---

# 35. Fiyatlandırma modeli

Piyasadaki Türkiye işletme datası ürünleri kayıt bazlı fiyatlandırma ve paket satışını zaten kullanıyor. Bu nedenle başlangıçta hem tek seferlik dataset hem abonelik birlikte sunulabilir.

Örnek fiyat yapısı:

| Paket | İçerik | Örnek fiyat |
|---|---|---:|
| Free | Kısıtlı arama / örnek kayıt | ₺0 |
| Starter | 1.000 kredi | ₺499 |
| Pro | 10.000 kredi | ₺2.499 |
| Agency | 50.000 kredi | ₺7.500 |
| Business | 150.000 kredi | ₺15.000 |
| Enterprise | Özel limit / API / destek | Özel |

Bunlar başlangıç fiyat önerileridir; gerçek fiyatlandırma veri kalitesi, maliyet ve satış geri bildirimine göre test edilmelidir.

---

# 36. Niş dataset satışları

Ana platformun yanında hazır paketler satılabilir.

Örnek:

```text
Türkiye Diş Klinikleri
Türkiye Veterinerler
İstanbul Güzellik Merkezleri
Ankara Hukuk Büroları
İzmir Oto Servisleri
```

İçerik:

```text
CSV
XLSX
API access
```

---

# 37. Abonelik ürünü

En güçlü gelir modeli yalnızca CSV değildir.

Örnek:

```text
Aylık ₺2.500

- 25.000 export kredisi
- search access
- API
- verification
- monthly refresh
```

Daha yüksek paket:

```text
Aylık ₺7.500

- 100.000 credits
- priority data
- API
- automated exports
- advanced filters
```

---

# 38. Veri fiyatlandırma stratejisi

Ham kayıt ucuzdur.

Zenginleştirilmiş kayıt daha değerlidir.

Önerilen değer katmanları:

```text
L0 = basic
L1 = normalized
L2 = enriched
L3 = verified
L4 = intelligence
```

Örneğin:

```text
L0
Name + address

L1
+ phone + category + coordinates

L2
+ website + social + email

L3
+ verification + freshness

L4
+ digital score + lead score + technology profile
```

---

# 39. Maliyet kontrolü

En pahalı işleri tüm dataset'e körlemesine uygulama.

Pipeline:

```text
10M raw records
       |
       v
6M valid candidates
       |
       v
4M unique businesses
       |
       v
2M priority businesses
       |
       v
500K deep-enriched businesses
```

Böylece pahalı enrichment sadece değerli kayıtlar üzerinde yapılır.

Önceliklendirme:

```text
customer demand
category value
city value
data completeness
business activity
```

---

# 40. Türkiye şehir yapısı

Ana coğrafya modeli:

```text
Country
  -> Province
      -> District
          -> Neighborhood
```

81 il desteklenmeli.

PostGIS sayesinde:

```text
radius search
nearest businesses
polygon search
province boundary
```

gibi sorgular mümkün olur.

---

# 41. Veri kalitesi dashboard'u

Admin panelde:

```text
Duplicate rate
Missing phone rate
Missing website rate
Invalid phone rate
Invalid website rate
Stale record rate
Verification success
Category confidence
Province coverage
```

izlenmelidir.

Örnek:

```text
Total records         2,431,830
Unique businesses     2,081,449
Duplicate candidates    183,100
Verified <30d         1,622,901
With phone            1,893,120
With website          1,402,811
With public email       821,991
```

---

# 42. Admin panel

Admin özellikleri:

```text
Dataset overview
Import jobs
Crawler jobs
Failed jobs
Duplicate queue
Verification queue
Source management
License records
Category management
Customer management
Credits
Exports
API keys
Audit logs
System health
```

---

# 43. Queue mimarisi

Redis + BullMQ önerilir.

Queues:

```text
ingestion
normalization
deduplication
website_crawl
email_extract
social_extract
tech_detection
verification
scoring
exports
notifications
```

Örnek:

```text
website_crawl
    |
    +--> worker-01
    +--> worker-02
    +--> worker-03
    +--> worker-04
```

Her job idempotent olmalıdır.

---

# 44. Idempotency

Aynı veri iki kez geldiğinde iki ayrı işletme oluşmamalı.

Örneğin ingestion batch tekrar çalışırsa:

```text
source_id + external_id
```

üzerinden unique constraint oluşturulabilir.

---

# 45. Veritabanı indexleri

Başlangıç için:

```sql
CREATE INDEX idx_business_category
ON businesses(category_id);

CREATE INDEX idx_business_status
ON businesses(business_status);

CREATE INDEX idx_location
ON business_locations
USING GIST(location);

CREATE INDEX idx_business_updated
ON businesses(updated_at DESC);
```

Telefon için normalized value üzerinde index.

Domain için:

```sql
CREATE INDEX idx_website_domain
ON business_websites(normalized_domain);
```

---

# 46. Partitioning

Veri büyürse snapshot/history tabloları partition edilebilir.

Örneğin:

```text
business_snapshots_2026_01
business_snapshots_2026_02
business_snapshots_2026_03
```

Ana `businesses` tablosunu gereksiz yere partition etme; önce gerçek workload ölç.

---

# 47. Analytics

Ürün metrikleri:

```text
Searches/day
Exports/day
API records/day
Credits consumed
Top categories
Top provinces
Top filters
Conversion to paid
Churn
MRR
ARPA
Customer retention
```

---

# 48. Kullanıcı hesabı

Tablolar:

```text
users
organizations
organization_members
subscriptions
plans
credits
credit_transactions
api_keys
exports
```

B2B kullanım için individual user yerine organization modelinin erken eklenmesi daha iyi olur.

---

# 49. Multi-tenant mimari

Her müşteri:

```text
organization_id
```

ile ayrılmalı.

Örnek:

```text
users
organizations
organization_members
api_keys
exports
credit_transactions
```

Her kullanıcı sorgusunda tenant isolation uygulanmalıdır.

---

# 50. Authentication

Öneri:

```text
Supabase Auth
```

veya

```text
Clerk
```

Kullanıcının mevcut teknoloji tercihleri açısından Supabase Auth mantıklı bir seçimdir.

Backend JWT doğrular.

Admin:

```text
role = admin
```

müşteriler:

```text
role = member
owner
```

---

# 51. Frontend

Önerilen:

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
TanStack Query
Zod
```

Sayfalar:

```text
/
/pricing
/login
/register
/dashboard
/dashboard/search
/dashboard/businesses/:id
/dashboard/exports
/dashboard/api
/dashboard/billing
/dashboard/settings
/admin
/admin/sources
/admin/jobs
/admin/quality
```

---

# 52. Backend

Önerilen:

```text
Node.js
NestJS
TypeScript
PostgreSQL
Prisma veya Drizzle
Redis
BullMQ
```

Alternatif:

```text
Express
```

Ancak worker ve domain modülleri büyüyeceği için NestJS daha düzenli bir yapı sağlar.

---

# 53. Python data stack

Data engineering için:

```text
Python
Polars
DuckDB
PyArrow
Pydantic
```

Crawler/enrichment ayrı servis ise:

```text
Playwright
httpx
BeautifulSoup / lxml
```

kullanılabilir.

---

# 54. Monorepo yapısı

Önerilen repository:

```text
leadtr/
├── apps/
│   ├── web/
│   ├── api/
│   └── admin/
│
├── workers/
│   ├── ingestion/
│   ├── crawler/
│   ├── enrichment/
│   └── exports/
│
├── packages/
│   ├── database/
│   ├── types/
│   ├── config/
│   ├── validation/
│   └── logger/
│
├── data/
│   └── schemas/
│
├── infra/
│   ├── docker/
│   ├── migrations/
│   └── coolify/
│
├── docs/
│
├── .env.example
├── docker-compose.yml
└── README.md
```

---

# 55. Docker servisleri

Development:

```text
postgres
redis
api
web
worker
crawler
search
```

İlk aşamada Typesense Docker ile çalışabilir.

---

# 56. Coolify deployment

Kullanılabilecek yapı:

```text
VDS
  |
  v
Coolify
  |
  +-- Next.js
  +-- NestJS API
  +-- Worker
  +-- Crawler
  +-- Typesense
  +-- Redis
  +-- PostgreSQL
```

Ancak büyük dataset için PostgreSQL'i aynı düşük kaynaklı VDS üzerinde tutmak yerine ayrı bir DB sunucusu/managed DB seviyesine geçmek daha güvenlidir.

---

# 57. Object storage

Öneri:

```text
Cloudflare R2
```

Kullanım:

```text
raw datasets
parquet files
exports
backup artifacts
crawl snapshots
```

---

# 58. Monitoring

Minimum:

```text
Prometheus
Grafana
Sentry
Uptime monitoring
Structured logs
```

Takip edilmesi gerekenler:

```text
queue depth
job failure rate
crawler response latency
DB CPU
DB connections
Redis memory
storage growth
API latency
5xx rate
```

---

# 59. Logging

Her job için:

```text
job_id
business_id
source_id
attempt
status
started_at
finished_at
error_code
error_message
```

bulunmalı.

PII benzeri hassas alanları loglara düz metin halinde yazmamak gerekir.

---

# 60. Backup

PostgreSQL:

```text
daily full backup
point-in-time recovery
weekly restore test
```

R2/S3:

```text
versioning
lifecycle policies
```

aktif edilebilir.

---

# 61. Güvenlik

API:

```text
JWT
API keys
rate limit
request validation
RBAC
CORS
CSRF where applicable
helmet/security headers
SQL parameterization
input sanitization
```

Export:

```text
signed download URL
short expiration
permission check
```

API key:

```text
store hash, not plaintext
```

---

# 62. Veri lisansı kayıt sistemi

Her source için:

```text
provider
license
license_url
terms_url
commercial_allowed
redistribution_allowed
storage_allowed
attribution_required
retrieved_at
```

Ayrıca her işletme kaydı için source lineage tutulmalı.

Bu sistem, bir kaydın hangi kaynaktan geldiğini ve hangi şart altında işlendiğini daha sonra gösterebilmek için gereklidir.

---

# 63. KVKK / gizlilik tasarımı

Bu platformda işletmelerle ilgili bazı alanlar kişisel veri niteliğine girebilir. Özellikle gerçek kişilere ait telefon, e-posta veya isim gibi veriler ayrı değerlendirilmelidir.

Ürün tasarımında:

```text
business data
contact data
personal contact data
```

ayrıştırılmalıdır.

Gerekli olduğunda:

```text
privacy policy
retention policy
data source documentation
user rights workflow
data deletion workflow
suppression / do-not-contact workflow
```

oluşturulmalıdır.

Kaynak, amaç, saklama süresi ve paylaşım mantığı hukuk danışmanı tarafından ürünün gerçek kullanımına göre ayrıca doğrulanmalıdır.

Kaynak:
- https://www.kvkk.gov.tr/

---

# 64. Ticari iletişim özelliği eklenirse

Platformun ileride:

```text
email campaign
SMS
WhatsApp campaign
```

gibi doğrudan pazarlama özellikleri eklemesi durumunda veri tabanı ile ileti gönderim sistemi kesin biçimde ayrılmalıdır.

Örnek:

```text
Business DB
     |
     v
Eligibility / Consent Layer
     |
     v
Messaging Provider
```

Doğrudan “veriyi aldım, herkese mesaj gönder” mantığı kullanılmamalıdır.

---

# 65. Veri silme / suppression sistemi

Müşteri veya veri sahibi tarafından kaldırma talebi geldiğinde:

```text
suppression_list
```

tutulabilir.

Örnek:

```text
entity_type
entity_value_hash
reason
created_at
expires_at
```

Tekrar ingestion olduğunda suppression kontrol edilmelidir.

---

# 66. Source freshness

Her kaynağın yenileme periyodu farklı olabilir.

Örnek:

```text
Overture                 monthly
Business website         30-90 days
Critical contacts        7-30 days
Technology detection     30-90 days
```

Gerçek refresh süresi kaynak ve maliyete göre belirlenmelidir.

---

# 67. Snapshot sistemi

Her önemli kaydın zaman içindeki değişimi tutulabilir.

Örnek:

```text
2026-06
website = oldsite.com

2026-07
website = oldsite.com

2026-08
website = newsite.com
```

Bu veri:

> “Business Change Intelligence”

ürününe dönüştürülebilir.

---

# 68. Gelecekteki premium ürün

Dataset yerine:

## Business Change API

Müşteriye:

```text
Yeni açılan işletme
Website değişti
Telefon değişti
Adres değişti
İşletme kapandı
Yeni şube açıldı
```

event'leri satılabilir.

Örnek:

```json
{
  "event": "website_changed",
  "business_id": "123",
  "old_value": "oldsite.com",
  "new_value": "newsite.com",
  "detected_at": "2026-09-30"
}
```

Bu klasik CSV'den daha güçlü bir ürün fikridir.

---

# 69. AI katmanı

AI doğrudan bütün dataset'i taramak için kullanılmamalıdır.

Önce deterministic extraction.

Sonra yalnızca belirsiz/karmaşık alanlarda AI:

```text
category classification
service classification
business description summarization
website quality explanation
lead intent classification
```

Örnek:

```text
Site içeriği
   |
   v
Rule based extraction
   |
   +--> confidence high -> save
   |
   +--> confidence low -> AI
```

Bu maliyeti ciddi biçimde azaltır.

---

# 70. AI category classifier

Örneğin website:

```text
“İmplant, ortodonti, estetik diş hekimliği...”
```

AI kategoriyi:

```text
Diş Kliniği
```

olarak sınıflandırabilir.

Daha sonra:

```text
Orthodontics = true
Implant = true
Cosmetic dentistry = true
```

gibi service tags oluşabilir.

---

# 71. Veri kalitesi skorları

## Completeness

```text
name         10
category     10
location     10
phone        15
website      15
email        10
socials      10
hours         5
status        5
source        5
verification  5
```

Toplam 100.

## Confidence

Kaynak sayısı ve agreement üzerine kurulabilir.

Örnek:

```text
3 independent sources agree
        -> high confidence
```

---

# 72. Veri kaynakları stratejisi

Kaynakları üç sınıfa ayır:

### A — Open / permissive

Kullanım hakkı ve lisansı açık kaynaklar.

### B — Licensed commercial

Ayrıca ücret karşılığı veya sözleşmeyle alınan veriler.

### C — Application/API data

Kendi servisinde gösterim için kullandığın fakat kalıcı redistributable dataset haline getiremeyeceğin kaynaklar.

Google Maps/Places entegrasyonunu bu üçüncü sınıfın tipik örneklerinden biri olarak ele almak gerekir.

---

# 73. Scraping kelimesini ürün seviyesinde unut

İç mimaride “crawler”, “collector”, “ingestion”, “enrichment” gibi isimler kullan.

Çünkü sistem aslında:

```text
source aggregation
+
entity resolution
+
web enrichment
+
verification
+
search
+
analytics
```

ürünüdür.

---

# 74. MVP kapsamı

İlk release'te sadece şunları yap:

```text
[✓] Kullanıcı kayıt/login
[✓] Category search
[✓] Province/district filters
[✓] Business detail
[✓] Phone
[✓] Website
[✓] Coordinates
[✓] Basic source lineage
[✓] CSV export
[✓] Credit system
[✓] Admin panel
[✓] PostgreSQL/PostGIS
[✓] Basic dedupe
[✓] Basic website verification
```

İlk sürümde yapma:

```text
[ ] Çok gelişmiş AI
[ ] 30 farklı sosyal ağ
[ ] Mobil uygulama
[ ] Çok karmaşık recommendation engine
[ ] Gereksiz microservice patlaması
```

---

# 75. V2

```text
[ ] Website enrichment
[ ] Public email detection
[ ] WhatsApp
[ ] Social discovery
[ ] Technology stack detection
[ ] Digital presence score
[ ] Advanced filters
[ ] XLSX export
[ ] Saved searches
[ ] Scheduled exports
```

---

# 76. V3

```text
[ ] Public API
[ ] API keys
[ ] usage analytics
[ ] Webhooks
[ ] Change detection
[ ] Business snapshots
[ ] Lead score
[ ] AI classification
[ ] Team workspaces
```

---

# 77. V4

```text
[ ] Business Change Intelligence
[ ] Industry reports
[ ] Market maps
[ ] Competitive intelligence
[ ] Custom datasets
[ ] Enterprise SLA
[ ] Dedicated tenant
[ ] Data warehouse integrations
```

---

# 78. İlk sektörler

Başlangıç için satış açısından test edilebilecek sektörler:

```text
Diş klinikleri
Güzellik merkezleri
Estetik klinikler
Veterinerler
Hukuk büroları
Gayrimenkul ofisleri
Oto servisleri
Özel eğitim merkezleri
Fizyoterapi merkezleri
Oteller
Restoranlar
```

Ancak “en kârlı sektör” sonucu önceden varsayılmamalıdır; ödeme yapan müşteri verisiyle ölçülmelidir.

---

# 79. İlk veri seti hedefi

İlk hedef:

```text
100K-500K unique businesses
```

Önce kalite.

Sonra:

```text
500K
-> 1M
-> 2M
-> 5M+
```

Dataset büyüklüğünden önce:

```text
duplicate rate
completeness
freshness
verification rate
```

ölç.

---

# 80. Örnek business JSON

```json
{
  "id": "bus_01J...",
  "name": "ABC Diş Kliniği",
  "category": "Diş Kliniği",
  "location": {
    "province": "İstanbul",
    "district": "Kadıköy",
    "neighborhood": "Caferağa",
    "latitude": 40.99,
    "longitude": 29.03
  },
  "contacts": {
    "phone": "+902121234567",
    "email": "info@example.com",
    "whatsapp": true
  },
  "website": {
    "url": "https://example.com",
    "https": true,
    "cms": "WordPress",
    "has_booking": false
  },
  "socials": {
    "instagram": "https://instagram.com/example"
  },
  "scores": {
    "completeness": 91,
    "freshness": 94,
    "digital_presence": 72,
    "lead_score": 84
  },
  "verification": {
    "last_verified_at": "2026-09-28T12:00:00Z"
  }
}
```

---

# 81. API örneği

```http
GET /v1/businesses
```

Query:

```text
category=dentist
province=istanbul
district=kadikoy
has_website=false
has_whatsapp=true
min_rating=4.5
min_review_count=100
verified_within_days=30
limit=100
```

Response:

```json
{
  "data": [
    {
      "id": "bus_01",
      "name": "ABC Diş Kliniği",
      "phone": "+902121234567",
      "website": null,
      "rating": 4.7,
      "review_count": 213,
      "lead_score": 89,
      "last_verified_at": "2026-09-28T12:00:00Z"
    }
  ],
  "next_cursor": "eyJpZCI6IjEyMyJ9"
}
```

---

# 82. Export job mimarisi

Kullanıcı:

```text
Export CSV
```

tıkladığında request doğrudan büyük dosyayı üretmemeli.

```text
POST /exports
        |
        v
Redis queue
        |
        v
Export worker
        |
        v
CSV -> R2
        |
        v
Signed URL
```

DB'ye:

```text
export_id
organization_id
filters
columns
record_count
status
file_url
expires_at
created_at
```

tutulur.

---

# 83. SEO stratejisi

Public tarafında:

```text
/turkiye/dis-hekimi
/istanbul/dis-hekimi
/istanbul/kadikoy/dis-hekimi
```

gibi landing pages oluşturulabilir.

Ancak tek tek milyonlarca düşük değerli sayfa üretip indexletmek yerine kaliteli, faydalı sayfalar oluşturulmalıdır.

Örnek:

```text
Türkiye Diş Klinikleri Database
İstanbul Diş Klinikleri
Ankara Veterinerler
İzmir Hukuk Büroları
```

---

# 84. Satış sayfası

Hero:

> Türkiye işletme verilerini tek yerde keşfet.

Alt mesaj:

> Sektör, lokasyon, dijital varlıklar ve doğrulama durumuna göre filtrele. CSV, XLSX veya API ile kullan.

CTA:

```text
Ücretsiz keşfet
```

---

# 85. Ürünün farklılaşma noktaları

Rakiplerin sadece kayıt sayısıyla yarışma.

Daha önemli metrikler:

```text
Freshness
Coverage
Verification
Enrichment
Technology detection
Lead scoring
Change detection
API quality
```

Ürün mesajı:

> “En çok kayıt”

değil,

> “İşletme verisini satışa hazır hale getiriyoruz.”

olmalıdır.

---

# 86. Rekabet yaklaşımı

Piyasada bazı servisler kayıt başına düşük fiyatlı işletme dataları ve Excel export sunuyor. Bu nedenle temel dataset'i tek başına pahalılaştırmak yerine:

```text
Base data = commodity

Enrichment = premium
Verification = premium
Freshness = premium
API = recurring
Change detection = high-value recurring
```

modeli uygulanmalıdır.

---

# 87. Revenue senaryoları

Aşağıdaki rakamlar tahmin değil, **senaryo hesabıdır**.

## Senaryo A — küçük başlangıç

```text
10 müşteri
ortalama ₺2.500/ay

= ₺25.000 MRR
```

## Senaryo B — ürün-market fit başlangıcı

```text
30 müşteri
ortalama ₺4.000/ay

= ₺120.000 MRR
```

## Senaryo C — agency/SMB yoğun kullanım

```text
60 müşteri
ortalama ₺5.000/ay

= ₺300.000 MRR
```

## Senaryo D — enterprise ağırlıklı

```text
10 enterprise
ortalama ₺20.000/ay

= ₺200.000 MRR
```

Gerçek sonuç; veri kalitesi, satış kabiliyeti, kaynak maliyeti, rekabet, fiyatlandırma ve müşteri tutundurmaya bağlı olacaktır.

---

# 88. Birim ekonomi

Takip edilecek temel KPI:

```text
Revenue per 1K records
Cost per 1K records
Enrichment cost per record
Verification cost per record
Storage cost
Crawler cost
API compute cost
Gross margin
Customer acquisition cost
Lifetime value
```

Örnek:

```text
Customer pays       ₺5.000
Data/enrichment cost ₺800
Infra cost            ₺250
Payment cost          ₺150
Gross contribution   ₺3.800
```

Bu yalnızca örnek hesaplamadır.

---

# 89. En önemli KPI: Gross Margin

Dataset işinde gelir büyürken veri toplama maliyeti de büyüyebilir.

Bu yüzden her paket için:

```text
price
- provider cost
- enrichment cost
- verification cost
- storage
- compute
- payment fee
= contribution
```

hesaplanmalıdır.

---

# 90. Veri toplama otomasyonu

Orkestrasyon için:

```text
n8n
```

yardımcı olabilir ancak milyonlarca kayıt için ana processing engine olarak kullanılmamalıdır.

n8n:

```text
scheduled workflow
provider alerts
admin notifications
sales alerts
```

için kullanılabilir.

Milyonlarca item processing:

```text
Python workers
BullMQ
Spark/Polars/DuckDB
```

ile yapılmalıdır.

---

# 91. Scheduler

Örnek cron:

```text
01:00 source ingestion
03:00 normalization
04:00 dedupe
05:00 enrichment
06:00 verification
07:00 indexing
```

Job bağımlılıkları event/queue bazlı kurulursa sabit saat bağımlılığı azalır.

---

# 92. Data lineage

Bir alan için:

```text
business.phone
```

hangi kaynaktan geldi?

Örneğin:

```text
source = website
retrieved_at = 2026-09-29
confidence = 0.96
```

Bu yapı müşteri güveni ve hata ayıklama için önemlidir.

---

# 93. Conflict resolution

Birden fazla kaynak farklı telefon veriyorsa:

```text
Source A -> +90...
Source B -> +90...
Source C -> +90...
```

otomatik karar:

```text
source reliability
recency
number format
business domain relation
cross-source agreement
```

üzerinden verilebilir.

Eski değeri tamamen silmek yerine history içinde tut.

---

# 94. Business status

Temel durumlar:

```text
active
possibly_active
temporarily_closed
closed
unknown
```

Tek bir kaynak “kapalı” diyorsa doğrudan kesin kapalı yapma; ikinci sinyal iste.

---

# 95. Data quality pipeline

```text
Raw
 |
v
Schema valid?
 | no -> quarantine
 |
yes
 v
Normalize
 |
v
Duplicate detection
 |
v
Enrich
 |
v
Verify
 |
v
Score
 |
v
Publish
```

Hatalı kayıtlar:

```text
quarantine/
```

altında tutulabilir.

---

# 96. Quarantine sistemi

Örnek nedenler:

```text
invalid_phone
invalid_url
missing_name
bad_coordinates
duplicate_conflict
source_violation
crawler_error
suspicious_content
```

Admin bunları görebilmeli.

---

# 97. Rate limiting ve crawler dağıtımı

Tek IP üzerinden kontrolsüz paralellik yapılmamalıdır.

Her domain için:

```text
max concurrency
request delay
retry policy
```

ayrı ayarlanmalıdır.

Büyük veri işleme ile website crawler trafik politikasını birbirinden ayır.

---

# 98. Crawler user-agent

Açık ve tanımlı bir user-agent kullan.

Örnek:

```text
LeadTRBot/1.0 (+https://example.com/bot-info)
```

Crawler kimliği, iletişim adresi ve kullanım amacı dokümante edilebilir.

---

# 99. Observability dashboard örneği

```text
Crawler
----------------
Requests/min       4,820
Success             4,332
4xx                   231
5xx                   117
Timeout               140

Queue
----------------
Pending             18,230
Running              2,400
Failed                 132

DB
----------------
Connections            84
Queries/sec           1,920
Cache hit              87%
```

---

# 100. Test stratejisi

## Unit

```text
phone normalization
name normalization
URL canonicalization
category mapping
score calculation
```

## Integration

```text
PostgreSQL
Redis
source imports
crawler pipeline
export pipeline
```

## Data tests

Örneğin:

```text
>= 98% canonical phone format
>= 99% valid province values
<= 5% duplicate after final merge
```

Gerçek threshold'lar dataset ölçümleri üzerinden belirlenmelidir.

---

# 101. Golden dataset

Manuel olarak 5.000 kayıt seç ve insan tarafından doğrula.

Bu dataset:

```text
entity matching
category classification
phone accuracy
website accuracy
location accuracy
```

için benchmark olur.

Her yeni algoritma önce golden dataset üzerinde test edilir.

---

# 102. Precision / Recall

Özellikle dedupe için ölç:

```text
Precision = doğru merge / tüm predicted merge
Recall = doğru merge / tüm gerçek duplicate'ler
```

En kötü durum:

> Farklı şubeleri aynı işletme altında yanlış birleştirmek.

Bu yüzden “daha az duplicate” tek başına başarı değildir.

---

# 103. Data release versioning

Her dataset release:

```text
2026.09.1
2026.10.1
```

gibi versiyonlanabilir.

Müşterinin aldığı export:

```text
dataset_version
```

ile ilişkilendirilmelidir.

---

# 104. Enterprise teslimatları

Enterprise müşteriye:

```text
S3 bucket delivery
SFTP
API
Webhook
Scheduled CSV
BigQuery integration
PostgreSQL replica
```

gibi teslim seçenekleri sunulabilir.

---

# 105. API monetization

API'yi sadece export alternatifi olarak görme.

Örnek:

```text
GET /v1/search
GET /v1/businesses/:id
GET /v1/categories
GET /v1/changes
```

Özellikle `/changes` yüksek değerli olabilir.

---

# 106. Webhook sistemi

Müşteri:

```text
POST https://customer.com/webhooks/leadtr
```

ile değişiklikleri alabilir.

Event:

```text
business.created
business.updated
business.closed
website.changed
phone.changed
verification.failed
```

---

# 107. Saved search

Kullanıcı:

```text
İstanbul + Diş Kliniği + Website Yok
```

aramasını kaydeder.

Sistem her ay yeni uygun kayıtları bildirir.

Bu özellik aboneliğin değerini artırır.

---

# 108. Scheduled exports

Örnek:

```text
Her pazartesi 09:00

Yeni İstanbul diş klinikleri
CSV
```

veya:

```text
Her ayın 1'i

Türkiye veterinerler
XLSX
```

---

# 109. Sales intelligence modu

İleri aşamada müşteri için:

```text
Lead list
Lead score
Contact availability
Digital weaknesses
Recent changes
```

tek ekranda gösterilebilir.

Örnek:

```text
ABC Klinik

Lead Score: 88
Website: weak
Booking: none
WhatsApp: yes
Instagram: yes
Phone: yes

Why this lead?
- no online booking
- outdated website
- active business
```

---

# 110. White-label

Ajanslara:

```text
custom domain
custom logo
custom export branding
```

sunulabilir.

Örneğin:

```text
data.agencyname.com
```

---

# 111. Marketplace modeli

İleride uzman veri sağlayıcıları da dataset yükleyebilir:

```text
Provider
  -> Dataset
  -> Quality check
  -> Licensing check
  -> Publish
```

Platform komisyon alabilir.

Ancak bu ikinci aşama ürünüdür; MVP'ye koyma.

---

# 112. API teknolojileri

Öneri:

```text
REST first
OpenAPI/Swagger
API versioning
```

Daha sonra:

```text
GraphQL
```

gerektiğinde eklenebilir.

---

# 113. Error formatı

Standart:

```json
{
  "error": {
    "code": "INVALID_FILTER",
    "message": "category is invalid",
    "request_id": "req_123"
  }
}
```

Her request için:

```text
request_id
```

üret.

---

# 114. Environment variables

Örnek `.env`:

```env
NODE_ENV=production
DATABASE_URL=
REDIS_URL=
R2_ENDPOINT=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET=
TYPESENSE_HOST=
TYPESENSE_API_KEY=
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
SENTRY_DSN=
```

Secret'ları Git'e gönderme.

---

# 115. Development workflow

```text
GitHub
  |
  v
feature branch
  |
  v
Pull Request
  |
  v
CI
  |
  +--> lint
  +--> typecheck
  +--> unit tests
  +--> migration check
  |
  v
merge
  |
  v
Coolify deploy
```

---

# 116. CI/CD

GitHub Actions:

```text
install
lint
format check
typecheck
test
build
docker build
```

Deploy Coolify webhook ile tetiklenebilir.

---

# 117. Migration stratejisi

Production'da schema değişiklikleri:

```text
migration
 -> deploy compatible code
 -> backfill
 -> switch
```

Büyük tablo migration'larında lock süresine dikkat et.

---

# 118. Performans hedefleri

İlk MVP için örnek hedefler:

```text
Search p95 < 500ms
Business detail p95 < 300ms
API simple lookup p95 < 300ms
Export async = non-blocking
```

Bunlar SLA değil, engineering target'tır.

---

# 119. Ölçekleme

100K kayıt:

```text
1 PostgreSQL
1 Redis
1 API
2 workers
```

1M kayıt:

```text
PostgreSQL tuned
Redis
3-5 workers
search engine
R2
```

5M+ kayıt:

```text
dedicated DB
read replicas
search cluster as needed
multiple crawler workers
data lake
batch ETL
```

10M+ seviyesinde önce gerçek sorgu ve ingestion metrikleri ölçülmelidir; sırf kayıt sayısı nedeniyle gereksiz dağıtık sistem kurulmaz.

---

# 120. İlk sprint

## Sprint 1

```text
[ ] GitHub repo
[ ] Monorepo
[ ] Next.js app
[ ] NestJS app
[ ] PostgreSQL
[ ] Redis
[ ] Docker compose
[ ] Auth
[ ] basic schema
```

## Sprint 2

```text
[ ] source ingestion
[ ] raw storage
[ ] normalization
[ ] province/district model
[ ] initial category mapping
```

## Sprint 3

```text
[ ] dedupe
[ ] business search
[ ] business detail
[ ] PostGIS
```

## Sprint 4

```text
[ ] website enrichment
[ ] verification
[ ] scores
[ ] CSV export
```

## Sprint 5

```text
[ ] credits
[ ] billing
[ ] API
[ ] admin
```

## Sprint 6

```text
[ ] deployment
[ ] monitoring
[ ] QA
[ ] first customers
```

---

# 121. İlk müşteriyi bulma stratejisi

İlk hedef yüzlerce müşteri değildir.

İlk hedef:

```text
5-10 paying customers
```

Bu müşterilerden şu bilgileri al:

```text
Hangi filtreleri kullanıyor?
Hangi alanları gerçekten önemsiyor?
Verinin hangi alanı hatalı?
Ne sıklıkla yeni veri istiyor?
API ister mi?
Excel yeterli mi?
```

Bu geri bildirim doğrudan ürün roadmap'ine dönüştürülür.

---

# 122. Satış için paket örnekleri

## Paket A

```text
İstanbul Diş Klinikleri
CSV
5.000 kayıt
```

## Paket B

```text
Türkiye Güzellik Merkezleri
CSV + XLSX
20.000 kayıt
```

## Paket C

```text
Agency Data Subscription
API + search + export
Monthly refresh
```

## Paket D

```text
Custom Dataset
Türkiye
Sektör + şehir özelinde
```

---

# 123. Landing page demo data

Ürünün gerçek dataset'i büyük hale gelene kadar demo için örnek kayıtlar kullanılabilir.

Demo hesap:

```text
5.000 sample businesses
```

kullanıcı filtreleme deneyimini görebilir.

---

# 124. Product analytics event'leri

```text
signup
search_performed
business_viewed
filter_used
export_created
export_downloaded
api_key_created
credits_purchased
subscription_started
subscription_cancelled
```

---

# 125. Billing

Türkiye için ödeme altyapısı seçimi ayrıca araştırılmalıdır.

Örnek seçenek sınıfları:

```text
Türkiye ödeme kuruluşu
Stripe destekli yapı
Iyzico
PayTR
```

Seçim yapılırken:

```text
abonelik desteği
3D Secure
faturalama
chargeback
API
komisyon
vergi/e-belge ihtiyacı
```

değerlendirilmeli.

---

# 126. Financial model

Aylık tabloda:

```text
MRR
New MRR
Expansion MRR
Churned MRR
Net MRR
COGS
Gross Profit
Gross Margin
Hosting
Data Provider Cost
Payment Processing
AI Cost
```

ayrı takip edilmeli.

---

# 127. En önemli ticari risk

“Çok veri = çok para” varsayımı.

Asıl değer:

```text
Doğruluk
Güncellik
İşlenebilirlik
Filtreleme
Enrichment
API
```

kullanıcıya somut fayda sağladığında oluşur.

---

# 128. En önemli teknik riskler

```text
1. Duplicate explosion
2. Stale data
3. Source licensing mismatch
4. Crawler failures
5. Blocked domains
6. Cost explosion
7. DB bloat
8. Bad category mapping
9. False-positive business merges
10. Security vulnerabilities
```

Her biri için metric ve alarm oluşturulmalıdır.

---

# 129. En önemli ürün riski

Müşteri:

> “Bunu zaten başka yerden alabiliyorum.”

derse ürün farklılaşması yetmemiş demektir.

Bu nedenle USP:

```text
freshness
verification
digital signals
change detection
API
```

üzerine kurulmalıdır.

---

# 130. Son ürün vizyonu

Uzun vadeli yapı:

```text
Türkiye Business Graph
```

Sadece işletme listesi değil:

```text
Business
  |
  +-- Location
  +-- Category
  +-- Contacts
  +-- Website
  +-- Socials
  +-- Technologies
  +-- Status
  +-- Historical Changes
  +-- Source Graph
  +-- Digital Signals
  +-- Lead Signals
```

Bu yapı daha sonra:

```text
API
Data exports
Market research
Sales intelligence
Competitive intelligence
Business discovery
```

ürünlerinin ortak altyapısı olur.

---

# 131. Önerilen final stack

## Frontend

```text
Next.js
TypeScript
Tailwind CSS
shadcn/ui
TanStack Query
Zod
```

## Backend

```text
Node.js
NestJS
TypeScript
```

## Database

```text
PostgreSQL
PostGIS
```

## Queue

```text
Redis
BullMQ
```

## Data Engineering

```text
Python
Polars
DuckDB
PyArrow
```

## Crawler

```text
httpx / Playwright
BeautifulSoup / lxml
```

## Search

```text
Typesense
```

Başlangıç için PostgreSQL full-text + PostGIS ile de başlayabilirsin.

## Storage

```text
Cloudflare R2
```

## Auth

```text
Supabase Auth
```

## Monitoring

```text
Sentry
Prometheus
Grafana
```

## Deployment

```text
Docker
Coolify
Ubuntu VDS
```

## Source Control

```text
GitHub
```

---

# 132. Önerilen sistem diyagramı

```text
                        +----------------------+
                        |     DATA SOURCES     |
                        +----------+-----------+
                                   |
                 +-----------------+------------------+
                 |                 |                  |
                 v                 v                  v
          Overture /       Licensed Providers    Public Business
          open sources                              Websites
                 |                 |                  |
                 +-----------------+------------------+
                                   |
                                   v
                        +----------------------+
                        |    INGESTION API     |
                        +----------+-----------+
                                   |
                                   v
                        +----------------------+
                        |      RAW STORAGE     |
                        |       R2 / S3        |
                        +----------+-----------+
                                   |
                                   v
                        +----------------------+
                        |    PYTHON ETL        |
                        | Polars / DuckDB      |
                        +----------+-----------+
                                   |
                 +-----------------+------------------+
                 |                                    |
                 v                                    v
        +------------------+                 +------------------+
        | Normalization    |                 | Entity Resolution|
        +--------+---------+                 +---------+--------+
                 |                                     |
                 +-----------------+-------------------+
                                   |
                                   v
                        +----------------------+
                        |   ENRICHMENT         |
                        | Website / Social     |
                        | Technology / Contact |
                        +----------+-----------+
                                   |
                                   v
                        +----------------------+
                        | VERIFY + SCORE       |
                        +----------+-----------+
                                   |
                    +--------------+---------------+
                    |                              |
                    v                              v
          +-------------------+          +-------------------+
          | PostgreSQL/PostGIS|          | Typesense          |
          | SOURCE OF TRUTH   |          | SEARCH INDEX       |
          +---------+---------+          +---------+---------+
                    |                              |
                    +--------------+---------------+
                                   |
                                   v
                        +----------------------+
                        |      NestJS API      |
                        +----------+-----------+
                                   |
                 +-----------------+------------------+
                 |                 |                  |
                 v                 v                  v
            Next.js Dashboard    CSV/XLSX          Customer API
                 |
                 v
         Billing / Credits / Org
```

---

# 133. Database entity overview

```text
users
organizations
organization_members
subscriptions
plans
credits
credit_transactions
api_keys

businesses
business_locations
business_categories
business_contacts
business_websites
business_socials
business_snapshots
business_scores

sources
business_sources
source_batches
source_licenses

crawl_jobs
crawl_results
enrichment_jobs
verification_jobs
export_jobs

suppression_list
audit_logs
```

---

# 134. İlk database migration sırası

```text
001_extensions
002_users_orgs
003_categories
004_sources
005_businesses
006_locations
007_contacts
008_websites
009_socials
010_business_sources
011_scores
012_snapshots
013_exports
014_credits
015_api_keys
016_audit_logs
017_suppression
```

---

# 135. Coding standartları

```text
TypeScript strict mode
ESLint
Prettier
Zod validation
DTO validation
Repository/service separation
No raw SQL unless needed
Tests for normalization
Structured logger
```

Naming:

```text
business_id
organization_id
last_verified_at
```

DB alanlarında snake_case kullanılabilir.

TypeScript tarafında:

```text
businessId
organizationId
lastVerifiedAt
```

---

# 136. Repository prensibi

Business logic doğrudan controller içinde olmamalı.

Örnek:

```text
Controller
   -> Service
      -> Repository
         -> DB
```

Worker:

```text
Queue Job
   -> Processor
      -> Service
         -> Repository
```

---

# 137. Veri işleme prensipleri

```text
Deterministic before AI
Cheap before expensive
Batch before row-by-row
Source lineage always
Idempotent jobs
Retryable jobs
Versioned datasets
Raw data preserved
```

---

# 138. AI maliyet kontrol prensibi

Her işletmeye LLM çağrısı yapma.

Önce:

```text
regex
DOM parser
JSON-LD
known technology signatures
address parsers
phone parser
```

Sonra AI.

Örnek:

```text
category_confidence >= 0.90
   -> deterministic result

category_confidence < 0.90
   -> AI classify
```

---

# 139. İlk üretim ortamı önerisi

Başlangıç:

```text
1 VDS
  - Coolify
  - Next.js
  - NestJS
  - Worker
  - Redis
  - Typesense

External/managed:
  - PostgreSQL
  - R2
```

Daha sonra:

```text
2+ workers
separate crawler servers
managed DB
read replica
```

---

# 140. Veri toplama kapasitesinin ölçülmesi

Şu metriği takip et:

```text
processed businesses / hour
```

Ayrıca:

```text
crawl_success_rate
extract_success_rate
dedupe_rate
verification_rate
```

Örnek benchmark:

```text
Worker A = 4,000 pages/hour
Worker B = 3,700 pages/hour
```

gerçek performans donanıma ve hedef sitelere göre değişir.

---

# 141. İlk 30 günlük ürün planı

## Gün 1-5

```text
Architecture
Repo
Docker
Postgres
Redis
Auth
```

## Gün 6-10

```text
Source ingestion
Raw storage
Canonical schema
```

## Gün 11-15

```text
Normalization
Deduplication
PostGIS
```

## Gün 16-20

```text
Search UI
Business detail
CSV export
```

## Gün 21-25

```text
Website enrichment
Verification
Scores
```

## Gün 26-30

```text
Billing
Credits
API
Deploy
Monitoring
```

Bu plan gerçek geliştirme hızına göre değiştirilebilir; burada amaç kapsamı sıraya koymaktır.

---

# 142. İlk satış planı

Önce tamamen genel ürün satma.

Bir tane net dikey seç:

```text
“Türkiye Diş Kliniği Database”
```

ve:

```text
CSV
XLSX
API
Monthly refresh
```

sun.

Daha sonra:

```text
Güzellik
Veteriner
Hukuk
Otomotiv
```

ekle.

---

# 143. Örnek landing page akışı

```text
Hero
  |
  v
Search Demo
  |
  v
What data is included?
  |
  v
Data freshness
  |
  v
Use cases
  |
  v
Pricing
  |
  v
FAQ
  |
  v
CTA
```

---

# 144. Müşteri güveni

Her kayıtta mümkün olduğunca:

```text
Last verified
Data source category
Confidence
```

göster.

“%100 doğru veri” gibi doğrulanamayacak pazarlama ifadelerinden kaçın.

Daha iyi ifade:

> Doğrulanmış ve kalite skoru hesaplanmış işletme verileri.

---

# 145. Kullanıcı deneyimi

Müşteri ilk 30 saniyede:

```text
Sektör seç
Şehir seç
Filtrele
Sonuç gör
1 kayıt incele
Export oluştur
```

akışını yaşayabilmeli.

---

# 146. Basit MVP UI

```text
---------------------------------------------------------
LeadTR
---------------------------------------------------------

Sektör       [ Diş Kliniği ]
İl           [ İstanbul ]
İlçe         [ Kadıköy ]

Website      [ Yok v ]
WhatsApp     [ Var v ]
Min rating   [ 4.5 ]

                [ ARAMA ]
---------------------------------------------------------

1,284 results

ABC Dental         4.7   213 reviews
+90...             website: none
Instagram: yes     WhatsApp: yes
Lead score: 89

XYZ Dental         4.6   187 reviews
+90...             website: none
Instagram: yes     WhatsApp: no
Lead score: 84
---------------------------------------------------------
```

---

# 147. Ürün içi filtre örnekleri

### Web ajansı

```text
Website = No
Business Status = Active
Phone = Yes
Instagram = Yes
City = Istanbul
```

### SEO ajansı

```text
Website = Yes
HTTPS = Yes
Website Quality < 50
Business Status = Active
```

### CRM satışı

```text
Public Email = Yes
Phone = Yes
Business Active
Team/branch signals
```

---

# 148. Dataset paket formatları

```text
CSV
XLSX
JSONL
Parquet
API
```

Teknik kullanıcılar için Parquet özellikle büyük datasetlerde faydalıdır.

---

# 149. Data dictionary

Müşteriye satın aldığı dataset ile birlikte:

```text
README.txt
DATA_DICTIONARY.md
SOURCE_NOTES.md
CHANGELOG.md
```

verilebilir.

Örneğin:

```text
lead_score:
0-100
heuristic prospecting signal
not a business quality judgment
```

---

# 150. Final çalışma prensibi

Bu projenin çekirdeği:

```text
COLLECT
NORMALIZE
MERGE
ENRICH
VERIFY
SCORE
SEARCH
SELL
REFRESH
```

şeklindedir.

Google Maps tek başına ürün değildir.

Scraper tek başına ürün değildir.

Excel tek başına ürün değildir.

**Verinin sürekli güncel tutulması, kaynağının izlenmesi, duplicate'lerin temizlenmesi, işletmenin dijital yapısının zenginleştirilmesi ve bunun API/arama/abonelik olarak satılması ürünün kendisidir.**

---

# 151. Başlangıç kararı — uygulanacak mimari

İlk production sürümü için net öneri:

```text
Frontend:
Next.js + TypeScript + Tailwind + shadcn/ui

API:
NestJS + TypeScript

Auth:
Supabase Auth

DB:
PostgreSQL + PostGIS

Queue:
Redis + BullMQ

Data processing:
Python + Polars + DuckDB

Crawler:
httpx + Playwright

Search:
PostgreSQL first -> Typesense when needed

Storage:
Cloudflare R2

Deployment:
Docker + Coolify

CI/CD:
GitHub Actions

Monitoring:
Sentry + Prometheus + Grafana
```

---

# 152. MVP için yapılacaklar sırası

```text
PHASE 1
Repository + infrastructure

PHASE 2
Source ingestion + raw storage

PHASE 3
Canonical business schema

PHASE 4
Normalization

PHASE 5
Deduplication

PHASE 6
Search + filters

PHASE 7
Website verification

PHASE 8
Enrichment

PHASE 9
Scores

PHASE 10
Exports

PHASE 11
Credits + billing

PHASE 12
Public API

PHASE 13
Monitoring + QA

PHASE 14
First paying customers
```

---

# 153. Kaynaklar ve güncellik notu

Bu proje dokümanındaki dış kaynaklı hukuki/teknik notlar 30 Eylül 2026 itibarıyla kontrol edilmiştir.

### Google Places API policies

https://developers.google.com/maps/documentation/places/web-service/policies

Google, Places API içeriklerinin cache/storage kullanımına ilişkin kısıtlar ve `place_id` için istisna belirtiyor. Entegrasyon yapılırken güncel Google Maps Platform Terms ve ilgili API politikaları birlikte kontrol edilmelidir.

### Google Maps Platform Terms

https://developers.google.com/maps/terms

### Overture Places

https://docs.overturemaps.org/guides/places/

https://docs.overturemaps.org/attribution/

https://docs.overturemaps.org/schema/reference/places/place/

Overture Places, farklı sağlayıcılardan birleştirilen işletme/POI verileri içerir; lisans ve attribution detayları kaynak bazında kontrol edilmelidir.

### KVKK

https://www.kvkk.gov.tr/

Türkiye'de kişisel veri niteliğine girebilecek alanların işlenmesi, saklanması ve özellikle pazarlama amaçlı kullanımı ürünün gerçek operasyonuna göre ayrıca değerlendirilmelidir.

---

# 154. Son hedef

İlk hedef:

> Türkiye işletme veri tabanı.

Orta vadeli hedef:

> Türkiye B2B prospecting ve business intelligence platformu.

Uzun vadeli hedef:

> Güncel işletme varlıklarını, dijital sinyalleri ve değişimleri API üzerinden sağlayan Türkiye Business Graph.

Bütün teknik kararlar şu soruya göre verilmeli:

> “Bu özellik kayıt sayısını mı artırıyor, yoksa veri değerini ve müşterinin tekrar ödeme nedenini mi artırıyor?”

İkinci kategori önceliklendirilmelidir.
