import { pgTable, uuid, varchar, text, integer, timestamp, index } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { contacts } from './contacts';
import { professionals } from './professionals';
import { services } from './services';

export const appointments = pgTable('appointments', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').notNull().references(() => contacts.id),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id),
  serviceId: uuid('service_id').notNull().references(() => services.id),
  startAt: timestamp('start_at').notNull(),
  endAt: timestamp('end_at').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('confirmed'), // confirmed, completed, cancelled, no_show
  cancelledAt: timestamp('cancelled_at'),
  cancelReason: varchar('cancel_reason', { length: 255 }),
  source: varchar('source', { length: 20 }).notNull().default('ai'), // ai, dashboard, manual
  // NPS (Net Promoter Score) post-attendance
  npsScore: integer('nps_score'), // 1-5
  npsFeedback: text('nps_feedback'),
  npsSentAt: timestamp('nps_sent_at'),
  npsRespondedAt: timestamp('nps_responded_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  clinicDateStatusIdx: index('appt_clinic_date_status_idx').on(table.clinicId, table.startAt, table.status),
  clinicProfDateIdx: index('appt_clinic_prof_date_idx').on(table.clinicId, table.professionalId, table.startAt),
  clinicContactIdx: index('appt_clinic_contact_idx').on(table.clinicId, table.contactId),
}));

export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
