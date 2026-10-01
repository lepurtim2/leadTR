import { Injectable, NotFoundException, Logger, Inject } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import { DuckDbService } from '../database/duckdb.service.js';
import type { SearchFiltersInput } from '@leadtr/validation';
import type { PaginatedResult, BusinessDTO, FieldProvenanceDTO, BusinessChangeLogDTO } from '@leadtr/types';

@Injectable()
export class BusinessesService {
  private readonly logger = new Logger(BusinessesService.name);
  private readonly supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://daqgvimsxarrkhagphvd.supabase.co';
  private readonly anonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRhcWd2aW1zeGFycmtoYWdwaHZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA3NzI1NDQsImV4cCI6MjEwNjM0ODU0NH0.Aof-8I2uQxUznwnU--bUHkwmuQhSOHheZxjZaW7KlT0';

  constructor(
    @Inject(DatabaseService) private readonly dbService: DatabaseService,
    @Inject(DuckDbService) private readonly duckDbService: DuckDbService,
  ) {
    if (this.dbService.isConnected) {
      this.logger.log('PostgreSQL direct connection active');
    }
  }

  private get headers(): Record<string, string> {
    return {
      apikey: this.anonKey,
      Authorization: `Bearer ${this.anonKey}`,
      'Content-Type': 'application/json',
    };
  }

  async search(params: SearchFiltersInput): Promise<PaginatedResult<BusinessDTO>> {
    if (this.duckDbService.hasData()) {
      return this.duckDbService.search(params);
    }

    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const offset = (page - 1) * limit;

    try {
      const url = new URL('/rest/v1/businesses', this.supabaseUrl);

      // Construct relation selectors
      const locSelect = params.province
        ? `locations:business_locations!inner(id,country,province,province_normalized,district,district_normalized,neighborhood,street,building_number,postal_code,formatted_address,latitude,longitude,confidence)`
        : `locations:business_locations(id,country,province,province_normalized,district,district_normalized,neighborhood,street,building_number,postal_code,formatted_address,latitude,longitude,confidence)`;

      const catSelect = params.categorySlug
        ? `category:business_categories!inner(id,name,slug,level)`
        : `category:business_categories(id,name,slug,level)`;

      const phoneSelect = params.hasPhone
        ? `phones:business_phones!inner(id,original_phone,normalized_phone,country_code,phone_type,is_primary,confidence)`
        : `phones:business_phones(id,original_phone,normalized_phone,country_code,phone_type,is_primary,confidence)`;

      const webSelect = params.hasWebsite
        ? `websites:business_websites!inner(id,original_url,canonical_url,domain,is_primary,http_status,https_available,confidence)`
        : `websites:business_websites(id,original_url,canonical_url,domain,is_primary,http_status,https_available,confidence)`;

      const emailSelect = params.hasEmail
        ? `emails:business_emails!inner(id,email,normalized_email,email_type,is_primary,confidence)`
        : `emails:business_emails(id,email,normalized_email,email_type,is_primary,confidence)`;

      url.searchParams.set(
        'select',
        `id,canonical_name,automated_description,business_status,category_id,source_count,identity_confidence,completeness_score,freshness_score,digital_presence_score,lead_score,first_seen_at,last_seen_at,last_verified_at,created_at,updated_at,${catSelect},${locSelect},${phoneSelect},${webSelect},${emailSelect}`
      );

      // Filters
      if (params.businessStatus && params.businessStatus !== 'all') {
        url.searchParams.set('business_status', `eq.${params.businessStatus}`);
      }

      if (params.query) {
        url.searchParams.set('canonical_name', `ilike.*${params.query.trim()}*`);
      }

      if (params.minLeadScore !== undefined && params.minLeadScore > 0) {
        url.searchParams.set('lead_score', `gte.${params.minLeadScore}`);
      }

      if (params.province) {
        url.searchParams.set('locations.province_normalized', `eq.${params.province.toLowerCase()}`);
      }

      if (params.categorySlug) {
        url.searchParams.set('category.slug', `eq.${params.categorySlug}`);
      }

      // Ordering
      const sortColumn =
        params.sortBy === 'name'
          ? 'canonical_name'
          : params.sortBy === 'createdAt'
            ? 'created_at'
            : 'lead_score';
      const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';
      url.searchParams.set('order', `${sortColumn}.${sortOrder}`);

      // Pagination
      url.searchParams.set('limit', String(limit));
      url.searchParams.set('offset', String(offset));

      console.log('SEARCH URL:', url.toString());
      const res = await fetch(url.toString(), {
        headers: {
          ...this.headers,
          Prefer: 'count=exact',
        },
      });
      console.log('SEARCH RES STATUS:', res.status);

      if (!res.ok) {
        const errText = await res.text();
        this.logger.error(`Supabase search error: ${res.status} - ${errText}`);
        return {
          data: [],
          total: 0,
          page,
          limit,
          totalPages: 0,
          hasMore: false,
        };
      }

      const contentRange = res.headers.get('content-range');
      let total = 0;
      if (contentRange) {
        const parts = contentRange.split('/');
        if (parts[1]) total = parseInt(parts[1], 10) || 0;
      }

      const rows: any[] = await res.json();
      const data: BusinessDTO[] = rows.map((b) => this.mapToDTO(b));
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
      this.logger.error('Error executing business search', err);
      throw err;
    }
  }

  async count(params: SearchFiltersInput): Promise<{ count: number }> {
    if (this.duckDbService.hasData()) {
      return this.duckDbService.count(params);
    }

    try {
      const url = new URL('/rest/v1/businesses', this.supabaseUrl);
      url.searchParams.set('select', 'id');

      if (params.businessStatus && params.businessStatus !== 'all') {
        url.searchParams.set('business_status', `eq.${params.businessStatus}`);
      }
      if (params.query) {
        url.searchParams.set('canonical_name', `ilike.*${params.query.trim()}*`);
      }
      if (params.minLeadScore !== undefined && params.minLeadScore > 0) {
        url.searchParams.set('lead_score', `gte.${params.minLeadScore}`);
      }

      url.searchParams.set('limit', '1');

      const res = await fetch(url.toString(), {
        headers: {
          ...this.headers,
          Prefer: 'count=exact',
        },
      });

      const contentRange = res.headers.get('content-range');
      let total = 0;
      if (contentRange) {
        const parts = contentRange.split('/');
        if (parts[1]) total = parseInt(parts[1], 10) || 0;
      }

      return { count: total };
    } catch (err) {
      this.logger.error('Error executing business count', err);
      return { count: 0 };
    }
  }

  async getById(id: string): Promise<BusinessDTO> {
    if (this.duckDbService.hasData()) {
      const biz = await this.duckDbService.getById(id);
      if (biz) return biz;
    }

    try {
      const url = new URL('/rest/v1/businesses', this.supabaseUrl);
      url.searchParams.set(
        'select',
        'id,canonical_name,automated_description,business_status,category_id,source_count,identity_confidence,completeness_score,freshness_score,digital_presence_score,lead_score,first_seen_at,last_seen_at,last_verified_at,created_at,updated_at,category:business_categories(*),locations:business_locations(*),phones:business_phones(*),websites:business_websites(*),emails:business_emails(*),socials:business_socials(*)'
      );
      url.searchParams.set('id', `eq.${id}`);
      url.searchParams.set('limit', '1');

      const res = await fetch(url.toString(), { headers: this.headers });
      if (!res.ok) {
        throw new NotFoundException(`Business with ID ${id} not found`);
      }

      const rows: any[] = await res.json();
      if (!rows || rows.length === 0) {
        throw new NotFoundException(`Business with ID ${id} not found`);
      }

      return this.mapToDTO(rows[0]);
    } catch (err) {
      if (err instanceof NotFoundException) throw err;
      this.logger.error(`Error fetching business ${id}`, err);
      throw new NotFoundException(`Business with ID ${id} not found`);
    }
  }

  async getProvenance(businessId: string): Promise<FieldProvenanceDTO[]> {
    try {
      const url = new URL('/rest/v1/field_provenance', this.supabaseUrl);
      url.searchParams.set('select', '*');
      url.searchParams.set('business_id', `eq.${businessId}`);

      const res = await fetch(url.toString(), { headers: this.headers });
      if (!res.ok) return [];

      const rows: any[] = await res.json();
      return rows.map((r) => ({
        id: r.id,
        fieldName: r.field_name,
        sourceName: 'OpenStreetMap (ODbL 1.0)',
        sourceProvider: r.source_id,
        observedAt: r.observed_at,
        confidence: r.confidence ? Number(r.confidence) : null,
      }));
    } catch (err) {
      this.logger.error(`Error fetching provenance for ${businessId}`, err);
      return [];
    }
  }

  async getChanges(businessId: string): Promise<BusinessChangeLogDTO[]> {
    try {
      const url = new URL('/rest/v1/business_changes', this.supabaseUrl);
      url.searchParams.set('select', '*');
      url.searchParams.set('business_id', `eq.${businessId}`);
      url.searchParams.set('order', 'observed_at.desc');

      const res = await fetch(url.toString(), { headers: this.headers });
      if (!res.ok) return [];

      const rows: any[] = await res.json();
      return rows.map((c) => ({
        id: c.id,
        fieldName: c.field_name,
        oldValue: c.old_value,
        newValue: c.new_value,
        changeType: c.change_type as 'added' | 'updated' | 'removed',
        observedAt: c.observed_at,
      }));
    } catch (err) {
      this.logger.error(`Error fetching changes for ${businessId}`, err);
      return [];
    }
  }

  private mapToDTO(b: any): BusinessDTO {
    return {
      id: b.id,
      canonicalName: b.canonical_name,
      automatedDescription: b.automated_description,
      businessStatus: b.business_status,
      categoryId: b.category_id,
      sourceCount: b.source_count,
      scores: {
        identityConfidence: b.identity_confidence ? Number(b.identity_confidence) : null,
        completenessScore: b.completeness_score ? Number(b.completeness_score) : null,
        freshnessScore: b.freshness_score ? Number(b.freshness_score) : null,
        digitalPresenceScore: b.digital_presence_score ? Number(b.digital_presence_score) : null,
        leadScore: b.lead_score ? Number(b.lead_score) : null,
      },
      firstSeenAt: b.first_seen_at,
      lastSeenAt: b.last_seen_at,
      lastVerifiedAt: b.last_verified_at ?? null,
      createdAt: b.created_at,
      updatedAt: b.updated_at,
      category: b.category
        ? {
            id: b.category.id,
            name: b.category.name,
            slug: b.category.slug,
            level: b.category.level ?? 0,
          }
        : undefined,
      locations: Array.isArray(b.locations)
        ? b.locations.map((loc: any) => ({
            id: loc.id,
            country: loc.country,
            province: loc.province,
            provinceNormalized: loc.province_normalized,
            district: loc.district,
            districtNormalized: loc.district_normalized,
            neighborhood: loc.neighborhood,
            street: loc.street,
            buildingNumber: loc.building_number,
            postalCode: loc.postal_code,
            formattedAddress: loc.formatted_address,
            latitude: loc.latitude ? Number(loc.latitude) : null,
            longitude: loc.longitude ? Number(loc.longitude) : null,
            confidence: loc.confidence ? Number(loc.confidence) : null,
          }))
        : [],
      phones: Array.isArray(b.phones)
        ? b.phones.map((p: any) => ({
            id: p.id,
            originalPhone: p.original_phone,
            normalizedPhone: p.normalized_phone,
            countryCode: p.country_code,
            phoneType: p.phone_type,
            isPrimary: p.is_primary,
            confidence: p.confidence ? Number(p.confidence) : null,
          }))
        : [],
      websites: Array.isArray(b.websites)
        ? b.websites.map((w: any) => ({
            id: w.id,
            originalUrl: w.original_url,
            canonicalUrl: w.canonical_url,
            domain: w.domain,
            isPrimary: w.is_primary,
            httpStatus: w.http_status,
            httpsAvailable: w.https_available,
            confidence: w.confidence ? Number(w.confidence) : null,
          }))
        : [],
      emails: Array.isArray(b.emails)
        ? b.emails.map((e: any) => ({
            id: e.id,
            email: e.email,
            normalizedEmail: e.normalized_email,
            emailType: e.email_type,
            isPrimary: e.is_primary,
            confidence: e.confidence ? Number(e.confidence) : null,
          }))
        : [],
      socials: Array.isArray(b.socials)
        ? b.socials.map((s: any) => ({
            id: s.id,
            platform: s.platform,
            url: s.url,
            normalizedHandle: s.normalized_handle,
            isPrimary: s.is_primary,
            confidence: s.confidence ? Number(s.confidence) : null,
          }))
        : [],
    };
  }
}
