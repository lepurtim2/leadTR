import { pgTable, uuid, text, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { businesses } from './businesses.js';
import { dataSources } from './sources.js';

// ─────────────────────────────────────────────
// business_category_sources — maps source categories
// to internal taxonomy per DATA_PIPELINE.md §6
// Never overwrites the original source category
// ─────────────────────────────────────────────
export const businessCategorySources = pgTable('business_category_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  sourceId: uuid('source_id').notNull().references(() => dataSources.id),
  sourceCategory: text('source_category').notNull(), // original category string from source
  mappedCategoryId: uuid('mapped_category_id'), // FK to business_categories (nullable until mapped)
  mappingConfidence: numeric('mapping_confidence', { precision: 5, scale: 2 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_cat_sources_business').on(table.businessId),
  index('idx_cat_sources_source').on(table.sourceId),
]);

export const businessCategorySourcesRelations = relations(businessCategorySources, ({ one }) => ({
  business: one(businesses, {
    fields: [businessCategorySources.businessId],
    references: [businesses.id],
  }),
  source: one(dataSources, {
    fields: [businessCategorySources.sourceId],
    references: [dataSources.id],
  }),
}));

// ─────────────────────────────────────────────
// field_provenance — tracks which source provided
// each field value per DATA_PIPELINE.md §8
// ─────────────────────────────────────────────
export const fieldProvenance = pgTable('field_provenance', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  fieldName: text('field_name').notNull(), // 'phone', 'website', 'address', etc.
  fieldValueHash: text('field_value_hash'), // hash of the actual value for comparison
  sourceId: uuid('source_id').notNull().references(() => dataSources.id),
  sourceRecordId: text('source_record_id'),
  observedAt: timestamp('observed_at', { withTimezone: true }).notNull().defaultNow(),
  confidence: numeric('confidence', { precision: 5, scale: 2 }),
}, (table) => [
  index('idx_provenance_business').on(table.businessId),
  index('idx_provenance_field').on(table.businessId, table.fieldName),
]);

// ─────────────────────────────────────────────
// data_quality_scores — per-business quality metrics
// Versioned so score formula changes are traceable
// ─────────────────────────────────────────────
export const dataQualityScores = pgTable('data_quality_scores', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  completenessScore: numeric('completeness_score', { precision: 5, scale: 2 }),
  freshnessScore: numeric('freshness_score', { precision: 5, scale: 2 }),
  sourceAgreementScore: numeric('source_agreement_score', { precision: 5, scale: 2 }),
  identityScore: numeric('identity_score', { precision: 5, scale: 2 }),
  contactScore: numeric('contact_score', { precision: 5, scale: 2 }),
  locationScore: numeric('location_score', { precision: 5, scale: 2 }),
  calculatedAt: timestamp('calculated_at', { withTimezone: true }).notNull().defaultNow(),
  modelVersion: text('model_version').notNull().default('v1'),
}, (table) => [
  index('idx_quality_business').on(table.businessId),
]);

export const dataQualityScoresRelations = relations(dataQualityScores, ({ one }) => ({
  business: one(businesses, {
    fields: [dataQualityScores.businessId],
    references: [businesses.id],
  }),
}));

// ─────────────────────────────────────────────
// business_changes — change detection log
// Supports "Business Change Intelligence" product
// ─────────────────────────────────────────────
export const businessChanges = pgTable('business_changes', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  fieldName: text('field_name').notNull(),
  oldValue: text('old_value'),
  newValue: text('new_value'),
  changeType: text('change_type').notNull(), // 'added', 'updated', 'removed'
  observedAt: timestamp('observed_at', { withTimezone: true }).notNull().defaultNow(),
  sourceId: uuid('source_id').references(() => dataSources.id),
}, (table) => [
  index('idx_changes_business').on(table.businessId),
  index('idx_changes_observed').on(table.observedAt),
  index('idx_changes_type').on(table.changeType),
]);

export const businessChangesRelations = relations(businessChanges, ({ one }) => ({
  business: one(businesses, {
    fields: [businessChanges.businessId],
    references: [businesses.id],
  }),
  source: one(dataSources, {
    fields: [businessChanges.sourceId],
    references: [dataSources.id],
  }),
}));
