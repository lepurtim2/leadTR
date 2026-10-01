import { pgTable, uuid, text, integer, numeric, timestamp, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { businessCategories } from './categories.js';
import {
  businessNames,
  businessLocations,
  businessPhones,
  businessEmails,
  businessWebsites,
  businessSocials,
} from './business-details.js';
import {
  businessCategorySources,
  dataQualityScores,
  businessChanges,
} from './provenance.js';

// ─────────────────────────────────────────────
// businesses — canonical business entity
// ─────────────────────────────────────────────
export const businesses = pgTable('businesses', {
  id: uuid('id').primaryKey().defaultRandom(),
  canonicalName: text('canonical_name').notNull(),
  automatedDescription: text('automated_description'),
  businessStatus: text('business_status').notNull().default('unknown'),
  categoryId: uuid('category_id').references(() => businessCategories.id),
  sourceCount: integer('source_count').notNull().default(0),
  identityConfidence: numeric('identity_confidence', { precision: 5, scale: 2 }),
  completenessScore: numeric('completeness_score', { precision: 5, scale: 2 }),
  freshnessScore: numeric('freshness_score', { precision: 5, scale: 2 }),
  digitalPresenceScore: numeric('digital_presence_score', { precision: 5, scale: 2 }),
  leadScore: numeric('lead_score', { precision: 5, scale: 2 }),
  firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
  lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
  lastVerifiedAt: timestamp('last_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_businesses_category').on(table.categoryId),
  index('idx_businesses_status').on(table.businessStatus),
  index('idx_businesses_updated').on(table.updatedAt),
  index('idx_businesses_lead_score').on(table.leadScore),
]);

export const businessesRelations = relations(businesses, ({ one, many }) => ({
  category: one(businessCategories, {
    fields: [businesses.categoryId],
    references: [businessCategories.id],
  }),
  names: many(businessNames),
  locations: many(businessLocations),
  phones: many(businessPhones),
  emails: many(businessEmails),
  websites: many(businessWebsites),
  socials: many(businessSocials),
  sources: many(businessCategorySources),
  changes: many(businessChanges),
  qualityScores: many(dataQualityScores),
}));
