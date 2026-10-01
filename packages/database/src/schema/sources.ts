import { pgTable, uuid, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─────────────────────────────────────────────
// data_sources — source registry
// Every source must be registered before ingestion
// Tracks licensing and permission metadata
// ─────────────────────────────────────────────
export const dataSources = pgTable('data_sources', {
  id: uuid('id').primaryKey().defaultRandom(),
  provider: text('provider').notNull(),
  name: text('name').notNull(),
  sourceType: text('source_type').notNull(), // 'open', 'licensed', 'api', 'crawl'
  license: text('license'),
  termsUrl: text('terms_url'),
  storageAllowed: boolean('storage_allowed').notNull().default(false),
  commercialUseAllowed: boolean('commercial_use_allowed').notNull().default(false),
  redistributionAllowed: boolean('redistribution_allowed').notNull().default(false),
  attributionRequired: boolean('attribution_required').notNull().default(true),
  refreshFrequency: text('refresh_frequency'), // 'daily', 'weekly', 'monthly', 'manual'
  collectionMethod: text('collection_method'), // 'download', 'api', 'crawl', 'manual'
  active: boolean('active').notNull().default(true),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_sources_provider').on(table.provider),
  index('idx_sources_active').on(table.active),
]);

// ─────────────────────────────────────────────
// source_records — raw record provenance
// Links a raw data artifact to its source
// ─────────────────────────────────────────────
export const sourceRecords = pgTable('source_records', {
  id: uuid('id').primaryKey().defaultRandom(),
  sourceId: uuid('source_id').notNull().references(() => dataSources.id),
  sourceRecordId: text('source_record_id').notNull(),
  rawPayloadHash: text('raw_payload_hash'),
  rawStoragePath: text('raw_storage_path'),
  sourceVersion: text('source_version'),
  collectedAt: timestamp('collected_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_source_records_source').on(table.sourceId),
  index('idx_source_records_external').on(table.sourceId, table.sourceRecordId),
]);

export const dataSourcesRelations = relations(dataSources, ({ many }) => ({
  sourceRecords: many(sourceRecords),
}));

export const sourceRecordsRelations = relations(sourceRecords, ({ one }) => ({
  source: one(dataSources, {
    fields: [sourceRecords.sourceId],
    references: [dataSources.id],
  }),
}));
