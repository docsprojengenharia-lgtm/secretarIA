import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { contacts } from './contacts';
import { services } from './services';
import { professionals } from './professionals';

export const waitlist = pgTable('waitlist', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  professionalId: uuid('professional_id').references(() => professionals.id, { onDelete: 'cascade' }), // opcional
  preferredDays: jsonb('preferred_days'), // [1,2,3]
  preferredTimeStart: varchar('preferred_time_start', { length: 5 }), // "14:00"
  preferredTimeEnd: varchar('preferred_time_end', { length: 5 }), // "18:00"
  status: varchar('status', { length: 20 }).notNull().default('waiting'), // waiting, notified, converted, expired
  notifiedAt: timestamp('notified_at'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  clinicServiceStatusIdx: index('wl_clinic_service_status_idx').on(table.clinicId, table.serviceId, table.status),
  contactIdIdx: index('wl_contact_id_idx').on(table.contactId),
  professionalIdIdx: index('wl_professional_id_idx').on(table.professionalId),
}));

export type WaitlistEntry = typeof waitlist.$inferSelect;
export type NewWaitlistEntry = typeof waitlist.$inferInsert;
