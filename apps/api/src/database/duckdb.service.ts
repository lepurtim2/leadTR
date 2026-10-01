import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import duckdbPkg from 'duckdb';
import * as path from 'path';
import * as fs from 'fs';
import type { SearchFiltersInput } from '@leadtr/validation';
import type { PaginatedResult, BusinessDTO } from '@leadtr/types';

const duckdbModule = (duckdbPkg as any).default || duckdbPkg;

@Injectable()
export class DuckDbService implements OnModuleInit {
  private readonly logger = new Logger(DuckDbService.name);
  private db!: any;
  private isInitialized = false;

  onModuleInit() {
    this.initDatabase();
  }

  private initDatabase() {
    try {
      this.db = new duckdbModule.Database(':memory:');
      this.isInitialized = true;
      this.query('PRAGMA enable_object_cache=false;').catch(() => {});
      this.logger.log('🚀 DuckDB in-memory high-speed analytical engine initialized successfully (Zero File-Lock Mode).');
    } catch (err) {
      this.logger.error('Failed to initialize DuckDB instance', err);
    }
  }

  public getParquetPattern(): string | null {
    const candidates = [
      path.resolve(process.cwd(), '../../data/parquets/*.parquet'),
      path.resolve(process.cwd(), '../data/parquets/*.parquet'),
      path.resolve(process.cwd(), 'data/parquets/*.parquet'),
      'C:/Users/Administrator/Desktop/Personal/data/leadTR/data/parquets/*.parquet',
    ];

    for (const c of candidates) {
      const dir = path.dirname(c);
      if (fs.existsSync(dir)) {
        try {
          const files = fs.readdirSync(dir).filter((f) => f.endsWith('.parquet') && !f.endsWith('.tmp'));
          if (files.length > 0) {
            return path.join(dir, '*.parquet').replace(/\\/g, '/');
          }
        } catch {
          // continue
        }
      }
    }
    return null;
  }

  public hasData(): boolean {
    return this.getParquetPattern() !== null;
  }

  private query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.isInitialized || !this.db) {
        return reject(new Error('DuckDB not initialized'));
      }
      (this.db as any).all(sql, ...params, (err: any, rows: any) => {
        if (err) reject(err);
        else resolve((rows || []) as T[]);
      });
    });
  }

  async count(filters: SearchFiltersInput): Promise<{ count: number }> {
    const pattern = this.getParquetPattern();
    if (!pattern) {
      return { count: 0 };
    }

    try {
      const { whereClause, params } = this.buildWhereClause(filters);
      const sql = `SELECT count(*) as total FROM '${pattern}' ${whereClause};`;
      const res = await this.query<{ total: number | bigint }>(sql, params);
      const total = res[0]?.total ? Number(res[0].total) : 0;
      return { count: total };
    } catch (err) {
      this.logger.error('DuckDB count query failed', err);
      return { count: 0 };
    }
  }

  async search(filters: SearchFiltersInput): Promise<PaginatedResult<BusinessDTO>> {
    const page = filters.page ?? 1;
    const limit = filters.limit ?? 20;
    const offset = (page - 1) * limit;

    const pattern = this.getParquetPattern();
    if (!pattern) {
      return {
        data: [],
        total: 0,
        page,
        limit,
        totalPages: 0,
        hasMore: false,
      };
    }

    try {
      const { whereClause, params } = this.buildWhereClause(filters);

      // 1. Get total count
      const countSql = `SELECT count(*) as total FROM '${pattern}' ${whereClause};`;
      const countRes = await this.query<{ total: number | bigint }>(countSql, params);
      const total = countRes[0]?.total ? Number(countRes[0].total) : 0;

      // 2. Ordering
      let orderColumn = 'lead_score';
      if (filters.sortBy === 'name') orderColumn = 'canonical_name';
      else if (filters.sortBy === 'createdAt') orderColumn = 'created_at';
      else if (filters.sortBy === 'freshnessScore') orderColumn = 'freshness_score';

      const orderDir = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';

      // 3. Select paginated records
      const selectSql = `
        SELECT *
        FROM '${pattern}'
        ${whereClause}
        ORDER BY ${orderColumn} ${orderDir}
        LIMIT ? OFFSET ?;
      `;

      const rows = await this.query(selectSql, [...params, limit, offset]);
      const data = rows.map((r) => this.mapToDTO(r));
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        total,
        page,
        limit,
        totalPages,
        hasMore: page < totalPages,
      };
    } catch (err) {
      this.logger.error('DuckDB search query failed', err);
      throw err;
    }
  }

  async getById(id: string): Promise<BusinessDTO | null> {
    const pattern = this.getParquetPattern();
    if (!pattern) return null;

    try {
      const sql = `SELECT * FROM '${pattern}' WHERE id = ? LIMIT 1;`;
      const rows = await this.query(sql, [id]);
      if (!rows || rows.length === 0) return null;
      return this.mapToDTO(rows[0]);
    } catch (err) {
      this.logger.error(`DuckDB getById failed for id=${id}`, err);
      return null;
    }
  }

  private buildWhereClause(filters: SearchFiltersInput): { whereClause: string; params: any[] } {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (filters.businessStatus && filters.businessStatus !== 'all') {
      // In our verified Parquet dataset, all commercial entities are active.
      if (filters.businessStatus !== 'active') {
        conditions.push('1=0');
      }
    }

    if (filters.query && filters.query.trim()) {
      const rawQuery = filters.query.trim();
      const rawTokens = rawQuery
        .toLowerCase()
        .split(/\s+/)
        .map((t) => t.trim())
        .filter((t) => t.length >= 2 && !['ve', 'ile', 'veya', 'bir', 'için', 'icin'].includes(t));

      if (rawTokens.length > 1) {
        // Multi-word smart search: match each word across name, category, district, and address
        const tokenConditions: string[] = [];
        for (const rawToken of rawTokens) {
          let token = rawToken;
          if (token.endsWith('ajansı') || token.endsWith('ajansi')) {
            token = 'ajans';
          } else if (token.endsWith('klinikleri') || token.endsWith('klinigi') || token.endsWith('kliniği')) {
            token = 'klinik';
          } else if (token.endsWith('doktoru') || token.endsWith('hekimi')) {
            token = token.slice(0, -1);
          }

          const normToken = token
            .replace(/ı/g, 'i')
            .replace(/ğ/g, 'g')
            .replace(/ü/g, 'u')
            .replace(/ş/g, 's')
            .replace(/ö/g, 'o')
            .replace(/ç/g, 'c');

          tokenConditions.push(`(
            lower(canonical_name) LIKE ?
            OR lower(category_name) LIKE ?
            OR lower(district) LIKE ?
            OR lower(district_normalized) LIKE ?
            OR lower(province) LIKE ?
            OR lower(formatted_address) LIKE ?
            OR lower(automated_description) LIKE ?
            OR replace(replace(replace(replace(replace(replace(lower(canonical_name), 'ı', 'i'), 'ğ', 'g'), 'ü', 'u'), 'ş', 's'), 'ö', 'o'), 'ç', 'c') LIKE ?
            OR replace(replace(replace(replace(replace(replace(lower(formatted_address), 'ı', 'i'), 'ğ', 'g'), 'ü', 'u'), 'ş', 's'), 'ö', 'o'), 'ç', 'c') LIKE ?
          )`);
          params.push(
            `%${token}%`,
            `%${token}%`,
            `%${token}%`,
            `%${normToken}%`,
            `%${token}%`,
            `%${token}%`,
            `%${token}%`,
            `%${normToken}%`,
            `%${normToken}%`
          );
        }
        conditions.push(`(${tokenConditions.join(' AND ')})`);
      } else {
        const normQ = rawQuery
          .toLowerCase()
          .replace(/ı/g, 'i')
          .replace(/ğ/g, 'g')
          .replace(/ü/g, 'u')
          .replace(/ş/g, 's')
          .replace(/ö/g, 'o')
          .replace(/ç/g, 'c');

        conditions.push(`(
          lower(canonical_name) LIKE ?
          OR lower(category_name) LIKE ?
          OR lower(district) LIKE ?
          OR lower(formatted_address) LIKE ?
          OR lower(automated_description) LIKE ?
          OR replace(replace(replace(replace(replace(replace(lower(canonical_name), 'ı', 'i'), 'ğ', 'g'), 'ü', 'u'), 'ş', 's'), 'ö', 'o'), 'ç', 'c') LIKE ?
          OR replace(replace(replace(replace(replace(replace(lower(formatted_address), 'ı', 'i'), 'ğ', 'g'), 'ü', 'u'), 'ş', 's'), 'ö', 'o'), 'ç', 'c') LIKE ?
        )`);
        params.push(
          `%${rawQuery.toLowerCase()}%`,
          `%${rawQuery.toLowerCase()}%`,
          `%${rawQuery.toLowerCase()}%`,
          `%${rawQuery.toLowerCase()}%`,
          `%${rawQuery.toLowerCase()}%`,
          `%${normQ}%`,
          `%${normQ}%`
        );
      }
    }

    if (filters.province && filters.province.trim()) {
      const prov = filters.province.trim().toLowerCase();
      if (prov === 'istanbul') {
        conditions.push(`(
          lower(province_normalized) = 'istanbul' 
          OR lower(province) LIKE '%istanbul%'
          OR (lower(province_normalized) = 'turkiye' AND latitude BETWEEN 40.80 AND 41.35 AND longitude BETWEEN 28.00 AND 29.85)
        )`);
      } else if (prov === 'ankara') {
        conditions.push(`(
          lower(province_normalized) = 'ankara' 
          OR lower(province) LIKE '%ankara%'
          OR (lower(province_normalized) = 'turkiye' AND latitude BETWEEN 39.50 AND 40.25 AND longitude BETWEEN 32.30 AND 33.20)
        )`);
      } else if (prov === 'izmir') {
        conditions.push(`(
          lower(province_normalized) = 'izmir' 
          OR lower(province) LIKE '%izmir%'
          OR (lower(province_normalized) = 'turkiye' AND latitude BETWEEN 38.10 AND 38.70 AND longitude BETWEEN 26.80 AND 27.40)
        )`);
      } else {
        conditions.push('(lower(province_normalized) = ? OR lower(province) LIKE ?)');
        params.push(prov, `%${prov}%`);
      }
    }

    if (filters.district && filters.district.trim()) {
      const rawDist = filters.district.trim().toLowerCase();
      const normDist = rawDist
        .replace(/ı/g, 'i')
        .replace(/ğ/g, 'g')
        .replace(/ü/g, 'u')
        .replace(/ş/g, 's')
        .replace(/ö/g, 'o')
        .replace(/ç/g, 'c');
      conditions.push(`(
        lower(district_normalized) LIKE ? 
        OR replace(replace(replace(replace(replace(replace(lower(district), 'ı', 'i'), 'ğ', 'g'), 'ü', 'u'), 'ş', 's'), 'ö', 'o'), 'ç', 'c') LIKE ?
        OR lower(district) LIKE ?
        OR lower(formatted_address) LIKE ?
        OR replace(replace(replace(replace(replace(replace(lower(formatted_address), 'ı', 'i'), 'ğ', 'g'), 'ü', 'u'), 'ş', 's'), 'ö', 'o'), 'ç', 'c') LIKE ?
      )`);
      params.push(`%${normDist}%`, `%${normDist}%`, `%${rawDist}%`, `%${rawDist}%`, `%${normDist}%`);
    }

    if (filters.categorySlug && filters.categorySlug.trim()) {
      const cat = filters.categorySlug.trim().toLowerCase();
      
      const categoryRules: Record<string, string[]> = {
        'hukuk-burosu': ['%hukuk%', '%avukat%', '%baro%', '%danışmanlık%'],
        'avukat': ['%hukuk%', '%avukat%'],
        'noter': ['%noter%'],
        'finans': ['%banka%', '%ziraat%', '%garanti%', '%iş bankası%', '%vakıfbank%', '%yapı kredi%', '%akbank%', '%halkbank%', '%qnb%', '%denizbank%', '%teb%'],
        'banka': ['%banka%', '%ziraat%', '%garanti%', '%iş bankası%', '%vakıfbank%', '%yapı kredi%', '%akbank%', '%halkbank%'],
        'dis-klinigi': ['%diş%', '%dent%'],
        'dis-hekimi': ['%diş%', '%dent%'],
        'hastane': ['%hastane%', '%hospital%', '%tıp fakültesi%'],
        'eczane': ['%eczane%', '%pharmacy%'],
        'klinik': ['%klinik%', '%tıp merkezi%', '%poliklinik%'],
        'otel': ['%otel%', '%hotel%', '%pansiyon%', '%konaklama%', '%resort%'],
        'restoran': ['%restoran%', '%restaurant%', '%lokanta%', '%kebap%', '%döner%', '%pide%', '%köfte%'],
        'kafe': ['%kafe%', '%cafe%', '%kahve%', '%coffee%'],
        'emlak-ofisi': ['%emlak%', '%gayrimenkul%', '%real estate%', '%remax%', '%turyap%', '%coldwell%'],
        'sigorta': ['%sigorta%', '%acente%'],
        'oto-servis': ['%oto servis%', '%oto tamir%', '%oto bakım%', '%lastik%', '%egzoz%', '%kaporta%'],
        'oto-yikama': ['%oto yıkama%', '%car wash%', '%oto kuaför%'],
        'kuafor': ['%kuaför%', '%berber%', '%barber%', '%saç tasarım%'],
        'guzellik-merkezi': ['%güzellik%', '%estetik%', '%lazer%', '%epilasyon%', '%nail%'],
        'spor-salonu': ['%spor salonu%', '%fitness%', '%gym%', '%pilates%', '%crossfit%'],
        'veteriner': ['%veteriner%', '% vet %', '%vet.%', '%vet klinik%', '%hayvan hastanesi%'],
        'muhasebe': ['%muhasebe%', '%mali müşavir%', '%smmm%'],
        'kuyumcu': ['%kuyumcu%', '%mücevher%', '%sarraf%', '%jewel%'],
        'optik': ['%optik%', '%gözlük%'],
        'firincilik': ['%fırın%', '%pastane%', '%unlu mamül%', '%börek%', '%simit%'],
        'nalburiye': ['%nalbur%', '%nalburiye%', '%hırdavat%', '%yapı market%'],
        'kargo': ['%kargo%', '%lojistik%', '%aras%', '%yurtiçi%', '%mng%', '%ptt%', '%sürat%'],
        'akaryakit': ['%petrol%', '%opet%', '%shell%', '%bp%', '%petrol ofisi%', '%akaryakıt%'],
        'supermarket': ['%market%', '%süpermarket%', '%bakkal%', '%migros%', '%bim%', '%a101%', '%şok%'],
      };

      if (categoryRules[cat]) {
        const likes = categoryRules[cat].map(() => 'lower(canonical_name) LIKE ?').join(' OR ');
        conditions.push(`(category_slug = ? OR ${likes})`);
        params.push(cat, ...categoryRules[cat]);
      } else {
        conditions.push('category_slug = ?');
        params.push(cat);
      }
    }

    if (filters.minLeadScore !== undefined && filters.minLeadScore > 0) {
      conditions.push('lead_score >= ?');
      params.push(filters.minLeadScore);
    }

    if (filters.minCompleteness !== undefined && filters.minCompleteness > 0) {
      conditions.push('completeness_score >= ?');
      params.push(filters.minCompleteness);
    }

    if (filters.hasPhone) {
      conditions.push("phone IS NOT NULL AND phone != ''");
    }

    if (filters.onlyMobilePhone || filters.hasWhatsApp) {
      conditions.push(`(
        phone_type = 'mobile'
        OR phone LIKE '+905%'
        OR phone LIKE '905%'
        OR phone LIKE '05%'
        OR phone LIKE '5%'
      )`);
    }

    if (filters.urgentLeadOnly) {
      conditions.push(`(
        phone IS NOT NULL AND phone != ''
        AND (website IS NULL OR website = '')
      )`);
    }

    if (filters.hasWebsite) {
      conditions.push("website IS NOT NULL AND website != ''");
    }

    if (filters.hasNoWebsite) {
      conditions.push("(website IS NULL OR website = '')");
    }

    if (filters.hasEmail) {
      conditions.push("email IS NOT NULL AND email != ''");
    }

    return {
      whereClause: `WHERE ${conditions.join(' AND ')}`,
      params,
    };
  }

  private enrichmentsCache: Record<string, any> = {};
  private enrichmentsLastLoaded: number = 0;

  public updateEnrichmentInMemory(businessId: string, record: any) {
    this.enrichmentsCache[businessId] = record;
    this.enrichmentsLastLoaded = Date.now();
  }

  private getEnrichment(businessId: string): any | null {
    const now = Date.now();
    if (now - this.enrichmentsLastLoaded > 1500) {
      try {
        const p = path.resolve(process.cwd(), 'data', 'enrichments.json');
        if (fs.existsSync(p)) {
          const raw = fs.readFileSync(p, 'utf-8');
          this.enrichmentsCache = JSON.parse(raw);
          this.enrichmentsLastLoaded = now;
        } else {
          this.enrichmentsCache = {};
        }
      } catch {
        // preserve cache
      }
    }
    return this.enrichmentsCache[businessId] || null;
  }

  private mapToDTO(row: any): BusinessDTO {
    const enrichment = this.getEnrichment(row.id);

    const phones: any[] = row.phone
      ? [
          {
            id: `${row.id}-ph`,
            originalPhone: row.phone,
            normalizedPhone: row.normalized_phone || row.phone,
            countryCode: '+90',
            phoneType: row.phone_type || 'landline',
            isPrimary: true,
            confidence: 95,
          },
        ]
      : [];

    const emails: any[] = row.email
      ? [
          {
            id: `${row.id}-em`,
            email: row.email,
            normalizedEmail: row.email.toLowerCase(),
            emailType: 'public_business',
            isPrimary: true,
            confidence: 90,
          },
        ]
      : [];

    const socials: any[] = [];

    // Merge Enriched Web & Social Intelligence if available
    if (enrichment) {
      if (enrichment.emails && Array.isArray(enrichment.emails)) {
        for (const e of enrichment.emails) {
          if (!emails.some((x) => x.email.toLowerCase() === e.toLowerCase())) {
            emails.push({
              id: `${row.id}-enr-em-${emails.length}`,
              email: e,
              normalizedEmail: e.toLowerCase(),
              emailType: 'public_business',
              isPrimary: emails.length === 0,
              confidence: 95,
            });
          }
        }
      }

      if (enrichment.socials && Array.isArray(enrichment.socials)) {
        for (const s of enrichment.socials) {
          socials.push({
            id: `${row.id}-soc-${s.platform}`,
            platform: s.platform,
            url: s.url,
            normalizedHandle: s.handle,
            isPrimary: true,
            confidence: 95,
          });
        }
      }

      if (enrichment.phones && Array.isArray(enrichment.phones)) {
        for (const p of enrichment.phones) {
          const cleanP = p.replace(/\D/g, '');
          if (!phones.some((x) => x.normalizedPhone?.replace(/\D/g, '') === cleanP)) {
            phones.push({
              id: `${row.id}-enr-ph-${phones.length}`,
              originalPhone: p,
              normalizedPhone: p,
              countryCode: '+90',
              phoneType: 'mobile',
              isPrimary: false,
              confidence: 90,
            });
          }
        }
      }
    }

    const digitalPresenceScore = Math.min(
      100,
      (row.digital_presence_score !== undefined ? Number(row.digital_presence_score) : 70) +
        (socials.length > 0 ? 15 : 0) +
        (emails.length > 0 ? 10 : 0)
    );
    const leadScore = Math.min(
      100,
      (row.lead_score !== undefined ? Number(row.lead_score) : 75) +
        (emails.length > 0 ? 5 : 0) +
        (socials.length > 0 ? 5 : 0)
    );

    const hasPhone = phones.length > 0;
    const hasWeb = !!row.website;
    const hasEmail = emails.length > 0;

    let opportunityScore = 50;
    let opportunityReason = 'Orta Seviye Potansiyel';

    if (hasPhone && !hasWeb) {
      opportunityScore = 95;
      opportunityReason = '🔥 Acil Satış (Web Sitesi Yok, Telefonu Doğrulanmış)';
    } else if (hasPhone && hasWeb && !hasEmail) {
      opportunityScore = 75;
      opportunityReason = '⚡ Gelişime Açık (Web Sitesi Var, Doğrudan E-posta/Kanal Eksik)';
    } else if (hasPhone && hasWeb && hasEmail) {
      opportunityScore = 40;
      opportunityReason = '🔒 Dijitalleşmiş İşletme (Tam Profil)';
    } else if (!hasPhone && !hasWeb) {
      opportunityScore = 20;
      opportunityReason = 'Düşük İletişim Skoru';
    }

    return {
      id: row.id,
      canonicalName: row.canonical_name,
      automatedDescription: row.automated_description,
      opportunityScore,
      opportunityReason,
      businessStatus: row.business_status || 'active',
      categoryId: row.category_slug,
      sourceCount: 1,
      scores: {
        identityConfidence: row.identity_confidence !== undefined ? Number(row.identity_confidence) : 95,
        completenessScore: row.completeness_score !== undefined ? Number(row.completeness_score) : 80,
        freshnessScore: row.freshness_score !== undefined ? Number(row.freshness_score) : 90,
        digitalPresenceScore,
        leadScore,
        opportunityScore,
        opportunityReason,
      },
      firstSeenAt: row.created_at || new Date().toISOString(),
      lastSeenAt: row.created_at || new Date().toISOString(),
      lastVerifiedAt: row.created_at || new Date().toISOString(),
      createdAt: row.created_at || new Date().toISOString(),
      updatedAt: row.created_at || new Date().toISOString(),
      category: {
        id: row.category_slug,
        name: row.category_name,
        slug: row.category_slug,
        level: 1,
      },
      locations: [
        {
          id: `${row.id}-loc`,
          country: 'TR',
          province: row.province,
          provinceNormalized: row.province_normalized,
          district: row.district,
          districtNormalized: row.district_normalized,
          formattedAddress: row.formatted_address,
          latitude: row.latitude ? Number(row.latitude) : null,
          longitude: row.longitude ? Number(row.longitude) : null,
          confidence: 95,
        },
      ],
      phones,
      websites: row.website
        ? [
            {
              id: `${row.id}-web`,
              originalUrl: row.website,
              canonicalUrl: row.website,
              domain: row.domain,
              isPrimary: true,
              confidence: 95,
            },
          ]
        : [],
      emails,
      socials,
    };
  }

  async exportCsv(filters: SearchFiltersInput, maxRecords: number = 1000): Promise<string> {
    const pattern = this.getParquetPattern();
    if (!pattern) return '';

    const limit = Math.min(Math.max(1, maxRecords), 50000);
    const { whereClause, params } = this.buildWhereClause(filters);

    let orderColumn = 'lead_score';
    if (filters.sortBy === 'name') orderColumn = 'canonical_name';
    else if (filters.sortBy === 'createdAt') orderColumn = 'created_at';
    else if (filters.sortBy === 'freshnessScore') orderColumn = 'freshness_score';
    const orderDir = filters.sortOrder === 'asc' ? 'ASC' : 'DESC';

    const sql = `
      SELECT 
        id,
        canonical_name,
        category_name,
        province,
        district,
        formatted_address,
        normalized_phone,
        phone,
        website,
        domain,
        email,
        lead_score,
        completeness_score,
        digital_presence_score,
        latitude,
        longitude,
        source_name
      FROM '${pattern}'
      ${whereClause}
      ORDER BY ${orderColumn} ${orderDir}
      LIMIT ?;
    `;

    const rows = await this.query(sql, [...params, limit]);

    // UTF-8 BOM for flawless Excel character rendering
    const headers = [
      'Firma Adı',
      'Kategori',
      'İl',
      'İlçe',
      'Açık Adres',
      'Telefon',
      'WhatsApp Linki',
      'Fırsat / İhtiyaç Durumu',
      'Web Sitesi',
      'Domain',
      'E-Posta',
      'Instagram',
      'LinkedIn',
      'Facebook',
      'Lead Skoru',
      'Doluluk Skoru',
      'Dijital Varlık Skoru',
      'Enlem',
      'Boylam',
      'Veri Kaynağı',
    ];

    const escapeCsv = (val: any) => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const csvLines: string[] = [];
    csvLines.push(headers.map(escapeCsv).join(','));

    for (const r of rows) {
      const enrichment = this.getEnrichment(r.id);
      const email = enrichment?.emails?.[0] || r.email || '';
      const instagram = enrichment?.socials?.find((s: any) => s.platform === 'instagram')?.url || '';
      const linkedin = enrichment?.socials?.find((s: any) => s.platform === 'linkedin')?.url || '';
      const facebook = enrichment?.socials?.find((s: any) => s.platform === 'facebook')?.url || '';

      const rawPhone = r.normalized_phone || r.phone || '';
      const cleanDigits = rawPhone.replace(/\D/g, '');
      const isMobile = cleanDigits.startsWith('905') || cleanDigits.startsWith('05') || (cleanDigits.length === 10 && cleanDigits.startsWith('5')) || r.phone_type === 'mobile';
      let waLink = '';
      if (isMobile && cleanDigits.length >= 10) {
        let waNum = cleanDigits;
        if (waNum.startsWith('0')) waNum = '9' + waNum;
        else if (!waNum.startsWith('90')) waNum = '90' + waNum;
        waLink = `https://wa.me/${waNum}`;
      }

      let oppReason = 'Orta Seviye';
      if (rawPhone && !r.website) oppReason = '🔥 Acil Satış (Web Sitesi Yok)';
      else if (rawPhone && r.website && !email) oppReason = '⚡ Gelişime Açık (E-Posta Eksik)';
      else if (rawPhone && r.website && email) oppReason = '🔒 Dijitalleşmiş';

      csvLines.push(
        [
          r.canonical_name,
          r.category_name || 'Genel Ticari',
          r.province || '',
          r.district || '',
          r.formatted_address || '',
          rawPhone,
          waLink,
          oppReason,
          r.website || '',
          r.domain || '',
          email,
          instagram,
          linkedin,
          facebook,
          r.lead_score ?? '',
          r.completeness_score ?? '',
          r.digital_presence_score ?? '',
          r.latitude ?? '',
          r.longitude ?? '',
          r.source_name || 'Overture Maps Foundation',
        ]
          .map(escapeCsv)
          .join(',')
      );
    }

    return '\uFEFF' + csvLines.join('\r\n');
  }
}
