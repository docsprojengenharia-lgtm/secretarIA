import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { contacts } from './contacts';
import { professionals } from './professionals';
import { services } from './services';

export const bookingRequests = pgTable('booking_requests', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  professionalId: uuid('professional_id').references(() => professionals.id, { onDelete: 'cascade' }),
  requestedStartAt: timestamp('requested_start_at').notNull(),
  status: varchar('status', { length: 20 }).notNull().default('pending'), // pending, approved, rejected, expired
  ownerNote: text('owner_note'), // motivo da rejeicao ou sugestao alternativa
  suggestedStartAt: timestamp('suggested_start_at'), // horario alternativo sugerido pelo dono
  appointmentId: uuid('appointment_id'), // preenchido quando aprovado e appointment criado
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  clinicStatusIdx: index('br_clinic_status_idx').on(table.clinicId, table.status),
  clinicDateIdx: index('br_clinic_date_idx').on(table.clinicId, table.createdAt),
}));

export type BookingRequest = typeof bookingRequests.$inferSelect;
export type NewBookingRequest = typeof bookingRequests.$inferInsert;
