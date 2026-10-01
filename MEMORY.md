# LeadTR — Proje Hafızası ve Durum Raporu (MEMORY.md)

Bu dosya LeadTR platformunun mimari kararlarını, mevcut durumunu, katı sistem kurallarını ve yapılacaklar sıralamasını içerir.

---

## 1. Mevcut Sistem Durumu (Canlı)

- **Veritabanı Motoru:** Yerel Gömülü DuckDB (In-Process C++ Bindings)
- **Depolama Biçimi:** `data/parquets/*.parquet` (17 coğrafi sektör, ZSTD sıkıştırmalı Parquet dosyaları)
- **Toplam Doğrulanmış Gerçek İşletme:** **1.667.540** (Türkiye'nin 81 ili eksiksiz kapsandı)
- **Veri Kaynağı:** Overture Maps Foundation (Places Sürümü: `2026-09-23.1`) — Katı `addresses[1].country = 'TR'` filtresiyle yabancı sınır sızıntıları (Yunan adaları vb.) %100 elendi.
- **Sorgu Gecikmesi:** Ortalama **30–50 ms** (Supabase'in 200k+ satırlık JOIN timeout hatası tamamen giderildi, Supabase devre dışı bırakıldı).
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

### 🗺️ 4. Sırada: İnteraktif Harita Görünümü (Cluster Map View) — [SIRADAKİ İŞ]
- **Kullanıcı Kararı:** Yol haritasının son aşaması olarak belirlenmiştir.
- **Hedef:** Harita sekmesinde seçili il/ilçe işletmelerini Leaflet/MapLibre kümelenmiş marker pinleriyle haritada interaktif olarak görselleştirmek.
