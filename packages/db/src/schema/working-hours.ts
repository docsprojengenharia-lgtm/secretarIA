import { pgTable, uuid, varchar, integer, index } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { professionals } from './professionals';

export const workingHours = pgTable('working_hours', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  professionalId: uuid('professional_id').notNull().references(() => professionals.id, { onDelete: 'cascade' }),
  dayOfWeek: integer('day_of_week').notNull(), // 0=domingo, 6=sabado
  startTime: varchar('start_time', { length: 5 }).notNull(), // "09:00"
  endTime: varchar('end_time', { length: 5 }).notNull(), // "18:00"
}, (table) => ({
  clinicProfDayIdx: index('wh_clinic_prof_day_idx').on(table.clinicId, table.professionalId, table.dayOfWeek),
}));

export type WorkingHour = typeof workingHours.$inferSelect;
export type NewWorkingHour = typeof workingHours.$inferInsert;
