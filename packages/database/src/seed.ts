import 'dotenv/config';
import { createDb, businessCategories, dataSources, plans } from './index.js';

/**
 * Seed script for LeadTR database.
 * Safe to re-run (uses ON CONFLICT DO NOTHING via slug/name uniqueness).
 */
async function main() {
  const db = createDb();
  console.log('🌱 Seeding database...');

  // ── 1. Business Categories (hierarchical taxonomy) ────────
  const categoryData = [
    // L0 — Top-level
    { slug: 'saglik', name: 'Sağlık', level: 0 },
    { slug: 'hukuk', name: 'Hukuk', level: 0 },
    { slug: 'otomotiv', name: 'Otomotiv', level: 0 },
    { slug: 'guzellik', name: 'Güzellik & Bakım', level: 0 },
    { slug: 'egitim', name: 'Eğitim', level: 0 },
    { slug: 'yeme-icme', name: 'Yeme & İçme', level: 0 },
    { slug: 'konaklama', name: 'Konaklama', level: 0 },
    { slug: 'gayrimenkul', name: 'Gayrimenkul', level: 0 },
    { slug: 'finans', name: 'Finans & Sigorta', level: 0 },
    { slug: 'teknoloji', name: 'Teknoloji', level: 0 },
    { slug: 'insaat', name: 'İnşaat & Tadilat', level: 0 },
    { slug: 'perakende', name: 'Perakende', level: 0 },
    { slug: 'uretim', name: 'Üretim & Sanayi', level: 0 },
    { slug: 'lojistik', name: 'Lojistik & Taşımacılık', level: 0 },
    { slug: 'tarim', name: 'Tarım & Hayvancılık', level: 0 },
    { slug: 'medya', name: 'Medya & Reklam', level: 0 },
    { slug: 'spor', name: 'Spor & Fitness', level: 0 },
    { slug: 'diger', name: 'Diğer', level: 0 },
  ];

  console.log('  📂 Inserting top-level categories...');
  const insertedCategories = await db
    .insert(businessCategories)
    .values(categoryData)
    .onConflictDoNothing({ target: businessCategories.slug })
    .returning();

  // Build a lookup for parent IDs
  const categoryMap = new Map<string, string>();
  for (const cat of insertedCategories) {
    categoryMap.set(cat.slug, cat.id);
  }

  // If categories already existed, fetch them
  if (insertedCategories.length === 0) {
    const { eq } = await import('drizzle-orm');
    const existing = await db.select().from(businessCategories).where(eq(businessCategories.level, 0));
    for (const cat of existing) {
      categoryMap.set(cat.slug, cat.id);
    }
  }

  // L1 — Subcategories
  const subcategories = [
    // Sağlık
    { slug: 'dis-hekimi', name: 'Diş Hekimi', parentSlug: 'saglik' },
    { slug: 'dis-klinigi', name: 'Diş Kliniği', parentSlug: 'saglik' },
    { slug: 'ortodonti', name: 'Ortodonti', parentSlug: 'saglik' },
    { slug: 'eczane', name: 'Eczane', parentSlug: 'saglik' },
    { slug: 'hastane', name: 'Hastane', parentSlug: 'saglik' },
    { slug: 'klinik', name: 'Klinik', parentSlug: 'saglik' },
    { slug: 'veteriner', name: 'Veteriner', parentSlug: 'saglik' },
    { slug: 'fizyoterapi', name: 'Fizyoterapi', parentSlug: 'saglik' },
    { slug: 'goz-doktoru', name: 'Göz Doktoru', parentSlug: 'saglik' },
    { slug: 'psikolog', name: 'Psikolog', parentSlug: 'saglik' },
    { slug: 'estetik-klinik', name: 'Estetik Klinik', parentSlug: 'saglik' },

    // Hukuk
    { slug: 'avukat', name: 'Avukat', parentSlug: 'hukuk' },
    { slug: 'hukuk-burosu', name: 'Hukuk Bürosu', parentSlug: 'hukuk' },
    { slug: 'noter', name: 'Noter', parentSlug: 'hukuk' },
    { slug: 'arabulucu', name: 'Arabulucu', parentSlug: 'hukuk' },

    // Otomotiv
    { slug: 'oto-servis', name: 'Oto Servis', parentSlug: 'otomotiv' },
    { slug: 'lastikci', name: 'Lastikçi', parentSlug: 'otomotiv' },
    { slug: 'oto-ekspertiz', name: 'Oto Ekspertiz', parentSlug: 'otomotiv' },
    { slug: 'oto-yikama', name: 'Oto Yıkama', parentSlug: 'otomotiv' },
    { slug: 'oto-galeri', name: 'Oto Galeri', parentSlug: 'otomotiv' },
    { slug: 'oto-kurtarma', name: 'Oto Kurtarma', parentSlug: 'otomotiv' },

    // Güzellik
    { slug: 'guzellik-merkezi', name: 'Güzellik Merkezi', parentSlug: 'guzellik' },
    { slug: 'kuafor', name: 'Kuaför', parentSlug: 'guzellik' },
    { slug: 'berber', name: 'Berber', parentSlug: 'guzellik' },
    { slug: 'spa', name: 'Spa & Hamam', parentSlug: 'guzellik' },
    { slug: 'nail-art', name: 'Nail Art', parentSlug: 'guzellik' },

    // Eğitim
    { slug: 'ozel-okul', name: 'Özel Okul', parentSlug: 'egitim' },
    { slug: 'dershane', name: 'Dershane / Kurs', parentSlug: 'egitim' },
    { slug: 'dil-okulu', name: 'Dil Okulu', parentSlug: 'egitim' },
    { slug: 'kreş', name: 'Kreş', parentSlug: 'egitim' },
    { slug: 'universite', name: 'Üniversite', parentSlug: 'egitim' },

    // Yeme & İçme
    { slug: 'restoran', name: 'Restoran', parentSlug: 'yeme-icme' },
    { slug: 'kafe', name: 'Kafe', parentSlug: 'yeme-icme' },
    { slug: 'fast-food', name: 'Fast Food', parentSlug: 'yeme-icme' },
    { slug: 'pastane', name: 'Pastane', parentSlug: 'yeme-icme' },
    { slug: 'firincilik', name: 'Fırıncılık', parentSlug: 'yeme-icme' },

    // Konaklama
    { slug: 'otel', name: 'Otel', parentSlug: 'konaklama' },
    { slug: 'butik-otel', name: 'Butik Otel', parentSlug: 'konaklama' },
    { slug: 'pansiyon', name: 'Pansiyon', parentSlug: 'konaklama' },
    { slug: 'apart-otel', name: 'Apart Otel', parentSlug: 'konaklama' },

    // Gayrimenkul
    { slug: 'emlak-ofisi', name: 'Emlak Ofisi', parentSlug: 'gayrimenkul' },
    { slug: 'insaat-firmasi', name: 'İnşaat Firması', parentSlug: 'gayrimenkul' },
    { slug: 'mimarlik', name: 'Mimarlık Ofisi', parentSlug: 'gayrimenkul' },

    // Spor
    { slug: 'spor-salonu', name: 'Spor Salonu', parentSlug: 'spor' },
    { slug: 'pilates', name: 'Pilates / Yoga', parentSlug: 'spor' },
    { slug: 'yuzme-havuzu', name: 'Yüzme Havuzu', parentSlug: 'spor' },
  ];

  const subcategoryValues = subcategories
    .filter((sc) => categoryMap.has(sc.parentSlug))
    .map((sc) => ({
      slug: sc.slug,
      name: sc.name,
      parentId: categoryMap.get(sc.parentSlug)!,
      level: 1,
    }));

  if (subcategoryValues.length > 0) {
    console.log(`  📂 Inserting ${subcategoryValues.length} subcategories...`);
    await db
      .insert(businessCategories)
      .values(subcategoryValues)
      .onConflictDoNothing({ target: businessCategories.slug });
  }

  // ── 2. Data Sources ───────────────────────────
  console.log('  📡 Inserting data sources...');
  await db
    .insert(dataSources)
    .values([
      {
        provider: 'Overture Maps Foundation',
        name: 'Overture Places',
        sourceType: 'open',
        license: 'CDLA Permissive 2.0 / ODbL (varies by contributor)',
        termsUrl: 'https://docs.overturemaps.org/attribution/',
        storageAllowed: true,
        commercialUseAllowed: true,
        redistributionAllowed: true,
        attributionRequired: true,
        refreshFrequency: 'monthly',
        collectionMethod: 'download',
        active: true,
        notes: 'Global places dataset. Turkey records filtered by boundary. Attribution required per source.',
      },
      {
        provider: 'OpenStreetMap',
        name: 'OSM Turkey POI',
        sourceType: 'open',
        license: 'ODbL 1.0',
        termsUrl: 'https://www.openstreetmap.org/copyright',
        storageAllowed: true,
        commercialUseAllowed: true,
        redistributionAllowed: true,
        attributionRequired: true,
        refreshFrequency: 'weekly',
        collectionMethod: 'download',
        active: true,
        notes: 'ODbL requires share-alike for derivative databases. Attribution: © OpenStreetMap contributors.',
      },
      {
        provider: 'LeadTR',
        name: 'Website Enrichment',
        sourceType: 'crawl',
        license: 'internal',
        storageAllowed: true,
        commercialUseAllowed: true,
        redistributionAllowed: true,
        attributionRequired: false,
        refreshFrequency: 'monthly',
        collectionMethod: 'crawl',
        active: true,
        notes: 'Business website enrichment from publicly accessible corporate pages.',
      },
    ])
    .onConflictDoNothing();

  // ── 3. Plans ──────────────────────────────────
  console.log('  💳 Inserting subscription plans...');
  await db
    .insert(plans)
    .values([
      { name: 'Free', slug: 'free', monthlyCredits: 100, maxApiRequestsPerMinute: 10, maxExportsPerMonth: 1, priceMonthly: '0' },
      { name: 'Starter', slug: 'starter', monthlyCredits: 1000, maxApiRequestsPerMinute: 60, maxExportsPerMonth: 10, priceMonthly: '499' },
      { name: 'Pro', slug: 'pro', monthlyCredits: 10000, maxApiRequestsPerMinute: 300, maxExportsPerMonth: 50, priceMonthly: '2499' },
      { name: 'Agency', slug: 'agency', monthlyCredits: 50000, maxApiRequestsPerMinute: 1000, maxExportsPerMonth: 200, priceMonthly: '7500' },
      { name: 'Business', slug: 'business', monthlyCredits: 150000, maxApiRequestsPerMinute: 2000, maxExportsPerMonth: 500, priceMonthly: '15000' },
      { name: 'Enterprise', slug: 'enterprise', monthlyCredits: 0, maxApiRequestsPerMinute: 5000, maxExportsPerMonth: 0, priceMonthly: '0' },
    ])
    .onConflictDoNothing({ target: plans.slug });

  console.log('✅ Seed completed successfully');
  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
