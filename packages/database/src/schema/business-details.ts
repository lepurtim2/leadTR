import { pgTable, uuid, text, boolean, timestamp, numeric, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { businesses } from './businesses.js';
import { dataSources } from './sources.js';

// ─────────────────────────────────────────────
// business_names — preserves original + normalized names
// Original value is NEVER destroyed per PROJECT.md §11
// ─────────────────────────────────────────────
export const businessNames = pgTable('business_names', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  normalizedName: text('normalized_name').notNull(), // Turkish chars → ASCII, lowercase, stripped
  language: text('language').default('tr'),
  isPrimary: boolean('is_primary').notNull().default(false),
  sourceId: uuid('source_id').references(() => dataSources.id),
  sourceRecordId: text('source_record_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_names_business').on(table.businessId),
  index('idx_names_normalized').on(table.normalizedName),
]);

export const businessNamesRelations = relations(businessNames, ({ one }) => ({
  business: one(businesses, {
    fields: [businessNames.businessId],
    references: [businesses.id],
  }),
  source: one(dataSources, {
    fields: [businessNames.sourceId],
    references: [dataSources.id],
  }),
}));

// ─────────────────────────────────────────────
// business_locations — structured address + PostGIS point
// Province/district stored both original and normalized
// ─────────────────────────────────────────────
export const businessLocations = pgTable('business_locations', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  country: text('country').notNull().default('TR'),
  province: text('province'),
  provinceNormalized: text('province_normalized'),
  district: text('district'),
  districtNormalized: text('district_normalized'),
  neighborhood: text('neighborhood'),
  street: text('street'),
  buildingNumber: text('building_number'),
  postalCode: text('postal_code'),
  formattedAddress: text('formatted_address'),
  latitude: numeric('latitude', { precision: 10, scale: 7 }),
  longitude: numeric('longitude', { precision: 10, scale: 7 }),
  // PostGIS GEOGRAPHY column will be created via raw SQL migration
  sourceId: uuid('source_id').references(() => dataSources.id),
  sourceRecordId: text('source_record_id'),
  confidence: numeric('confidence', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_locations_business').on(table.businessId),
  index('idx_locations_province').on(table.provinceNormalized),
  index('idx_locations_district').on(table.districtNormalized),
]);

export const businessLocationsRelations = relations(businessLocations, ({ one }) => ({
  business: one(businesses, {
    fields: [businessLocations.businessId],
    references: [businesses.id],
  }),
  source: one(dataSources, {
    fields: [businessLocations.sourceId],
    references: [dataSources.id],
  }),
}));

// ─────────────────────────────────────────────
// business_phones — original + E.164 normalized
// Strong deduplication signal (35% weight)
// ─────────────────────────────────────────────
export const businessPhones = pgTable('business_phones', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  originalPhone: text('original_phone').notNull(),
  normalizedPhone: text('normalized_phone'), // E.164: +905321234567
  countryCode: text('country_code').default('90'),
  phoneType: text('phone_type'), // 'landline', 'mobile', 'unknown'
  isPrimary: boolean('is_primary').notNull().default(false),
  sourceId: uuid('source_id').references(() => dataSources.id),
  sourceRecordId: text('source_record_id'),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  confidence: numeric('confidence', { precision: 5, scale: 2 }),
}, (table) => [
  index('idx_phones_business').on(table.businessId),
  index('idx_phones_normalized').on(table.normalizedPhone),
]);

export const businessPhonesRelations = relations(businessPhones, ({ one }) => ({
  business: one(businesses, {
    fields: [businessPhones.businessId],
    references: [businesses.id],
  }),
  source: one(dataSources, {
    fields: [businessPhones.sourceId],
    references: [dataSources.id],
  }),
}));

// ─────────────────────────────────────────────
// business_emails — separated business vs personal
// ─────────────────────────────────────────────
export const businessEmails = pgTable('business_emails', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  normalizedEmail: text('normalized_email').notNull(), // lowercase, trimmed
  emailType: text('email_type').default('unknown'), // 'public_business', 'role_based', 'personal', 'unknown'
  isPrimary: boolean('is_primary').notNull().default(false),
  sourceId: uuid('source_id').references(() => dataSources.id),
  sourceRecordId: text('source_record_id'),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  confidence: numeric('confidence', { precision: 5, scale: 2 }),
}, (table) => [
  index('idx_emails_business').on(table.businessId),
  index('idx_emails_normalized').on(table.normalizedEmail),
]);

export const businessEmailsRelations = relations(businessEmails, ({ one }) => ({
  business: one(businesses, {
    fields: [businessEmails.businessId],
    references: [businesses.id],
  }),
  source: one(dataSources, {
    fields: [businessEmails.sourceId],
    references: [dataSources.id],
  }),
}));

// ─────────────────────────────────────────────
// business_websites — URL + domain + enrichment fields
// ─────────────────────────────────────────────
export const businessWebsites = pgTable('business_websites', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  originalUrl: text('original_url').notNull(),
  canonicalUrl: text('canonical_url'),
  domain: text('domain'), // normalized: example.com
  isPrimary: boolean('is_primary').notNull().default(false),
  httpStatus: text('http_status'),
  httpsAvailable: boolean('https_available'),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  sourceId: uuid('source_id').references(() => dataSources.id),
  confidence: numeric('confidence', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_websites_business').on(table.businessId),
  index('idx_websites_domain').on(table.domain),
]);

export const businessWebsitesRelations = relations(businessWebsites, ({ one }) => ({
  business: one(businesses, {
    fields: [businessWebsites.businessId],
    references: [businesses.id],
  }),
  source: one(dataSources, {
    fields: [businessWebsites.sourceId],
    references: [dataSources.id],
  }),
}));

// ─────────────────────────────────────────────
// business_socials — platform links
// ─────────────────────────────────────────────
export const businessSocials = pgTable('business_socials', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  platform: text('platform').notNull(), // 'instagram', 'facebook', 'linkedin', 'youtube', 'tiktok', 'x'
  url: text('url').notNull(),
  normalizedHandle: text('normalized_handle'),
  isPrimary: boolean('is_primary').notNull().default(true),
  sourceId: uuid('source_id').references(() => dataSources.id),
  lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
  confidence: numeric('confidence', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_socials_business').on(table.businessId),
  index('idx_socials_platform').on(table.platform),
]);

export const businessSocialsRelations = relations(businessSocials, ({ one }) => ({
  business: one(businesses, {
    fields: [businessSocials.businessId],
    references: [businesses.id],
  }),
  source: one(dataSources, {
    fields: [businessSocials.sourceId],
    references: [dataSources.id],
  }),
}));
