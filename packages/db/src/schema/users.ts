import { pgTable, uuid, varchar, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { clinics } from './clinics';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clinicId: uuid('clinic_id').notNull().references(() => clinics.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  phone: varchar('phone', { length: 20 }),
  role: varchar('role', { length: 20 }).notNull().default('secretary'), // owner, admin, secretary
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => ({
  clinicIdIdx: index('users_clinic_id_idx').on(table.clinicId),
  roleIdx: index('users_role_idx').on(table.role),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
