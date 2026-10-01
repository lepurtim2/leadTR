import { pgTable, uuid, text, integer, boolean, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─────────────────────────────────────────────
// business_categories — internal stable taxonomy
// Independent of any single source's classification
// ─────────────────────────────────────────────
export const businessCategories = pgTable('business_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  parentId: uuid('parent_id'),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  level: integer('level').notNull().default(0),
  active: boolean('active').notNull().default(true),
}, (table) => [
  index('idx_categories_parent').on(table.parentId),
  index('idx_categories_slug').on(table.slug),
]);

export const businessCategoriesRelations = relations(businessCategories, ({ one, many }) => ({
  parent: one(businessCategories, {
    fields: [businessCategories.parentId],
    references: [businessCategories.id],
    relationName: 'categoryParent',
  }),
  children: many(businessCategories, { relationName: 'categoryParent' }),
}));
