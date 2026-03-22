import { pgTable, uuid, varchar, boolean, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';

export const channels = pgTable('channels', {
  id: uuid('id').defaultRandom().primaryKey(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  type: varchar('type', { length: 30 }).notNull(), // 'whatsapp', 'instagram', 'telegram'
  name: varchar('name', { length: 100 }).notNull(), // Display name
  config: jsonb('config').notNull().default({}), // Channel-specific config (instance name, access token, etc.)
  enabled: boolean('enabled').notNull().default(false),
  status: varchar('status', { length: 20 }).notNull().default('disconnected'), // 'connected', 'disconnected', 'error'
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  channelClinicTypeIdx: index('ch_clinic_type_idx').on(table.clinicId, table.type),
}));

export type Channel = typeof channels.$inferSelect;
export type NewChannel = typeof channels.$inferInsert;
