/**
 * LeadTR — Core Shared TypeScript Types
 */

// ── Geographic & Address ────────────────────────────

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface BusinessLocationDTO {
  id: string;
  country: string;
  province?: string | null;
  provinceNormalized?: string | null;
  district?: string | null;
  districtNormalized?: string | null;
  neighborhood?: string | null;
  street?: string | null;
  buildingNumber?: string | null;
  postalCode?: string | null;
  formattedAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  confidence?: number | null;
}

// ── Contact & Details ───────────────────────────────

export interface BusinessPhoneDTO {
  id: string;
  originalPhone: string;
  normalizedPhone?: string | null;
  countryCode?: string | null;
  phoneType?: 'landline' | 'mobile' | 'unknown' | string | null;
  isPrimary: boolean;
  confidence?: number | null;
}

export interface BusinessEmailDTO {
  id: string;
  email: string;
  normalizedEmail: string;
  emailType?: 'public_business' | 'role_based' | 'personal' | 'unknown' | string | null;
  isPrimary: boolean;
  confidence?: number | null;
}

export interface BusinessWebsiteDTO {
  id: string;
  originalUrl: string;
  canonicalUrl?: string | null;
  domain?: string | null;
  isPrimary: boolean;
  httpStatus?: string | null;
  httpsAvailable?: boolean | null;
  lastCheckedAt?: string | null;
  confidence?: number | null;
}

export interface BusinessSocialDTO {
  id: string;
  platform: 'instagram' | 'facebook' | 'linkedin' | 'youtube' | 'tiktok' | 'x' | string;
  url: string;
  normalizedHandle?: string | null;
  isPrimary: boolean;
  confidence?: number | null;
}

export interface BusinessCategoryDTO {
  id: string;
  slug: string;
  name: string;
  level: number;
  parentId?: string | null;
}

// ── Canonical Business Entity ───────────────────────

export interface BusinessScores {
  identityConfidence?: number | null;
  completenessScore?: number | null;
  freshnessScore?: number | null;
  digitalPresenceScore?: number | null;
  leadScore?: number | null;
}

export interface BusinessDTO {
  id: string;
  canonicalName: string;
  automatedDescription?: string | null;
  businessStatus: 'active' | 'closed' | 'unknown' | string;
  categoryId?: string | null;
  category?: BusinessCategoryDTO | null;
  sourceCount: number;
  scores: BusinessScores;
  firstSeenAt: string;
  lastSeenAt: string;
  lastVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  locations?: BusinessLocationDTO[];
  phones?: BusinessPhoneDTO[];
  emails?: BusinessEmailDTO[];
  websites?: BusinessWebsiteDTO[];
  socials?: BusinessSocialDTO[];
}

// ── Search & Filter Types ───────────────────────────

export interface SearchFilters {
  query?: string;
  categorySlug?: string;
  province?: string;
  district?: string;
  minLeadScore?: number;
  minCompleteness?: number;
  hasPhone?: boolean;
  hasEmail?: boolean;
  hasWebsite?: boolean;
  hasSocial?: boolean;
  hasInstagram?: boolean;
  businessStatus?: string;
  geoNear?: {
    latitude: number;
    longitude: number;
    radiusKm: number;
  };
  sortBy?: 'leadScore' | 'freshnessScore' | 'name' | 'createdAt' | 'distance';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

export interface FacetCount {
  value: string;
  count: number;
}

export interface SearchFacets {
  provinces: FacetCount[];
  categories: FacetCount[];
  statuses: FacetCount[];
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  facets?: SearchFacets;
}

// ── Provenance & Data Quality ───────────────────────

export interface FieldProvenanceDTO {
  id: string;
  fieldName: string;
  sourceName: string;
  sourceProvider: string;
  observedAt: string;
  confidence?: number | null;
}

export interface BusinessChangeLogDTO {
  id: string;
  fieldName: string;
  oldValue?: string | null;
  newValue?: string | null;
  changeType: 'added' | 'updated' | 'removed';
  observedAt: string;
}

// ── Customer & Organization ─────────────────────────

export interface PlanDTO {
  id: string;
  name: string;
  slug: string;
  monthlyCredits: number;
  maxApiRequestsPerMinute: number;
  maxExportsPerMonth: number;
  priceMonthly?: string | null;
  active: boolean;
}

export interface UserDTO {
  id: string;
  email: string;
  fullName?: string | null;
  role: 'admin' | 'member';
  active: boolean;
}

export interface OrganizationDTO {
  id: string;
  name: string;
  slug: string;
  planId?: string | null;
  plan?: PlanDTO | null;
  creditBalance: number;
  active: boolean;
}

export interface ExportJobDTO {
  id: string;
  organizationId: string;
  format: 'csv' | 'xlsx' | 'jsonl' | 'parquet';
  recordCount?: number | null;
  creditsCost?: number | null;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'expired';
  fileUrl?: string | null;
  createdAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
}

// ── API Standard Responses ──────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  meta?: {
    requestId?: string;
    timestamp: string;
    durationMs?: number;
  };
}
