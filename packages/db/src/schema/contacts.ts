import { pgTable, uuid, varchar, text, timestamp, date, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';

export const contacts = pgTable('contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }),
  phone: varchar('phone', { length: 20 }).notNull(), // formato: 5511999999999
  email: varchar('email', { length: 255 }),
  birthDate: date('birth_date'), // YYYY-MM-DD
  status: varchar('status', { length: 20 }).notNull().default('new'), // new, active, inactive
  notes: text('notes'), // notas automaticas da IA
  lastContactAt: timestamp('last_contact_at'),
  lastReactivatedAt: timestamp('last_reactivated_at'), // controle de reativacao
  lastBirthdayMessageYear: varchar('last_birthday_message_year', { length: 4 }), // ex: "2026"
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  clinicPhoneUnique: uniqueIndex('contacts_clinic_phone_unique').on(table.clinicId, table.phone),
  statusIdx: index('contacts_status_idx').on(table.clinicId, table.status),
  birthDateIdx: index('contacts_birth_date_idx').on(table.birthDate),
}));

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
