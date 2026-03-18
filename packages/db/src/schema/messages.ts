import { pgTable, uuid, varchar, text, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';
import { conversations } from './conversations';

export const messages = pgTable('messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  conversationId: uuid('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 20 }).notNull(), // user, assistant, system
  content: text('content').notNull(),
  audioUrl: text('audio_url'),
  intent: varchar('intent', { length: 30 }), // AGENDAR, CANCELAR, DUVIDA, etc.
  metadata: jsonb('metadata').default({}), // tokens used, model, etc.
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  convDateIdx: index('msg_conv_date_idx').on(table.conversationId, table.createdAt),
  clinicIdIdx: index('msg_clinic_id_idx').on(table.clinicId),
}));

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
