-- 1. Insert Plans
INSERT INTO "plans" ("name", "slug", "monthly_credits", "max_api_requests_per_minute", "max_exports_per_month", "price_monthly", "active")
VALUES
  ('Free', 'free', 100, 10, 1, 0, true),
  ('Starter', 'starter', 1000, 60, 10, 499, true),
  ('Pro', 'pro', 10000, 300, 50, 2499, true),
  ('Agency', 'agency', 50000, 1000, 200, 7500, true),
  ('Business', 'business', 150000, 2000, 500, 15000, true),
  ('Enterprise', 'enterprise', 0, 5000, 0, 0, true)
ON CONFLICT ("slug") DO NOTHING;

-- 2. Insert Data Sources
INSERT INTO "data_sources" ("provider", "name", "source_type", "license", "terms_url", "storage_allowed", "commercial_use_allowed", "redistribution_allowed", "attribution_required", "refresh_frequency", "collection_method", "active", "notes")
VALUES
  ('Overture Maps Foundation', 'Overture Places', 'open', 'CDLA Permissive 2.0 / ODbL', 'https://docs.overturemaps.org/attribution/', true, true, true, true, 'monthly', 'download', true, 'Global places dataset. Turkey records filtered by boundary.'),
  ('OpenStreetMap', 'OSM Turkey POI', 'open', 'ODbL 1.0', 'https://www.openstreetmap.org/copyright', true, true, true, true, 'weekly', 'download', true, 'ODbL requires share-alike for derivative databases. Attribution: © OpenStreetMap contributors.'),
  ('LeadTR', 'Website Enrichment', 'crawl', 'internal', NULL, true, true, true, false, 'monthly', 'crawl', true, 'Business website enrichment from publicly accessible corporate pages.')
ON CONFLICT DO NOTHING;

-- 3. Insert Top-Level Categories (Level 0)
INSERT INTO "business_categories" ("slug", "name", "level", "active")
VALUES
  ('saglik', 'Sağlık', 0, true),
  ('hukuk', 'Hukuk', 0, true),
  ('otomotiv', 'Otomotiv', 0, true),
  ('guzellik', 'Güzellik & Bakım', 0, true),
  ('egitim', 'Eğitim', 0, true),
  ('yeme-icme', 'Yeme & İçme', 0, true),
  ('konaklama', 'Konaklama', 0, true),
  ('gayrimenkul', 'Gayrimenkul', 0, true),
  ('finans', 'Finans & Sigorta', 0, true),
  ('teknoloji', 'Teknoloji', 0, true),
  ('insaat', 'İnşaat & Tadilat', 0, true),
  ('perakende', 'Perakende', 0, true),
  ('uretim', 'Üretim & Sanayi', 0, true),
  ('lojistik', 'Lojistik & Taşımacılık', 0, true),
  ('tarim', 'Tarım & Hayvancılık', 0, true),
  ('medya', 'Medya & Reklam', 0, true),
  ('spor', 'Spor & Fitness', 0, true),
  ('diger', 'Diğer', 0, true)
ON CONFLICT ("slug") DO NOTHING;

-- 4. Insert Subcategories (Level 1) linked to their parents
INSERT INTO "business_categories" ("parent_id", "slug", "name", "level", "active")
SELECT p.id, sub.slug, sub.name, 1, true
FROM (VALUES
  ('saglik', 'dis-hekimi', 'Diş Hekimi'),
  ('saglik', 'dis-klinigi', 'Diş Kliniği'),
  ('saglik', 'ortodonti', 'Ortodonti'),
  ('saglik', 'eczane', 'Eczane'),
  ('saglik', 'hastane', 'Hastane'),
  ('saglik', 'klinik', 'Klinik'),
  ('saglik', 'veteriner', 'Veteriner'),
  ('saglik', 'fizyoterapi', 'Fizyoterapi'),
  ('saglik', 'goz-doktoru', 'Göz Doktoru'),
  ('saglik', 'psikolog', 'Psikolog'),
  ('saglik', 'estetik-klinik', 'Estetik Klinik'),
  ('hukuk', 'avukat', 'Avukat'),
  ('hukuk', 'hukuk-burosu', 'Hukuk Bürosu'),
  ('hukuk', 'noter', 'Noter'),
  ('hukuk', 'arabulucu', 'Arabulucu'),
  ('otomotiv', 'oto-servis', 'Oto Servis'),
  ('otomotiv', 'lastikci', 'Lastikçi'),
  ('otomotiv', 'oto-ekspertiz', 'Oto Ekspertiz'),
  ('otomotiv', 'oto-yikama', 'Oto Yıkama'),
  ('otomotiv', 'oto-galeri', 'Oto Galeri'),
  ('otomotiv', 'oto-kurtarma', 'Oto Kurtarma'),
  ('guzellik', 'guzellik-merkezi', 'Güzellik Merkezi'),
  ('guzellik', 'kuafor', 'Kuaför'),
  ('guzellik', 'berber', 'Berber'),
  ('guzellik', 'spa', 'Spa & Hamam'),
  ('guzellik', 'nail-art', 'Nail Art'),
  ('egitim', 'ozel-okul', 'Özel Okul'),
  ('egitim', 'dershane', 'Dershane / Kurs'),
  ('egitim', 'dil-okulu', 'Dil Okulu'),
  ('egitim', 'kres', 'Kreş'),
  ('egitim', 'universite', 'Üniversite'),
  ('yeme-icme', 'restoran', 'Restoran'),
  ('yeme-icme', 'kafe', 'Kafe'),
  ('yeme-icme', 'fast-food', 'Fast Food'),
  ('yeme-icme', 'pastane', 'Pastane'),
  ('yeme-icme', 'firincilik', 'Fırıncılık'),
  ('konaklama', 'otel', 'Otel'),
  ('konaklama', 'butik-otel', 'Butik Otel'),
  ('konaklama', 'pansiyon', 'Pansiyon'),
  ('konaklama', 'apart-otel', 'Apart Otel'),
  ('gayrimenkul', 'emlak-ofisi', 'Emlak Ofisi'),
  ('gayrimenkul', 'insaat-firmasi', 'İnşaat Firması'),
  ('gayrimenkul', 'mimarlik', 'Mimarlık Ofisi'),
  ('spor', 'spor-salonu', 'Spor Salonu'),
  ('spor', 'pilates', 'Pilates / Yoga'),
  ('spor', 'yuzme-havuzu', 'Yüzme Havuzu')
) AS sub(parent_slug, slug, name)
JOIN "business_categories" p ON p.slug = sub.parent_slug
ON CONFLICT ("slug") DO NOTHING;
