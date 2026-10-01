# LeadTR — Türkiye B2B İşletme & Lead İstihbarat Platformu

> **1.885.512 doğrulanmış gerçek ticari işletme**, 81 ilin tamamı, sıfır sahte veri, yerel gömülü DuckDB analitik motoru, anlık WhatsApp/soğuk satış araçları ve **ayda 2 kez otomatik çalışan denetimli senkronizasyon/temizleme motoru**.

---

## 🚀 Öne Çıkan Özellikler & Ticari Satış Araçları

- **⚡ 1.885.512 Doğrulanmış Gerçek Ticari Kayıt:**
  - 1.142.013 Doğrulanmış Telefon Numarası (%60.6)
  - 540.325 Doğrulanmış Kurumsal E-Posta
  - 633.282 Doğrulanmış Web Sitesi (%33.6)
  - 2.180+ Zenginleştirilmiş Sosyal Medya Profili (Instagram, LinkedIn, Facebook, YouTube)

- **🔄 Ayda 2 Kez Otomatik Veri Senkronizasyonu & Eskiyen Veri Temizliği (Bi-Monthly Sync Engine):**
  - **Takvim:** Her ayın 1. ve 15. günleri (`0 3 1,15 * *`) çalışır (`pnpm sync:bi-monthly`).
  - **Eskiyen Veri Tespiti & Çıkarma:** Kayıtlı işletme web sitelerini DNS çözümlemesi ve HTTP durum kodlarıyla (HTTP 410, NXDOMAIN) otomatik tarar; kapanmış, satılmış veya terk edilmiş işletmeleri `business_status = 'inactive'` olarak işaretler ve tazelik puanını düşürür.
  - **Aktif Veri Tazeleme:** Yayında olan ve çalışan işletmeleri `freshness_score = 100` ve `last_verified_at = now()` ile canlı tutar.
  - **Şeffaf Denetim Günlüğü:** Tüm güncellemeler `data/sync_audit.log` (kronolojik metin) ve `data/sync_audit.json` (yapılandırılmış JSON) dosyalarına kaydedilir.
  - **API Telemetrisi:** `GET /api/v1/system/sync-status` ve `GET /api/v1/system/stats` üzerinden anlık izlenebilir.

- **📱 WhatsApp / Mobil (05xx) Satış Filtresi:**
  - Türkiye genelindeki **625.000+** doğrudan cep numarasına sahip işletmeyi tek tıkla filtreler.
  - Kartlar ve detay pencereleri üzerinden tek tıkla aracı olmadan doğrudan WhatsApp Web/Masaüstü görüşmesi başlatır.

- **🔥 Sıcak Satış Lead'i & Dijital İhtiyaç Skoru (95/100):**
  - Doğrulanmış telefonu olan ancak resmi bir web sitesi veya dijital varlığı bulunmayan **334.000+** sıcak lead adayı.
  - Web tasarım ajansları, SEO uzmanları, Google Harita yöneticileri ve doğrudan soğuk satış ekipleri için en yüksek dönüşüm oranına sahip kitle.

- **💬 Kişiselleştirilmiş Satış Mesajı / Pitch Asistanı:**
  - İşletmenin adına, ilçesine ve sektörüne göre 3 farklı satış metni (Web/SEO, B2B Toptan Tedarik, POS/Finansman) üretir.
  - Tek tıkla panoya kopyalama ve doğrudan URL formatında WhatsApp'a aktarma (`wa.me/905...text=...`).

- **📊 Toplu Excel & CSV Dışa Aktarma (Lead Export Engine):**
  - İl, ilçe, sektör ve lead hedefine göre filtrelenmiş verileri DuckDB üzerinden 100 ms içinde UTF-8 Türkçe Excel uyumlu olarak dışa aktarır.
  - Tabloya doğrudan tıklanabilir **`WhatsApp Linki`** ve **`Fırsat / İhtiyaç Durumu`** sütunları eklenmiştir.

- **🗺️ İnteraktif Harita Görünümü (Cluster Map View):**
  - Leaflet + Dark CartoDB basemap ile seçili il ve ilçedeki işletmeleri koordinat bazlı pinlerle haritada görselleştirir.

- **🛡️ Sıfır Arka Plan Servisi (Zero Daemon Overhead):**
  - DuckDB yerel C++ gömülü bağlayıcıları sayesinde bilgisayar açılışında veya arka planda hiçbir kalıcı servis, daemon veya Docker konteyneri çalışmaz.

---

## 🏗️ Sistem Mimarisi & Teknoloji Yığını

| Katman | Teknoloji | Açıklama |
|---|---|---|
| **Arayüz (Web)** | Next.js 14 (App Router), React, TailwindCSS, Lucide, Leaflet | Modern, karanlık tema, yüksek duyarlıklı kullanıcı arayüzü |
| **API Sunucusu** | NestJS 10, TypeScript, RxJS, Fastify/Express | Modüler servis mimarisi, REST API, Swagger desteği |
| **Analitik Motoru** | DuckDB (Embedded In-Process C++) | 1.86M kayıt üzerinde 30–50 ms sorgu ve sayım gecikmesi |
| **Veri Deposu** | 17 Sektörel Parquet Dosyası (`data/parquets/*.parquet`) | ZSTD sıkıştırmalı, kilitlenmesiz, read-heavy göl |
| **Zenginleştirme** | Cheerio, Axios, Regex Scraper (`scraper.util.ts`) | Canlı web crawler, sosyal medya & WhatsApp tespiti |
| **Varlık Çözümleme**| Python 3 (`entity_resolver.py`, `Levenshtein`) | Çok kademeli mükerrer engelleme ve veri füzyonu |

---

## 📁 Proje Dizin Yapısı

```text
leadTR/
├── apps/
│   ├── api/                    # NestJS REST API Sunucusu (Port 4000)
│   │   ├── src/
│   │   │   ├── database/       # DuckDB servisi ve SQL sorgu üreticisi
│   │   │   ├── businesses/     # İşletme arama ve detay kontrolcüleri
│   │   │   ├── enrichment/     # Canlı web ve sosyal medya tarama servisi
│   │   │   └── exports/        # CSV / Excel dışa aktarma servisi
│   │   └── data/               # enrichments.json kalıcı zenginleştirme verisi
│   └── web/                    # Next.js 14 Web Uygulaması (Port 3000)
│       └── src/
│           ├── app/            # App router, global CSS, anasayfa
│           └── components/     # BusinessCard, BusinessModal, ExportModal, Map
├── data/
│   ├── parquets/               # 17 sektörel ZSTD Parquet veri gölü (1.86M kayıt)
│   └── src/                    # Overture, OSM, İBB ve belediye ingest/fusion scriptleri
├── packages/
│   ├── types/                  # Ortak TypeScript DTO ve arayüz tipleri
│   └── validation/             # Zod şemaları ve Türkiye 81 il/ilçe taksonomisi
├── docs/                       # Mimari, API, Veritabanı ve Yol Haritası belgeleri
├── MEMORY.md                   # Proje durum raporu ve mimari hafıza
└── README.md                   # Ana tanıtım ve kurulum belgesi
```

---

## ⚡ Kurulum ve Çalıştırma

### Gereksinimler
- Node.js (v18+)
- pnpm (`npm install -g pnpm`)
- Python (v3.10+)

### Geliştirme Ortamı (Development)

Tüm servisleri tek komutla eşzamanlı çalıştırmak için:

```bash
# Bağımlılıkları yükleyin
pnpm install

# Web (Port 3000) ve API (Port 4000) servislerini başlatın
pnpm dev
```

Veya servisleri bağımsız terminallerde çalıştırmak için:

```bash
# Terminal 1: API Sunucusu (http://localhost:4000)
pnpm dev:api

# Terminal 2: Web Arayüzü (http://localhost:3000)
pnpm dev:web
```

---

## 📡 API Uç Noktaları

| Metot | Uç Nokta | Açıklama |
|---|---|---|
| `GET` | `/api/v1/businesses` | Filtrelenmiş işletme listesi (Sayfalama, WhatsApp ve Sıcak Lead filtreleri) |
| `GET` | `/api/v1/businesses/count` | Canlı filtre eşleşme adedi (DuckDB üzerinde ~30ms) |
| `GET` | `/api/v1/businesses/:id` | İşletme detay profili, puanlar ve zenginleştirilmiş kanallar |
| `POST`| `/api/v1/enrichment/:id` | Firmanın web sitesini tarayarak sosyal medya ve e-postaları zenginleştirir |
| `GET` | `/api/v1/exports/download` | Excel/CSV formatında filtrelenmiş lead tablosunu indirir |
| `GET` | `/health` | API servis sağlık kontrolü |

---

## 🔒 Güvenilirlik ve Veri Kalitesi Garantisi

1. **Sıfır Sahte / Mock Veri:** Tüm veriler Overture Maps, OpenStreetMap, İBB, OSBÜK ve resmi belediye sicillerinden çekilmiş, varlık çözümleyici ile doğrulanmıştır.
2. **Karakter Normalize Edilmiş Arama:** Türkçe `ı/i`, `ğ/g`, `ü/u`, `ş/s`, `ö/o`, `ç/c` dönüşümleri SQL düzeyinde yapılarak "Şişli" veya "sisli" aramalarında sıfır veri kaybı sağlanır.
3. **Kalıcı Zenginleştirme:** Taranan her yeni sosyal medya veya WhatsApp hattı kalıcı `enrichments.json` dosyasında saklanır ve önbelleğe alınır.
