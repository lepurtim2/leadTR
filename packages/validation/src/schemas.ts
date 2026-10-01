import { z } from 'zod';
import { isValidProvince } from './provinces.js';

// ── Search Filters Schema ───────────────────────────

export const searchFiltersSchema = z.object({
  query: z.string().max(200).optional(),
  categorySlug: z.string().max(100).optional(),
  province: z
    .string()
    .max(50)
    .refine((val) => !val || isValidProvince(val), {
      message: 'Invalid Turkish province',
    })
    .optional(),
  district: z.string().max(100).optional(),
  minLeadScore: z.coerce.number().min(0).max(100).optional(),
  minCompleteness: z.coerce.number().min(0).max(100).optional(),
  hasPhone: z.coerce.boolean().optional(),
  hasEmail: z.coerce.boolean().optional(),
  hasWebsite: z.coerce.boolean().optional(),
  hasNoWebsite: z.coerce.boolean().optional(),
  hasWhatsApp: z.coerce.boolean().optional(),
  onlyMobilePhone: z.coerce.boolean().optional(),
  urgentLeadOnly: z.coerce.boolean().optional(),
  hasSocial: z.coerce.boolean().optional(),
  hasInstagram: z.coerce.boolean().optional(),
  businessStatus: z.enum(['active', 'closed', 'unknown', 'all']).default('active'),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0.5).max(500).optional(),
  sortBy: z.enum(['leadScore', 'freshnessScore', 'name', 'createdAt', 'distance']).default('leadScore'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(2500).default(20),
});

export type SearchFiltersInput = z.infer<typeof searchFiltersSchema>;

// ── Business Details Schema ─────────────────────────

export const businessPhoneSchema = z.object({
  phone: z.string().min(5).max(30),
  isPrimary: z.boolean().default(false),
});

export const businessEmailSchema = z.object({
  email: z.string().email(),
  isPrimary: z.boolean().default(false),
});

export const businessWebsiteSchema = z.object({
  url: z.string().url(),
  isPrimary: z.boolean().default(false),
});

export const businessSocialSchema = z.object({
  platform: z.enum(['instagram', 'facebook', 'linkedin', 'youtube', 'tiktok', 'x']),
  url: z.string().url(),
  isPrimary: z.boolean().default(true),
});

// ── Export Request Schema ───────────────────────────

export const createExportSchema = z.object({
  filters: searchFiltersSchema,
  columns: z.array(z.string()).optional(),
  format: z.enum(['csv', 'xlsx', 'jsonl', 'parquet']).default('csv'),
  maxRecords: z.number().int().min(1).max(50000).default(1000),
});

export type CreateExportInput = z.infer<typeof createExportSchema>;

// ── API Key Management Schema ───────────────────────

export const createApiKeySchema = z.object({
  name: z.string().min(2).max(100),
  expiresInDays: z.number().int().min(1).max(365).optional(),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>;

// ── Suppression Request Schema (KVKK) ───────────────

export const createSuppressionSchema = z.object({
  entityType: z.enum(['phone', 'email', 'business']),
  entityValue: z.string().min(3).max(255),
  reason: z.string().max(500).optional(),
  requestedBy: z.string().max(255).optional(),
});

export type CreateSuppressionInput = z.infer<typeof createSuppressionSchema>;
