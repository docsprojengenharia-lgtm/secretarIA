import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { professionals } from './professionals';

export const blockedTimes = pgTable('blocked_times', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  professionalId: uuid('professional_id').references(() => professionals.id, { onDelete: 'cascade' }), // null = bloqueia toda empresa
  startAt: timestamp('start_at').notNull(),
  endAt: timestamp('end_at').notNull(),
  reason: varchar('reason', { length: 255 }), // feriado, ferias, almoco, imprevisto, recesso
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  clinicTimeIdx: index('bt_clinic_time_idx').on(table.clinicId, table.startAt, table.endAt),
  clinicProfTimeIdx: index('bt_clinic_prof_time_idx').on(table.clinicId, table.professionalId, table.startAt, table.endAt),
}));

export type BlockedTime = typeof blockedTimes.$inferSelect;
export type NewBlockedTime = typeof blockedTimes.$inferInsert;
