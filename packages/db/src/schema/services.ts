import { pgTable, uuid, varchar, text, integer, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';

export const services = pgTable('services', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 100 }),
  durationMinutes: integer('duration_minutes').notNull(),
  priceInCents: integer('price_in_cents').notNull(), // R$ 45,00 = 4500
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  clinicIdIdx: index('services_clinic_id_idx').on(table.clinicId),
  categoryIdx: index('services_category_idx').on(table.category),
}));

export type Service = typeof services.$inferSelect;
export type NewService = typeof services.$inferInsert;
