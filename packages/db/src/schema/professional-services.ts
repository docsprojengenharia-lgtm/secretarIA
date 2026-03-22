import { pgTable, uuid, timestamp, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { professionals } from './professionals';
import { services } from './services';

export const professionalServices = pgTable('professional_services', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id, { onDelete: 'cascade' }),
  serviceId: uuid('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  clinicIdIdx: index('ps_clinic_id_idx').on(table.clinicId),
  serviceIdIdx: index('ps_service_id_idx').on(table.serviceId),
  uniqueProfService: uniqueIndex('ps_prof_service_unique').on(table.professionalId, table.serviceId),
}));

export type ProfessionalService = typeof professionalServices.$inferSelect;
export type NewProfessionalService = typeof professionalServices.$inferInsert;
