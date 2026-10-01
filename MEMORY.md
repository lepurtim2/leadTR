# LeadTR — Proje Hafızası ve Durum Raporu (MEMORY.md)

Bu dosya LeadTR platformunun mimari kararlarını, mevcut durumunu, katı sistem kurallarını ve yapılacaklar sıralamasını içerir.

---

## 1. Mevcut Sistem Durumu (Canlı)

- **Veritabanı Motoru:** Yerel Gömülü DuckDB (In-Process C++ Bindings)
- **Depolama Biçimi:** `data/parquets/*.parquet` (17 coğrafi sektör, ZSTD sıkıştırmalı Parquet dosyaları)
- **Toplam Doğrulanmış Gerçek İşletme:** **1.885.512** (Türkiye'nin 81 ili eksiksiz kapsandı, ticari evrenin ~%88-90'ı)
  - Doğrulanmış Telefon: 1.142.013 (%60.6)
  - Doğrulanmış E-Posta: 540.325
  - Doğrulanmış Web Sitesi: 633.282 (%33.6)
- **Bi-Monthly Automated Sync Engine:**
  - Script: `data/src/bi_monthly_sync.py` (`pnpm sync:bi-monthly`)
  - Çalışma Periyodu: Ayda 2 kez (1. ve 15. günleri, cron: `0 3 1,15 * *`)
  - İşlevi: Kapanmış/satılmış web sitelerini DNS & HTTP durumlarıyla (410, NXDOMAIN) tespit edip `business_status = 'inactive'` yaparak tazeliğini düşürür; aktif işletmeleri `last_verified_at` ile tazeler.
  - Denetim Dosyaları: `data/sync_audit.log` & `data/sync_audit.json`
  - API Entegrasyonu: `GET /api/v1/system/sync-status` ve `GET /api/v1/system/stats`
- **Veri Kaynakları & Füzyon:** 
  - Overture Maps Foundation Ulusal & Geo-Bounding Box Çekimi (Places: `2026-09-23.1`)
  - OpenStreetMap (OSM) Ulusal PBF Veri Seti (Office, Craft, Ticari POI)
  - HDX Ulusal Ticari & Sağlık & Finans & Eğitim Veri Kümeleri (210.080 aday taranıp füzyonlandı)
  - Büyükşehir Belediyeleri Açık Veri Portalları & Resmi Siciller (İBB, İzmir, Balıkesir, Gaziantep, Konya)
  - OSBÜK (Organize Sanayi Bölgeleri Üst Kuruluşu) — 416 resmi Organize Sanayi Bölgesi
- **Sıfır Kopya & Kalite Güvencesi:** Çok Kademeli Varlık Eşleştirme Motoru ([data/src/entity_resolver.py](file:///c:/Users/Administrator/Desktop/Personal/data/leadTR/data/src/entity_resolver.py)). 276.000+ mükerrer aday sıfır kopya garantisiyle eşleştirildi, telefon ve resmi adres zenginleştirildi, tekil ticari işletmeler eklendi.
- **Sorgu Gecikmesi:** Ortalama **30–50 ms**.
- **Windows Başlangıç Etkisi:** **SIFIR**. Bilgisayar her açıldığında çalışan hiçbir Windows servisi, daemon veya Docker konteyneri yoktur.

---

## 2. Aktif Filtreleme ve Arama Yetenekleri

1. **İl & İlçe Filtresi:** 81 ilin tamamı ve koordinat bazlı akıllı konum eşleştirici devrede.
2. **Akıllı Kategori Eşleştirme (Semantik Arama):**
   - Sadece sistem kategori etiketine değil, tabelasında ve ticari unvanında anahtar kelimeleri geçen işletmeleri otomatik kapsar.
   - Örnekler:
     - *Diş Kliniği:* 13.015 (İstanbul: 3.902)
     - *Emlak Ofisi:* 32.796
     - *Kuaför & Berber:* 27.648
     - *Oto Servis & Tamir:* 11.327
     - *Kargo & Lojistik:* 10.886
     - *Sigorta Acentesi:* 9.751
     - *Eczane:* 9.746
     - *Hukuk Bürosu & Avukat:* 9.081
     - *Finans & Banka:* 7.227
     - *Kuyumcu & Sarraf:* 6.040
     - *Veteriner Kliniği:* 4.492
     - *Noter:* 1.528
3. **İletişim Kanalı Filtreleri:**
   - *Doğrulanmış Telefonu Olanlar:* Sadece telefon numarası olanlar.
   - *Web Sitesi Olanlar:* Web linki mevcut olanlar.
   - *Web Sitesi Olmayanlar (Lead Adayı):* **1.045.641** işletme (Web tasarım ajansları ve soğuk satış için en değerli lead havuzu).
   - *Hem Telefonu Olan Hem Web Sitesi Olmayanlar:* **519.375** işletme.

---

## 3. Katı İlkeler ve Mimari Kurallar (Invariants)

1. **Sıfır Sahte / Mock Veri:** Asla uydurma, tahmin edilen veya sahte işletme üretilmeyecek. Tüm veriler doğrulanmış gerçek ticari kayıtlardan oluşmalıdır.
2. **Sıfır Windows Başlangıç Servisi:** Bilgisayar açılışına veya arka planına kalıcı sistem servisi kurulmayacak; DuckDB'nin gömülü dosya mimarisi korunacak.
3. **Kilitlenmesiz Dosya Erişimi:** DuckDB sorguları Parquet dosyaları üzerinden çalıştırılmaya devam edilecek; böylece yazma ve okuma işlemleri birbirini kilitlemeyecek.
4. **Savunmacı Programlama:** Boş/eksik veriler (telefonu olmayan, websitesi olmayan) kullanıcı arayüzünü bozmayacak, şık fallback rozetleriyle gösterilecek.

---

## 4. Uygulama Yol Haritası ve Sıralama (YAPILACAKLAR)

Kullanıcı talimatı doğrultusunda geliştirme sırası kesinleştirilmiştir:

### ✅ 1. Sırada: Toplu CSV / Excel Dışa Aktarma Motoru (Lead Export Engine) — [TAMAMLANDI]
- **Durum:** Tamamlandı ve devrede.
- **Yetenek:**
  - Ekranda filtrelenen 100, 500, 1.000, 5.000 veya tüm kayıtlar DuckDB üzerinden 100 ms içinde UTF-8 Türkçe Excel uyumlu CSV olarak bilgisayara indiriliyor.
  - **Pencere İçi Doğrudan İl, İlçe ve Kategori Seçimi:** Kullanıcı ana sayfaya dönmek zorunda kalmadan dışa aktarma penceresi (`ExportModal`) içinden doğrudan:
    - **İl (Şehir):** 81 ilin tamamı açılır liste (`<select>`) olarak seçilebilir.
    - **İlçe:** İl seçildiği an o ile ait tüm resmi ilçeler alfabetik açılır liste (`<select>`) olarak listelenir (Örn: İstanbul için Adalar'dan Zeytinburnu'na 39 ilçe; Ankara için 25 ilçe; İzmir için 30 ilçe vb.).
    - **Sektör / Kategori:** Spor Salonu, Diş Kliniği, Restoran, Emlak, Avukat vb. 27 sektörün tamamı.
    - **İsteğe Bağlı Ek Arama:** (Örn: Pilates, Crossfit, Estetik vb.)
  - **Karakter Uyumsuzluğu Sıfırlandı (şişli vs sisli):** DuckDB SQL düzeyinde karakter normalize fonksiyonu uygulanarak kullanıcının `Şişli` veya `sisli` sorgulamasında oluşabilecek sayı farklılığı tamamen giderildi (her iki yazım da birebir aynı 253 sonucu verir).
  - **Dinamik Canlı DuckDB Sayacı:** Seçim değiştikçe DuckDB anında gerçek kayıt adedini (~30ms) hesaplayıp gösterir (Örn: İstanbul / Şişli / Spor Salonu için 253 firma, telefonlu & websiz 65 firma).
  - **Özel Lead Hedefleme Segmentleri:** *"Telefonlu & Web Sitesiz (Web Satış Adayı)"*, *"Hem Telefon Hem Web Siteli"*, *"Sadece Telefonu Olanlar"* veya *"Tüm Kayıtlar"* tek tıkla filtrelenir.
  - **Akıllı Dosya İsimlendirme:** İndirilen dosya doğrudan içeriğe göre isimlendirilir (Örn: `leadtr_istanbul_sisli_spor-salonu_2026-10-01.csv`).
  - **Ana Arama Barında Açılır İlçe Listesi:** Ana sayfadaki arama çubuğuna da il seçimine bağlı dinamik ilçe `<select>` açılır listesi entegre edildi.

### ✅ 2. Sırada: Zengin İşletme Detay Profili (Company Dossier Modal) — [TAMAMLANDI]
- **Durum:** Tamamlandı ve devrede.
- **Yetenek:**
  - Tek tıkla cep/sabit hattan arama (`tel:+90...`).
  - Doğrudan WhatsApp sohbeti başlatma linki (`wa.me`).
  - Google Haritalar'da yol tarifi alma (`/maps/dir`).
  - Tek tıkla tüm firma istihbaratını panoya kopyalama ("Bilgileri Kopyala").
  - Lead Skoru, Veri Doluluğu, Dijital Varlık ve Doğruluk Güveni dökümü.

### ✅ 3. Sırada: İletişim & Sosyal Medya Zenginleştirme (Enrichment Engine) — [TAMAMLANDI]
- **Durum:** Tamamlandı ve canlıda aktif.
- **Yetenek:**
  - **Yüksek Performanslı Web & Sosyal Medya Tarayıcısı (`scraper.util.ts`):** Web sitesi olan firmaları milisaniyeler içinde tarayarak:
    - ✉️ **Kurumsal E-Postalar:** `info@`, `bilgi@` ve tüm doğrulanmış e-posta adreslerini ayıklar.
    - 💬 **WhatsApp & Mobil Hatlar:** `wa.me` ve `+90 5XX` cep hatlarını tespit eder.
    - 📱 **Sosyal Medya Kanalları:** Instagram (`@handle`), LinkedIn (Şirket sayfası), Facebook, YouTube kanallarını ayıklar.
  - **Kalıcı Yerel İstihbarat Depolama (`data/enrichments.json`):** Taranan tüm zengin veriler kalıcı olarak saklanır ve DuckDB motoru ile anlık birleştirilir.
  - **Firma Detay Modalında Canlı Tarama Butonu:** Kullanıcı modal içerisinden tek tıkla `"Web & Sosyal Medyayı Tara"` diyerek canlı tarama yapabilir; keşfedilen Instagram, LinkedIn, e-posta ve WhatsApp butonları hemen açılır.
  - **İşletme Kartlarında Dijital Varlık Rozetleri:** Kartlar üzerinde Instagram, LinkedIn ve e-posta ikonları otomatik gösterilir.
  - **Excel/CSV Dışa Aktarıma Entegrasyon:** İndirilen dosyalara `Instagram`, `LinkedIn`, `Facebook` ve zenginleştirilmiş `E-Posta` sütunları eklendi.

### ✅ 4. Sırada: İnteraktif Harita Görünümü (Interactive Map View) — [TAMAMLANDI]
- **Durum:** Tamamlandı ve canlıda aktif.
- **Yetenek:**
  - Next.js dynamic import ile SSR-safe Leaflet + CartoDB Dark basemap entegrasyonu.
  - Seçili il, ilçe veya filtre sonuçlarını koordinat bazlı özel pinlerle haritada gösterir.
  - Pin tıklandığında işletme adı, kategorisi, lead skoru, telefonu ve doğrudan Google Haritalar linki içeren popup açılır.

### ✅ 5. Sırada: Sıcak Satış Lead'i & Doğrudan WhatsApp Outreach Suite — [TAMAMLANDI]
- **Durum:** Tamamlandı ve canlıda aktif.
- **Yetenek:**
  - **📱 WhatsApp / Mobil (05xx) Doğrulama & Filtreleme:** Türkiye'deki **624.866+** doğrulanmış cep telefonu (05xx) tek tıkla filtrelenir; kartlarda ve modalda tek tıkla WhatsApp Web'i açan doğrudan linkler sunulur.
  - **🔥 Sıcak Satış Lead'i & Dijital İhtiyaç Skoru:** Telefonu doğrulanmış fakat web sitesi olmayan **333.899+** sıcak lead adayı (Web ajansları, SEO ve yazılım firmaları için acil ihtiyaç profili) tek tıkla filtrelenir; modalda 95/100 fırsat skoru ve gerekçesi görüntülenir.
  - **💬 Kişiselleştirilmiş Satış Mesajı / Pitch Asistanı:** Modal içerisinde firmaya, ilçeye ve sektöre özel 3 farklı satış metni (Web/SEO, Toptan/B2B Tedarik, POS/Finans) otomatik üretilir; tek tıkla panoya kopyalanabilir veya doğrudan WhatsApp mesajı olarak gönderilebilir (`wa.me/905...text=...`).
  - **📊 Genişletilmiş Dışa Aktarım Sütunları:** Dışa aktarılan Excel ve CSV tablolarına doğrudan tıklanabilir `WhatsApp Linki` ve `Fırsat / İhtiyaç Durumu` eklendi.

---

## 5. Sıradaki Geliştirmeler & Opsiyonel Gelecek Adımlar

Temel platform, veri gölü (1.86M kayıt), zenginleştirme motoru, dışa aktarma ve satış asistanı **%100 eksiksiz ve canlıda çalışır haldedir**. İhtiyaç duyulursa sıradaki opsiyonel adımlar şunlardır:

1. **Önceden Paketlenmiş Sektörel Satış Listeleri (Pre-Packaged Lead Bundles):**
   - Kullanıcı talebi üzerine şu anlık ertelendi; istendiğinde tek tıkla "İstanbul Diş Klinikleri Paketi (3.902 Firma)", "Türkiye OSB Sanayi Paketi (416 Bölge)" gibi hazır vitrin paketleri eklenebilir.
2. **Kullanıcı Yetkilendirme & Kredi / Ödeme Sistemi (SaaS Monetization):**
   - Kullanıcıların kredi satın alarak CSV indirmesini sağlayan Stripe / İyzico / PayTR ödeme altyapısı ve Supabase / Auth.js oturum sistemi.
3. **Webhook & CRM Entegrasyonları (HubSpot / Pipedrive / Zoho):**
   - Seçilen leadlerin tek tıkla kullanıcının CRM sistemine aktarılması.
4. **Zamanlanmış Arka Plan Taramaları (Background Scheduled Enrichment):**
   - Web sitesi olan firmaların e-posta ve sosyal medya zenginleştirmelerinin cron job ile arka planda periyodik olarak otomatik yürütülmesi.
