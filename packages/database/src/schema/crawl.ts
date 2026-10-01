import { pgTable, uuid, text, integer, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { businesses } from './businesses.js';

// ─────────────────────────────────────────────
// crawl_jobs — website crawl job tracking
// Every job is idempotent and retryable
// ─────────────────────────────────────────────
export const crawlJobs = pgTable('crawl_jobs', {
  id: uuid('id').primaryKey().defaultRandom(),
  businessId: uuid('business_id').notNull().references(() => businesses.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  jobType: text('job_type').notNull().default('homepage'), // 'homepage', 'contact', 'about', 'full'
  status: text('status').notNull().default('pending'), // 'pending', 'running', 'completed', 'failed', 'cancelled'
  attemptCount: integer('attempt_count').notNull().default(0),
  maxAttempts: integer('max_attempts').notNull().default(3),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }).notNull().defaultNow(),
  startedAt: timestamp('started_at', { withTimezone: true }),
  finishedAt: timestamp('finished_at', { withTimezone: true }),
  errorCode: text('error_code'),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_crawl_jobs_business').on(table.businessId),
  index('idx_crawl_jobs_status').on(table.status),
  index('idx_crawl_jobs_scheduled').on(table.scheduledAt),
]);

// ─────────────────────────────────────────────
// crawl_results — extracted data from a crawl
// ─────────────────────────────────────────────
export const crawlResults = pgTable('crawl_results', {
  id: uuid('id').primaryKey().defaultRandom(),
  crawlJobId: uuid('crawl_job_id').notNull().references(() => crawlJobs.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  httpStatus: text('http_status'),
  contentType: text('content_type'),
  contentHash: text('content_hash'),
  responseSize: integer('response_size'),
  storagePath: text('storage_path'), // R2/S3 path for raw HTML if stored
  extractedFields: jsonb('extracted_fields'), // flexible JSONB for extracted data
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_crawl_results_job').on(table.crawlJobId),
]);

export const crawlJobsRelations = relations(crawlJobs, ({ one, many }) => ({
  business: one(businesses, {
    fields: [crawlJobs.businessId],
    references: [businesses.id],
  }),
  results: many(crawlResults),
}));

export const crawlResultsRelations = relations(crawlResults, ({ one }) => ({
  crawlJob: one(crawlJobs, {
    fields: [crawlResults.crawlJobId],
    references: [crawlJobs.id],
  }),
}));
