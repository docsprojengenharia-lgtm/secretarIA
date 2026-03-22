import { pgTable, uuid, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';

export const messageTemplates = pgTable('message_templates', {
  id: uuid('id').defaultRandom().primaryKey(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  eventType: varchar('event_type', { length: 50 }).notNull(), // 'reminder_d1', 'reminder_day', 'nps', 'welcome', 'cancellation', 'booking_confirmation'
  content: text('content').notNull(),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  clinicEventIdx: index('mt_clinic_event_idx').on(table.clinicId, table.eventType),
}));

export type MessageTemplate = typeof messageTemplates.$inferSelect;
export type NewMessageTemplate = typeof messageTemplates.$inferInsert;
