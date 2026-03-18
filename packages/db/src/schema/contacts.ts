import { pgTable, uuid, varchar, text, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }),
  phone: varchar('phone', { length: 20 }).notNull(), // formato: 5511999999999
  email: varchar('email', { length: 255 }),
  status: varchar('status', { length: 20 }).notNull().default('new'), // new, active, inactive
  notes: text('notes'), // notas automaticas da IA
  lastContactAt: timestamp('last_contact_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  clinicPhoneUnique: uniqueIndex('contacts_clinic_phone_unique').on(table.clinicId, table.phone),
  statusIdx: index('contacts_status_idx').on(table.clinicId, table.status),
}));

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
