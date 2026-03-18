import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';

export const clinics = pgTable('clinics', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  segment: varchar('segment', { length: 50 }).notNull(), // clinica, salao, barbearia, academia, petshop, outro
  phone: varchar('phone', { length: 20 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 2 }),
  plan: varchar('plan', { length: 20 }).notNull().default('trial'), // trial, essential, professional, business
  trialEndsAt: timestamp('trial_ends_at'),
  evolutionInstanceName: varchar('evolution_instance_name', { length: 255 }),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  segmentIdx: index('clinics_segment_idx').on(table.segment),
  isActiveIdx: index('clinics_is_active_idx').on(table.isActive),
}));

export type Clinic = typeof clinics.$inferSelect;
export type NewClinic = typeof clinics.$inferInsert;
