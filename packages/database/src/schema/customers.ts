import { pgTable, uuid, text, integer, numeric, boolean, timestamp, jsonb, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─────────────────────────────────────────────
// plans — subscription tier definitions
// ─────────────────────────────────────────────
export const plans = pgTable('plans', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(), // 'free', 'starter', 'pro', 'agency', 'business', 'enterprise'
  slug: text('slug').notNull().unique(),
  monthlyCredits: integer('monthly_credits').notNull().default(0),
  maxApiRequestsPerMinute: integer('max_api_requests_per_minute').notNull().default(60),
  maxExportsPerMonth: integer('max_exports_per_month').notNull().default(0),
  priceMonthly: numeric('price_monthly', { precision: 10, scale: 2 }),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// users — individual user accounts
// ─────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  externalAuthId: text('external_auth_id').unique(), // Supabase Auth UID
  email: text('email').notNull().unique(),
  fullName: text('full_name'),
  role: text('role').notNull().default('member'), // 'admin', 'member'
  active: boolean('active').notNull().default(true),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_users_email').on(table.email),
  index('idx_users_external_auth').on(table.externalAuthId),
]);

// ─────────────────────────────────────────────
// organizations — B2B multi-tenant container
// ─────────────────────────────────────────────
export const organizations = pgTable('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  planId: uuid('plan_id').references(() => plans.id),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_orgs_slug').on(table.slug),
]);

// ─────────────────────────────────────────────
// memberships — user ↔ organization
// ─────────────────────────────────────────────
export const memberships = pgTable('memberships', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'), // 'owner', 'admin', 'member'
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_memberships_unique').on(table.userId, table.organizationId),
]);

// ─────────────────────────────────────────────
// credits — organization credit balance
// ─────────────────────────────────────────────
export const credits = pgTable('credits', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  balance: integer('balance').notNull().default(0),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('idx_credits_org').on(table.organizationId),
]);

// ─────────────────────────────────────────────
// credit_transactions — audit trail for credit changes
// ─────────────────────────────────────────────
export const creditTransactions = pgTable('credit_transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  amount: integer('amount').notNull(), // positive = add, negative = consume
  balanceAfter: integer('balance_after').notNull(),
  transactionType: text('transaction_type').notNull(), // 'purchase', 'subscription', 'export', 'api_usage', 'refund', 'adjustment'
  referenceId: text('reference_id'), // export_id, payment_id, etc.
  description: text('description'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_credit_tx_org').on(table.organizationId),
  index('idx_credit_tx_created').on(table.createdAt),
]);

// ─────────────────────────────────────────────
// api_keys — hashed storage, shown once at creation
// ─────────────────────────────────────────────
export const apiKeys = pgTable('api_keys', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  keyPrefix: text('key_prefix').notNull(), // first 8 chars for identification
  keyHash: text('key_hash').notNull(), // SHA-256 hash of the full key
  lastUsedAt: timestamp('last_used_at', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_api_keys_org').on(table.organizationId),
  index('idx_api_keys_hash').on(table.keyHash),
]);

// ─────────────────────────────────────────────
// exports — async export job tracking
// ─────────────────────────────────────────────
export const exports = pgTable('exports', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  filters: jsonb('filters').notNull(), // saved query/filter definition
  columns: jsonb('columns'), // selected columns for export
  format: text('format').notNull().default('csv'), // 'csv', 'xlsx', 'jsonl', 'parquet'
  recordCount: integer('record_count'),
  creditsCost: integer('credits_cost'),
  status: text('status').notNull().default('queued'), // 'queued', 'processing', 'completed', 'failed', 'expired'
  fileUrl: text('file_url'), // signed URL to R2/S3
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
}, (table) => [
  index('idx_exports_org').on(table.organizationId),
  index('idx_exports_status').on(table.status),
]);

// ─────────────────────────────────────────────
// saved_searches — persistent filter combinations
// ─────────────────────────────────────────────
export const savedSearches = pgTable('saved_searches', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull().references(() => organizations.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id),
  name: text('name').notNull(),
  filters: jsonb('filters').notNull(),
  notifyOnNew: boolean('notify_on_new').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_saved_searches_org').on(table.organizationId),
]);

// ─────────────────────────────────────────────
// suppression_requests — KVKK/privacy deletion requests
// ─────────────────────────────────────────────
export const suppressionRequests = pgTable('suppression_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  entityType: text('entity_type').notNull(), // 'phone', 'email', 'business'
  entityValueHash: text('entity_value_hash').notNull(), // hashed for privacy
  reason: text('reason'),
  requestedBy: text('requested_by'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
}, (table) => [
  index('idx_suppression_hash').on(table.entityValueHash),
]);

// ─────────────────────────────────────────────
// audit_logs — system-wide audit trail
// ─────────────────────────────────────────────
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').references(() => users.id),
  organizationId: uuid('organization_id').references(() => organizations.id),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  metadata: jsonb('metadata'),
  ipAddress: text('ip_address'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_audit_created').on(table.createdAt),
  index('idx_audit_action').on(table.action),
  index('idx_audit_org').on(table.organizationId),
]);

// ── Relations ──────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(memberships),
}));

export const organizationsRelations = relations(organizations, ({ one, many }) => ({
  plan: one(plans, { fields: [organizations.planId], references: [plans.id] }),
  memberships: many(memberships),
  creditBalance: one(credits, { fields: [organizations.id], references: [credits.organizationId] }),
  creditTransactions: many(creditTransactions),
  apiKeys: many(apiKeys),
  exports: many(exports),
  savedSearches: many(savedSearches),
}));

export const membershipsRelations = relations(memberships, ({ one }) => ({
  user: one(users, { fields: [memberships.userId], references: [users.id] }),
  organization: one(organizations, { fields: [memberships.organizationId], references: [organizations.id] }),
}));
