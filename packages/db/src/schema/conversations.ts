import { pgTable, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { contacts } from './contacts';

export const conversations = pgTable('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  contactId: uuid('contact_id').notNull().references(() => contacts.id, { onDelete: 'cascade' }),
  status: varchar('status', { length: 20 }).notNull().default('active'), // active, pending_human, closed
  channel: varchar('channel', { length: 20 }).notNull().default('whatsapp'),
  startedAt: timestamp('started_at').notNull().defaultNow(),
  endedAt: timestamp('ended_at'),
  metadata: jsonb('metadata').default({}), // intent summary, handoff reason
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  clinicContactStatusIdx: index('conv_clinic_contact_status_idx').on(table.clinicId, table.contactId, table.status),
  clinicStatusDateIdx: index('conv_clinic_status_date_idx').on(table.clinicId, table.status, table.createdAt),
}));

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
