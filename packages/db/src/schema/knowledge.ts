import { pgTable, uuid, varchar, text, integer, timestamp, index, customType } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';

// pgvector custom type for drizzle-orm 0.35.x
const vector1536 = customType<{ data: number[]; driverParam: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]) {
    return `[${value.join(',')}]`;
  },
  fromDriver(value: string) {
    return (value as string).slice(1, -1).split(',').map(Number);
  },
});

export const knowledgeDocuments = pgTable('knowledge_documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  fileName: varchar('file_name', { length: 255 }).notNull(),
  fileSize: integer('file_size').notNull(), // bytes
  pageCount: integer('page_count'),
  chunkCount: integer('chunk_count').default(0),
  status: varchar('status', { length: 20 }).notNull().default('processing'), // processing, ready, error
  errorMessage: text('error_message'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  clinicIdIdx: index('kd_clinic_id_idx').on(table.clinicId),
}));

export const knowledgeChunks = pgTable('knowledge_chunks', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  documentId: uuid('document_id').notNull().references(() => knowledgeDocuments.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  chunkIndex: integer('chunk_index').notNull(),
  embedding: text('embedding'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => ({
  clinicIdIdx: index('kc_clinic_id_idx').on(table.clinicId),
  documentIdIdx: index('kc_document_id_idx').on(table.documentId),
}));

export type KnowledgeDocument = typeof knowledgeDocuments.$inferSelect;
export type NewKnowledgeDocument = typeof knowledgeDocuments.$inferInsert;
export type KnowledgeChunk = typeof knowledgeChunks.$inferSelect;
export type NewKnowledgeChunk = typeof knowledgeChunks.$inferInsert;
